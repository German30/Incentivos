import calendar
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import SincronizacionSucursal, Venta


@dataclass(frozen=True)
class Periodo:
    inicio: date
    fin: date  # inclusivo

    @property
    def mismo_mes(self) -> bool:
        return (self.inicio.year, self.inicio.month) == (self.fin.year, self.fin.month)


def primer_dia(d: date) -> date:
    return d.replace(day=1)


def ultimo_dia(d: date) -> date:
    return d.replace(day=calendar.monthrange(d.year, d.month)[1])


def ultima_venta(db: Session) -> datetime | None:
    return db.scalar(select(func.max(SincronizacionSucursal.ultima_venta)))


def resolver_periodo(db: Session, fecha_inicio: date | None, fecha_fin: date | None) -> Periodo:
    """Sin fechas, el periodo es el mes de la última venta registrada (como el reporte mensual)."""
    if fecha_inicio is not None and fecha_fin is not None:
        periodo = Periodo(fecha_inicio, fecha_fin)
    elif fecha_inicio is not None:
        periodo = Periodo(fecha_inicio, ultimo_dia(fecha_inicio))
    elif fecha_fin is not None:
        periodo = Periodo(primer_dia(fecha_fin), fecha_fin)
    else:
        ultima = ultima_venta(db)
        referencia = ultima.date() if ultima else date.today()
        periodo = Periodo(primer_dia(referencia), referencia)

    if periodo.inicio > periodo.fin:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "fecha_inicio debe ser <= fecha_fin")
    return periodo


def filtros_venta(periodo: Periodo, sucursal: str | None = None) -> list:
    condiciones = [
        Venta.fecha_venta >= periodo.inicio,
        Venta.fecha_venta < periodo.fin + timedelta(days=1),
    ]
    if sucursal:
        condiciones.append(Venta.sucursal == sucursal.upper())
    return condiciones
