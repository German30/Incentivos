from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import DbSession, PeriodoDep, SucursalQuery, periodo_out, requiere_modulo
from app.models import DispensadorSucursalBase, MetaGlobalSucursal, SincronizacionSucursal, Venta
from app.schemas.reportes import CategoriaClasificada, DispensadorOut, Rango
from app.services.clasificacion import expresion_clasificacion
from app.services.periodo import filtros_venta, resolver_periodo

router = APIRouter(prefix="/catalogos", tags=["catalogos"])


@router.get("/rango", response_model=Rango, dependencies=[requiere_modulo("catalogos")])
def rango(db: DbSession):
    """Fechas con datos disponibles y periodo que usan los reportes cuando no se envían fechas."""
    primera, ultima = db.execute(
        select(func.min(SincronizacionSucursal.primera_venta), func.max(SincronizacionSucursal.ultima_venta))
    ).one()
    return Rango(
        primera_venta=primera,
        ultima_venta=ultima,
        periodo_por_defecto=periodo_out(resolver_periodo(db, None, None)),
    )


@router.get("/sucursales", response_model=list[str], dependencies=[requiere_modulo("catalogos")])
def sucursales(db: DbSession):
    claves = set(db.scalars(select(MetaGlobalSucursal.sucursal)))
    claves |= set(db.scalars(select(DispensadorSucursalBase.sucursal)))
    return sorted(c.upper() for c in claves if c)


@router.get(
    "/dispensadores",
    response_model=list[DispensadorOut],
    dependencies=[requiere_modulo("catalogo_dispensadores")],
)
def dispensadores(db: DbSession, sucursal: SucursalQuery = None):
    """Dispensadores con su sucursal base."""
    consulta = select(DispensadorSucursalBase).order_by(DispensadorSucursalBase.dispensador)
    if sucursal:
        consulta = consulta.where(DispensadorSucursalBase.sucursal == sucursal.upper())
    return [
        DispensadorOut(dispensador=d.dispensador, sucursal=d.sucursal.upper())
        for d in db.scalars(consulta)
        if d.sucursal
    ]


@router.get(
    "/categorias",
    response_model=list[CategoriaClasificada],
    dependencies=[requiere_modulo("clasificacion")],
)
def categorias(db: DbSession, periodo: PeriodoDep, sucursal: SucursalQuery = None):
    """Cómo se clasifica cada categoría de SICAR. Sirve para detectar categorías nuevas
    que caen en OTROS y no generan comisión (hallazgo 6.5)."""
    cat_doctor = expresion_clasificacion(db, "DOCTOR").label("categoria_doctor")
    cat_incentivo = expresion_clasificacion(db, "INCENTIVO").label("categoria_incentivo")
    clasificadas = (
        select(Venta.categoria, Venta.importe_sin, cat_doctor, cat_incentivo)
        .where(*filtros_venta(periodo, sucursal))
        .subquery()
    )
    c = clasificadas.c
    filas = db.execute(
        select(c.categoria, c.categoria_doctor, c.categoria_incentivo, func.count(), func.sum(c.importe_sin))
        .group_by(c.categoria, c.categoria_doctor, c.categoria_incentivo)
        .order_by(func.sum(c.importe_sin).desc())
    )
    return [
        CategoriaClasificada(
            categoria=cat, categoria_doctor=doc, categoria_incentivo=inc, renglones=n, venta=venta or Decimal(0)
        )
        for cat, doc, inc, n, venta in filas
    ]
