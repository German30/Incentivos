"""Página "Dispensadores" del reporte."""

from fastapi import APIRouter

from app.api.deps import DbSession, PeriodoDep, SucursalQuery, indicador, periodo_out
from app.schemas.reportes import (
    IncentivoDispensador,
    IncentivosDispensadores,
    ProyeccionOut,
    ResumenDispensadores,
    VentaDispensador,
    VentasDispensadores,
)
from app.services import ventas

router = APIRouter(prefix="/dispensadores", tags=["dispensadores"])


@router.get("/resumen", response_model=ResumenDispensadores)
def resumen(db: DbSession, periodo: PeriodoDep, sucursal: SucursalQuery = None):
    """Tarjetas generales: venta global, ticket promedio, venta cero faltante y proyección."""
    total = ventas.totales(ventas.ventas_por_dispensador(db, periodo, sucursal))
    proyeccion = ventas.proyectar(total.venta_global, periodo, total.ultima_venta)
    return ResumenDispensadores(
        periodo=periodo_out(periodo),
        sucursal=sucursal.upper() if sucursal else None,
        venta_global=total.venta_global,
        no_tickets=total.no_tickets,
        ticket_promedio=total.ticket_promedio,
        venta_cero_faltante=total.venta_cero_faltante,
        ventas_18_skus=total.ventas_incentivo["18_SKUS"],
        ventas_5_skus=total.ventas_incentivo["5_SKUS"],
        ventas_solural=total.ventas_incentivo["SOLURAL"],
        proyeccion=ProyeccionOut(**vars(proyeccion)) if proyeccion else None,
        ultima_venta=total.ultima_venta,
    )


@router.get("/ventas", response_model=VentasDispensadores)
def ventas_dispensadores(db: DbSession, periodo: PeriodoDep, sucursal: SucursalQuery = None):
    """Ranking de ventas por dispensador (tablas VENTA GLOBAL, TICKET PROMEDIO y gráfico de pastel)."""
    filas = ventas.ventas_por_dispensador(db, periodo, sucursal)
    total = sum((f.venta_global for f in filas), ventas.CERO)
    return VentasDispensadores(
        periodo=periodo_out(periodo),
        total=total,
        dispensadores=[
            VentaDispensador(
                posicion=i,
                sucursal=f.sucursal,
                dispensador=f.dispensador,
                venta_global=f.venta_global,
                porcentaje_del_total=f.venta_global / total if total else ventas.CERO,
                no_tickets=f.no_tickets,
                ticket_promedio=f.ticket_promedio,
                venta_cero_faltante=f.venta_cero_faltante,
            )
            for i, f in enumerate(filas, start=1)
        ],
    )


@router.get("/incentivos", response_model=IncentivosDispensadores)
def incentivos(db: DbSession, periodo: PeriodoDep, sucursal: SucursalQuery = None):
    """KPIs individuales contra meta: 18 SKUs, 5 SKUs y SOLURAL."""
    metas = ventas.metas_dispensador(db)
    filas = ventas.ventas_por_dispensador(db, periodo, sucursal)
    return IncentivosDispensadores(
        periodo=periodo_out(periodo),
        dispensadores=[
            IncentivoDispensador(
                sucursal=f.sucursal,
                dispensador=f.dispensador,
                skus_18=indicador(f.ventas_incentivo["18_SKUS"], metas.get("18_SKUS")),
                skus_5=indicador(f.ventas_incentivo["5_SKUS"], metas.get("5_SKUS")),
                solural=indicador(f.ventas_incentivo["SOLURAL"], metas.get("SOLURAL")),
            )
            for f in filas
        ],
    )
