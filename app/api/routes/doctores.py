"""Página "Doctores" del reporte."""

from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, PeriodoDep, SucursalQuery, periodo_out
from app.schemas.reportes import ComisionDoctorOut, ComisionesDoctores, ResumenCategoriaDoctor, ResumenDoctores
from app.services.doctores import CERO, comisiones_doctores

router = APIRouter(prefix="/doctores", tags=["doctores"])

PublicoGeneral = Annotated[bool, Query(description="Incluir ventas a 'Público en General'")]


@router.get("/comisiones", response_model=ComisionesDoctores)
def comisiones(
    db: DbSession,
    periodo: PeriodoDep,
    sucursal: SucursalQuery = None,
    categoria: Annotated[str | None, Query(description="Ej. LABORATORIOS, RAYOS X")] = None,
    incluir_publico_general: PublicoGeneral = True,
):
    """Venta y comisión por doctor y categoría (equivale a doctores_consolidado)."""
    filas = comisiones_doctores(db, periodo, sucursal, categoria, incluir_publico_general)
    return ComisionesDoctores(
        periodo=periodo_out(periodo),
        total_venta=sum((f.venta for f in filas), CERO),
        total_comision=sum((f.monto_comision for f in filas), CERO),
        comisiones=[ComisionDoctorOut(**vars(f)) for f in filas],
    )


@router.get("/resumen", response_model=ResumenDoctores)
def resumen(
    db: DbSession,
    periodo: PeriodoDep,
    sucursal: SucursalQuery = None,
    incluir_publico_general: PublicoGeneral = True,
):
    """Totales por categoría de doctor (gráficos comparativos)."""
    acumulado = defaultdict(lambda: {"doctores": 0, "cantidad": CERO, "venta": CERO, "monto_comision": CERO})
    for fila in comisiones_doctores(db, periodo, sucursal, None, incluir_publico_general):
        a = acumulado[fila.categoria_doctor]
        a["doctores"] += 1
        a["cantidad"] += fila.cantidad
        a["venta"] += fila.venta
        a["monto_comision"] += fila.monto_comision
    return ResumenDoctores(
        periodo=periodo_out(periodo),
        categorias=[
            ResumenCategoriaDoctor(categoria_doctor=cat, **valores)
            for cat, valores in sorted(acumulado.items(), key=lambda kv: -kv[1]["venta"])
        ],
    )
