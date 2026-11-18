from collections import defaultdict
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ReglaComision, Venta
from app.services.clasificacion import SIN_CLASIFICAR, expresion_clasificacion
from app.services.periodo import Periodo, filtros_venta

CERO = Decimal(0)
CENTAVO = Decimal("0.01")
PUBLICO_EN_GENERAL = ("PÚBLICO EN GENERAL", "PUBLICO EN GENERAL")


@dataclass
class ComisionDoctor:
    doctor: str
    categoria_doctor: str
    cantidad: Decimal
    no_tickets: int
    venta: Decimal
    tipo_comision: str | None
    comision: Decimal
    monto_comision: Decimal


def regla_aplicable(reglas: list[ReglaComision], venta: Decimal) -> ReglaComision | None:
    candidatas = [
        r for r in reglas if r.venta_minima <= venta and (r.venta_maxima is None or venta < r.venta_maxima)
    ]
    return max(candidatas, key=lambda r: r.venta_minima, default=None)


def calcular_monto(regla: ReglaComision | None, venta: Decimal, cantidad: Decimal) -> Decimal:
    if regla is None:
        return CERO
    base = venta if regla.tipo == "PORCENTAJE" else cantidad
    return (regla.valor * base).quantize(CENTAVO, ROUND_HALF_UP)


def comisiones_doctores(
    db: Session,
    periodo: Periodo,
    sucursal: str | None = None,
    categoria: str | None = None,
    incluir_publico_general: bool = True,
) -> list[ComisionDoctor]:
    """Reproduce doctores_consolidado: venta por doctor (cli_nombre) y categoría,
    con la comisión evaluada contra la venta de cada doctor."""
    cat_doctor = expresion_clasificacion(db, "DOCTOR").label("categoria_doctor")
    condiciones = filtros_venta(periodo, sucursal)
    if not incluir_publico_general:
        condiciones.append(func.upper(Venta.cli_nombre).not_in(PUBLICO_EN_GENERAL))

    clasificadas = select(
        Venta.cli_nombre, Venta.sucursal, Venta.id_venta, Venta.cantidad, Venta.importe_sin, cat_doctor
    ).where(*condiciones).subquery()

    consulta = (
        select(
            clasificadas.c.cli_nombre,
            clasificadas.c.categoria_doctor,
            func.sum(clasificadas.c.cantidad),
            func.count(func.distinct(func.concat(clasificadas.c.sucursal, "-", clasificadas.c.id_venta))),
            func.sum(clasificadas.c.importe_sin),
        )
        .where(clasificadas.c.categoria_doctor != SIN_CLASIFICAR)
        .group_by(clasificadas.c.cli_nombre, clasificadas.c.categoria_doctor)
    )
    if categoria:
        consulta = consulta.where(clasificadas.c.categoria_doctor == categoria.upper())

    reglas: dict[str, list[ReglaComision]] = defaultdict(list)
    for regla in db.scalars(select(ReglaComision)):
        reglas[regla.categoria_doctor.upper()].append(regla)

    resultado = []
    for doctor, cat, cantidad, tickets, venta in db.execute(consulta):
        cantidad, venta = cantidad or CERO, venta or CERO
        regla = regla_aplicable(reglas[cat.upper()], venta)
        resultado.append(
            ComisionDoctor(
                doctor=doctor or "(sin nombre)",
                categoria_doctor=cat,
                cantidad=cantidad,
                no_tickets=tickets,
                venta=venta,
                tipo_comision=regla.tipo if regla else None,
                comision=regla.valor if regla else CERO,
                monto_comision=calcular_monto(regla, venta, cantidad),
            )
        )
    resultado.sort(key=lambda c: (-c.monto_comision, -c.venta))
    return resultado
