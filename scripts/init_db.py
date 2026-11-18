"""Crea la base de datos local de incentivos.

1. Crea la base (DB_NAME del .env) si no existe.
2. Importa los dumps .sql de la carpeta indicada (omitible con --sin-dumps).
3. Agrega índices por fecha_venta y crea la vista v_ventas.
4. Crea las tablas de configuración y usuarios, y siembra sus valores iniciales.
   Si no hay usuarios crea un administrador (ADMIN_USUARIO / ADMIN_PASSWORD, o una contraseña aleatoria).

Uso:
    python -m scripts.init_db                        # usa ../db_incentivos
    python -m scripts.init_db --dumps C:/ruta/dumps
    python -m scripts.init_db --sin-dumps            # solo pasos 3 y 4
"""

import argparse
import os
import re
import secrets
import shutil
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.roles import Rol
from app.core.security import hashear_password
from app.models import (
    Base,
    MetaCeroFaltanteSucursal,
    MetaDispensador,
    Parametro,
    ReglaClasificacion,
    ReglaComision,
    Usuario,
)

RAIZ = Path(__file__).resolve().parents[1]
DUMPS_DEFAULT = RAIZ.parent / "db_incentivos"
MYSQL_WINDOWS = Path(r"C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe")

TABLAS_CONFIG = [
    Base.metadata.tables[modelo.__tablename__]
    for modelo in (MetaCeroFaltanteSucursal, MetaDispensador, Parametro, ReglaClasificacion, ReglaComision, Usuario)
]

# Equivalente a la columna calculada Categoria_Doctores del .pbix (sección 4.1 del documento).
REGLAS_DOCTOR = [
    ("categoria", "CERO FALTANTE", "CERO FALTANTE"),
    ("categoria", "INCENTIVO US", "ULTRASONIDO"),
    ("categoria", "INCENTIVOS SUEROS IV", "APLICACION SUERO INTRAVENOSO"),
    ("categoria", "INCENTIVO_DR_EKG", "ELECTROCARDIOGRAMA"),
    ("categoria", "INCENTIVO RAYOS X", "RAYOS X"),
    ("clave_articulo", "SERVGINE1", "GINECOLOGIA"),
    ("categoria", "LAB.", "LABORATORIOS"),
    ("categoria", "LABS.", "LABORATORIOS"),
    ("categoria", "LABE", "LABORATORIOS"),
    ("categoria", "LABORATORIO", "LABORATORIOS"),
    ("categoria", "MICROTEC", "LABORATORIOS"),
    ("categoria", "PROCESOS", "LABORATORIOS"),
    ("categoria", "SSA", "LABORATORIOS"),
    ("categoria", "INCENTIVO_ DR_COVID", "LABORATORIOS"),
]

# Categoria_Incentivo usada por las tablas calculadas Ventas 18SKUs / 5SKUs / SOLURAL.
REGLAS_INCENTIVO = [
    ("categoria", "18SKU", "18 SKUs"),
    ("categoria", "5SKU", "5 SKUs"),
    ("categoria", "SOLURAL", "SOLURAL"),
]

# Medida "comision" del .pbix, con el tipo explícito en vez de la heurística "< 1".
REGLAS_COMISION = [
    ("CERO FALTANTE", "PORCENTAJE", "0.025", "70000.01", "110000"),
    ("CERO FALTANTE", "PORCENTAJE", "0.035", "110000", None),
    ("LABORATORIOS", "PORCENTAJE", "0.05", "20000", "40000"),
    ("LABORATORIOS", "PORCENTAJE", "0.10", "40000", None),
    ("ULTRASONIDO", "MONTO_POR_UNIDAD", "50", "0", None),
    ("RAYOS X", "PORCENTAJE", "0.05", "0", None),
    ("APLICACION SUERO INTRAVENOSO", "MONTO_POR_UNIDAD", "80", "0", None),
    ("GINECOLOGIA", "PORCENTAJE", "0.001", "0", None),
    ("ELECTROCARDIOGRAMA", "MONTO_POR_UNIDAD", "50", "0", None),
]

