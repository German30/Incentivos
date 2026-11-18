"""Tablas que vienen de los dumps de la base "incentivos" (replicadas desde SICAR).

No se crean desde la app: las crea scripts/init_db.py al importar los .sql.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Venta(Base):
    """Vista v_ventas: unión de las tablas dispensadores_<sucursal> con status = 1."""

    __tablename__ = "v_ventas"
    __table_args__ = {"info": {"is_view": True}}

    sucursal: Mapped[str] = mapped_column(String(3), primary_key=True)
    id_dispensador: Mapped[int] = mapped_column(Integer, primary_key=True)
    id_venta: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    fecha_venta: Mapped[datetime] = mapped_column(DateTime, primary_key=True)
    id_articulo: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha_consulta: Mapped[datetime | None] = mapped_column(DateTime)
    dispensador: Mapped[str | None] = mapped_column(String(150))
    clave_articulo: Mapped[str | None] = mapped_column(String(45))
    articulo: Mapped[str | None] = mapped_column(String(1000))
    cantidad: Mapped[Decimal | None] = mapped_column(Numeric(20, 4))
    categoria: Mapped[str | None] = mapped_column(String(45))
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    importe_sin: Mapped[Decimal | None] = mapped_column("importeSin", Numeric(20, 2))
    tic_id: Mapped[int | None] = mapped_column(BigInteger)
    cli_id: Mapped[int | None] = mapped_column(Integer)
    cli_nombre: Mapped[str | None] = mapped_column(String(1000))


class SincronizacionSucursal(Base):
    """Vista v_sincronizacion: primera/última venta y última consulta por sucursal."""

    __tablename__ = "v_sincronizacion"
    __table_args__ = {"info": {"is_view": True}}

    sucursal: Mapped[str] = mapped_column(String(3), primary_key=True)
    primera_venta: Mapped[datetime | None] = mapped_column(DateTime)
    ultima_venta: Mapped[datetime | None] = mapped_column(DateTime)
    ultima_consulta: Mapped[datetime | None] = mapped_column(DateTime)


class DispensadorSucursalBase(Base):
    __tablename__ = "dispensador_sucursal_base"

    dispensador: Mapped[str] = mapped_column(String(150), primary_key=True)
    sucursal: Mapped[str] = mapped_column(String(3))


class MetaGlobalSucursal(Base):
    __tablename__ = "meta_global_sucursal"

    sucursal: Mapped[str] = mapped_column(String(3), primary_key=True)
    meta: Mapped[Decimal] = mapped_column(Numeric(20, 2))


class Meta5skuSucursal(Base):
    __tablename__ = "meta_5sku_sucursal"

    sucursal: Mapped[str] = mapped_column(String(3), primary_key=True)
    meta: Mapped[Decimal] = mapped_column(Numeric(20, 2))
