from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession, PeriodoDep, SucursalQuery, indicador, periodo_out, requiere_modulo
from app.models import SincronizacionSucursal
from app.schemas.reportes import ProyeccionOut, ResumenSucursal, ResumenSucursales, Sincronizacion
from app.services import ventas

router = APIRouter(prefix="/sucursales", tags=["sucursales"])


@router.get("/resumen", response_model=ResumenSucursales, dependencies=[requiere_modulo("sucursales")])
def resumen(db: DbSession, periodo: PeriodoDep, sucursal: SucursalQuery = None):
    """Venta global vs meta, proyección y bono, 5 SKUs sucursal y cero faltante por sucursal."""
    metas = ventas.metas_por_sucursal(db)
    bono = ventas.parametro(db, "bono_venta_global")
    por_sucursal = ventas.totales_por_sucursal(ventas.ventas_por_dispensador(db, periodo, sucursal))

    resultado = []
    for clave, total in por_sucursal.items():
        meta = metas.get(clave, {})
        proyeccion = ventas.proyectar(total.venta_global, periodo, total.ultima_venta)
        meta_global = meta.get("global")
        cumple = proyeccion.proyeccion >= meta_global if proyeccion and meta_global else None
        resultado.append(
            ResumenSucursal(
                sucursal=clave,
                venta_global=indicador(total.venta_global, meta_global),
                no_tickets=total.no_tickets,
                ticket_promedio=total.ticket_promedio,
                proyeccion=ProyeccionOut(**vars(proyeccion)) if proyeccion else None,
                cumple_meta_proyectada=cumple,
                bono_venta_global=bono if cumple else ventas.CERO,
                skus_5=indicador(total.ventas_incentivo["5_SKUS"], meta.get("5_skus")),
                cero_faltante=indicador(total.venta_cero_faltante, meta.get("cero_faltante")),
            )
        )
    return ResumenSucursales(periodo=periodo_out(periodo), sucursales=resultado)


@router.get(
    "/sincronizacion",
    response_model=list[Sincronizacion],
    dependencies=[requiere_modulo("sincronizacion")],
)
def sincronizacion(db: DbSession):
    """Página "Sincronizacion": última consulta replicada desde SICAR por sucursal."""
    filas = db.scalars(select(SincronizacionSucursal).order_by(SincronizacionSucursal.sucursal))
    return [
        Sincronizacion(sucursal=f.sucursal, ultima_consulta=f.ultima_consulta, ultima_venta=f.ultima_venta)
        for f in filas
    ]