# Medidas DAX con metas fijas (Meta 18SKUs, Meta Solural, Meta 5SKUs).
METAS_DISPENSADOR = {"18_SKUS": "5000", "SOLURAL": "1000", "5_SKUS": "30000"}

PARAMETROS = [
    ("bono_venta_global", "2000", "Bono por sucursal cuando la proyección alcanza la meta global"),
]

COLUMNAS_VISTA = (
    "fecha_consulta, id_dispensador, dispensador, id_venta, fecha_venta, id_articulo, "
    "clave_articulo, articulo, cantidad, categoria, subtotal, importeSin, tic_id, cli_id, cli_nombre"
)


def buscar_mysql() -> str:
    ruta = os.environ.get("MYSQL_BIN") or shutil.which("mysql")
    if ruta:
        return ruta
    if MYSQL_WINDOWS.exists():
        return str(MYSQL_WINDOWS)
    sys.exit("No se encontró el cliente mysql. Defina MYSQL_BIN con la ruta a mysql(.exe).")


def importar_dumps(carpeta: Path) -> None:
    settings = get_settings()
    mysql = buscar_mysql()
    archivos = sorted(carpeta.glob("*.sql"))
    if not archivos:
        sys.exit(f"No hay archivos .sql en {carpeta}")

    entorno = {**os.environ, "MYSQL_PWD": settings.db_password}
    comando = [
        mysql,
        f"-h{settings.db_host}",
        f"-P{settings.db_port}",
        f"-u{settings.db_user}",
        "--default-character-set=utf8mb4",
        "--max_allowed_packet=256M",
        settings.db_name,
    ]
    # Los dumps vienen de un servidor con GTID; esas líneas fallan en un MySQL local.
    gtid = re.compile(rb"SET @@GLOBAL\.GTID_PURGED=[^;]*;")
    log_bin = re.compile(rb"^.*SQL_LOG_BIN.*$", re.M)
    for archivo in archivos:
        print(f"  importando {archivo.name}...")
        sql = log_bin.sub(b"", gtid.sub(b"", archivo.read_bytes()))
        subprocess.run(comando, input=sql, env=entorno, check=True)


def tablas_sucursal(conn) -> list[str]:
    filas = conn.execute(
        text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' "
            "AND table_name LIKE 'dispensadores\\_%' AND table_name <> 'dispensadores_consolidado' "
            "ORDER BY table_name"
        )
    )
    return [f[0] for f in filas]


def crear_indices_y_vista(conn) -> None:
    tablas = tablas_sucursal(conn)
    if not tablas:
        sys.exit("No hay tablas dispensadores_<sucursal>; importe primero los dumps.")

    # Los dumps declaran DEFAULT '0000-00-00 00:00:00'; el modo estricto impide hacer ALTER sobre ellas.
    conn.execute(text("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'"))
    for tabla in tablas:
        existentes = set(
            conn.scalars(
                text(
                    "SELECT DISTINCT index_name FROM information_schema.statistics "
                    "WHERE table_schema = DATABASE() AND table_name = :t"
                ),
                {"t": tabla},
            )
        )
        if "idx_fecha_venta" in existentes:  # índice de una versión anterior del script
            conn.execute(text(f"DROP INDEX idx_fecha_venta ON `{tabla}`"))
        for columna in ("fecha_venta", "fecha_consulta"):
            indice = f"idx_status_{columna}"
            if indice not in existentes:
                print(f"  índice {indice} en {tabla}")
                conn.execute(text(f"CREATE INDEX {indice} ON `{tabla}` (status, {columna})"))

    selects = [
        f"SELECT UPPER(CONVERT(sucursal USING utf8mb4)) AS sucursal, {COLUMNAS_VISTA} "
        f"FROM `{tabla}` WHERE status = 1"
        for tabla in tablas
    ]
    conn.execute(text("CREATE OR REPLACE VIEW v_ventas AS\n" + "\nUNION ALL\n".join(selects)))
    print(f"  vista v_ventas sobre {len(tablas)} tablas: {', '.join(tablas)}")

    # Un MIN/MAX por tabla se resuelve directo en los índices (status, fecha); consultar v_ventas
    # sin filtro de fecha obligaría a materializar todas las ventas. Cada tabla es de una sola
    # sucursal, igual a su sufijo.
    resumenes = [
        f"SELECT CONVERT('{tabla.removeprefix('dispensadores_').upper()}' USING utf8mb4) AS sucursal, "
        f"(SELECT MIN(fecha_venta) FROM `{tabla}` WHERE status = 1) AS primera_venta, "
        f"(SELECT MAX(fecha_venta) FROM `{tabla}` WHERE status = 1) AS ultima_venta, "
        f"(SELECT MAX(fecha_consulta) FROM `{tabla}` WHERE status = 1) AS ultima_consulta"
        for tabla in tablas
    ]
    conn.execute(text("CREATE OR REPLACE VIEW v_sincronizacion AS\n" + "\nUNION ALL\n".join(resumenes)))
    print("  vista v_sincronizacion")


