import calendar
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import (
    Meta5skuSucursal,
    MetaCeroFaltanteSucursal,
    MetaDispensador,
    MetaGlobalSucursal,
    Parametro,
    Venta,
)
from app.services.clasificacion import expresion_clasificacion
from app.services.periodo import Periodo, filtros_venta

CERO = Decimal(0)
INDICADORES_INCENTIVO = {"18_SKUS": "18 SKUs", "5_SKUS": "5 SKUs", "SOLURAL": "SOLURAL"}


@dataclass
class VentasDispensador:
    sucursal: str
    dispensador: str
    venta_global: Decimal
    no_tickets: int
    suma_tickets: Decimal
    venta_cero_faltante: Decimal
    ventas_incentivo: dict[str, Decimal]
    ultima_venta: datetime

    @property
    def ticket_promedio(self) -> Decimal:
        return self.suma_tickets / self.no_tickets if self.no_tickets else CERO


@dataclass
class Totales:
    venta_global: Decimal = CERO
    no_tickets: int = 0
    suma_tickets: Decimal = CERO
    venta_cero_faltante: Decimal = CERO
    ventas_incentivo: dict[str, Decimal] = field(default_factory=lambda: defaultdict(lambda: CERO))
    ultima_venta: datetime | None = None

    def agregar(self, fila: VentasDispensador) -> None:
        self.venta_global += fila.venta_global
        self.no_tickets += fila.no_tickets
        self.suma_tickets += fila.suma_tickets
        self.venta_cero_faltante += fila.venta_cero_faltante
        for indicador, venta in fila.ventas_incentivo.items():
            self.ventas_incentivo[indicador] += venta
        if self.ultima_venta is None or fila.ultima_venta > self.ultima_venta:
            self.ultima_venta = fila.ultima_venta

    @property
    def ticket_promedio(self) -> Decimal:
        return self.suma_tickets / self.no_tickets if self.no_tickets else CERO


def ventas_por_dispensador(db: Session, periodo: Periodo, sucursal: str | None = None) -> list[VentasDispensador]:
    """Equivale a venta_global, ticket_promedio, VENTA GLOBAL CERO FALTANTE y las tablas
    Ventas 18SKUs/5SKUs/SOLURAL del .pbix, agrupado por sucursal y dispensador."""
    cat_doctor = expresion_clasificacion(db, "DOCTOR")
    cat_incentivo = expresion_clasificacion(db, "INCENTIVO")

    def importe_si(condicion):
        return func.sum(case((condicion, Venta.importe_sin), else_=0))

    # Nivel ticket: el subtotal se repite en cada renglón de la venta, por eso MAX.
    tickets = (
        select(
            Venta.sucursal,
            Venta.dispensador,
            Venta.id_venta,
            func.max(Venta.subtotal).label("subtotal"),
            func.max(Venta.fecha_venta).label("fecha_venta"),
            func.sum(Venta.importe_sin).label("venta"),
            importe_si(cat_doctor == "CERO FALTANTE").label("cero_faltante"),
            *(importe_si(cat_incentivo == valor).label(clave) for clave, valor in INDICADORES_INCENTIVO.items()),
        )
        .where(*filtros_venta(periodo, sucursal))
        .group_by(Venta.sucursal, Venta.dispensador, Venta.id_venta)
        .subquery()
    )
    consulta = (
        select(
            tickets.c.sucursal,
            tickets.c.dispensador,
            func.sum(tickets.c.venta),
            func.count(),
            func.sum(tickets.c.subtotal),
            func.sum(tickets.c.cero_faltante),
            *(func.sum(tickets.c[clave]) for clave in INDICADORES_INCENTIVO),
            func.max(tickets.c.fecha_venta),
        )
        .group_by(tickets.c.sucursal, tickets.c.dispensador)
        .order_by(func.sum(tickets.c.venta).desc())
    )

    resultado = []
    for fila in db.execute(consulta):
        suc, disp, venta, n, suma_tickets, cero_faltante, *incentivos, ultima = fila
        resultado.append(
            VentasDispensador(
                sucursal=suc,
                dispensador=disp or "(sin dispensador)",
                venta_global=venta or CERO,
                no_tickets=n,
                suma_tickets=suma_tickets or CERO,
                venta_cero_faltante=cero_faltante or CERO,
                ventas_incentivo={k: v or CERO for k, v in zip(INDICADORES_INCENTIVO, incentivos)},
                ultima_venta=ultima,
            )
        )
    return resultado


def totales(filas: list[VentasDispensador]) -> Totales:
    total = Totales()
    for fila in filas:
        total.agregar(fila)
    return total


def totales_por_sucursal(filas: list[VentasDispensador]) -> dict[str, Totales]:
    por_sucursal: dict[str, Totales] = defaultdict(Totales)
    for fila in filas:
        por_sucursal[fila.sucursal].agregar(fila)
    return dict(sorted(por_sucursal.items()))


@dataclass
class Proyeccion:
    dia_actual: int
    dias_del_mes: int
    proyeccion: Decimal


def proyectar(venta: Decimal, periodo: Periodo, ultima_venta: datetime | None) -> Proyeccion | None:
    """Proyección lineal de cierre de mes: venta / dia_actual * dias_del_mes.

    A diferencia del DAX original (que usaba TODAY()), los días del mes salen del mes
    consultado, así que también funciona para meses anteriores. Solo aplica a un mes.
    """
    if not periodo.mismo_mes or ultima_venta is None:
        return None
    referencia: date = min(ultima_venta.date(), periodo.fin)
    dias_del_mes = calendar.monthrange(referencia.year, referencia.month)[1]
    return Proyeccion(
        dia_actual=referencia.day,
        dias_del_mes=dias_del_mes,
        proyeccion=venta / referencia.day * dias_del_mes,
    )


def metas_por_sucursal(db: Session) -> dict[str, dict[str, Decimal]]:
    metas: dict[str, dict[str, Decimal]] = defaultdict(dict)
    for nombre, modelo in (
        ("global", MetaGlobalSucursal),
        ("5_skus", Meta5skuSucursal),
        ("cero_faltante", MetaCeroFaltanteSucursal),
    ):
        for registro in db.scalars(select(modelo)):
            metas[registro.sucursal.upper()][nombre] = registro.meta
    return metas


def metas_dispensador(db: Session) -> dict[str, Decimal]:
    return {m.indicador: m.meta for m in db.scalars(select(MetaDispensador))}


def parametro(db: Session, clave: str, default: Decimal = CERO) -> Decimal:
    registro = db.get(Parametro, clave)
    return registro.valor if registro else default


def avance(venta: Decimal, meta: Decimal | None) -> Decimal | None:
    if not meta:
        return None
    return venta / meta
