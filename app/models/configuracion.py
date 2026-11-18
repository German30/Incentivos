"""Tablas propias de la app: metas, reglas y parámetros que antes vivían en el .pbix.

Las crea y siembra scripts/init_db.py.
"""

from decimal import Decimal

from sqlalchemy import Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

TIPOS_CLASIFICACION = ("DOCTOR", "INCENTIVO")
CAMPOS_CLASIFICACION = ("categoria", "clave_articulo")
TIPOS_COMISION = ("PORCENTAJE", "MONTO_POR_UNIDAD")


class MetaCeroFaltanteSucursal(Base):
    """Antes era la tabla estática meta_cero_faltante pegada en Power Query."""

    __tablename__ = "meta_cero_faltante_sucursal"

    sucursal: Mapped[str] = mapped_column(String(3), primary_key=True)
    meta: Mapped[Decimal] = mapped_column(Numeric(20, 2))


class MetaDispensador(Base):
    """Metas individuales por dispensador (antes medidas DAX fijas: Meta 18SKUs, etc.)."""

    __tablename__ = "meta_dispensador"

    indicador: Mapped[str] = mapped_column(String(30), primary_key=True)
    meta: Mapped[Decimal] = mapped_column(Numeric(20, 2))


class ReglaClasificacion(Base):
    """Mapea texto libre de SICAR a categorías de negocio.

    Reemplaza la columna calculada Categoria_Doctores (tipo DOCTOR) y la
    Categoria_Incentivo usada por las tablas Ventas 18SKUs/5SKUs/SOLURAL (tipo INCENTIVO).
    Se evalúan por prioridad ascendente; gana la primera cuyo patrón esté contenido en el campo.
    """

    __tablename__ = "regla_clasificacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(Enum(*TIPOS_CLASIFICACION, name="tipo_clasificacion"))
    campo: Mapped[str] = mapped_column(Enum(*CAMPOS_CLASIFICACION, name="campo_clasificacion"))
    patron: Mapped[str] = mapped_column(String(100))
    resultado: Mapped[str] = mapped_column(String(100))
    prioridad: Mapped[int] = mapped_column(Integer, default=100)


class ReglaComision(Base):
    """Comisión por categoría de doctor y rango de venta.

    El tipo es explícito (hallazgo 6.4): PORCENTAJE se multiplica por la venta,
    MONTO_POR_UNIDAD por la cantidad vendida. Aplica si venta_minima <= venta < venta_maxima.
    """

    __tablename__ = "regla_comision"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    categoria_doctor: Mapped[str] = mapped_column(String(100))
    tipo: Mapped[str] = mapped_column(Enum(*TIPOS_COMISION, name="tipo_comision"))
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    venta_minima: Mapped[Decimal] = mapped_column(Numeric(20, 2), default=Decimal(0))
    venta_maxima: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))


class Parametro(Base):
    __tablename__ = "parametro"

    clave: Mapped[str] = mapped_column(String(50), primary_key=True)
    valor: Mapped[Decimal] = mapped_column(Numeric(20, 4))
    descripcion: Mapped[str | None] = mapped_column(String(255))