def sembrar(db: Session) -> None:
    def vacia(modelo) -> bool:
        return db.scalar(select(func.count()).select_from(modelo)) == 0

    if vacia(ReglaClasificacion):
        reglas = [("DOCTOR", *r) for r in REGLAS_DOCTOR] + [("INCENTIVO", *r) for r in REGLAS_INCENTIVO]
        db.add_all(
            ReglaClasificacion(tipo=t, campo=c, patron=p, resultado=r, prioridad=(i + 1) * 10)
            for i, (t, c, p, r) in enumerate(reglas)
        )
    if vacia(ReglaComision):
        db.add_all(
            ReglaComision(
                categoria_doctor=cat,
                tipo=tipo,
                valor=Decimal(valor),
                venta_minima=Decimal(minima),
                venta_maxima=Decimal(maxima) if maxima else None,
            )
            for cat, tipo, valor, minima, maxima in REGLAS_COMISION
        )
    if vacia(MetaDispensador):
        db.add_all(MetaDispensador(indicador=k, meta=Decimal(v)) for k, v in METAS_DISPENSADOR.items())
    if vacia(Parametro):
        db.add_all(Parametro(clave=k, valor=Decimal(v), descripcion=d) for k, v, d in PARAMETROS)
    if vacia(Usuario):
        usuario = os.environ.get("ADMIN_USUARIO", "admin")
        password = os.environ.get("ADMIN_PASSWORD") or secrets.token_urlsafe(12)
        db.add(
            Usuario(
                usuario=usuario,
                nombre="Administrador",
                password_hash=hashear_password(password),
                rol=Rol.ADMINISTRADOR,
                activo=True,
            )
        )
        print(f"  administrador inicial: usuario '{usuario}', contraseña '{password}' (cámbiela al entrar)")
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dumps", type=Path, default=DUMPS_DEFAULT, help="carpeta con los .sql")
    parser.add_argument("--sin-dumps", action="store_true", help="no importar los .sql")
    args = parser.parse_args()

    settings = get_settings()
    servidor = create_engine(settings.database_url.set(database=None))
    with servidor.begin() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
            )
        )
    print(f"Base de datos '{settings.db_name}' lista.")

    if not args.sin_dumps:
        print(f"Importando dumps desde {args.dumps}")
        importar_dumps(args.dumps)

    engine = create_engine(settings.database_url)
    with engine.begin() as conn:
        crear_indices_y_vista(conn)
    Base.metadata.create_all(engine, tables=TABLAS_CONFIG)
    with Session(engine) as db:
        sembrar(db)
    print("Tablas de configuración creadas y sembradas. Listo.")


if __name__ == "__main__":
    main()
