from sqlalchemy import case, literal, select
from sqlalchemy.orm import Session

from app.models import ReglaClasificacion, Venta

SIN_CLASIFICAR = "OTROS"


def expresion_clasificacion(db: Session, tipo: str):
    """CASE SQL construido desde regla_clasificacion: gana la primera regla (por prioridad) que coincida."""
    reglas = db.scalars(
        select(ReglaClasificacion)
        .where(ReglaClasificacion.tipo == tipo)
        .order_by(ReglaClasificacion.prioridad, ReglaClasificacion.id)
    ).all()
    if not reglas:
        return literal(SIN_CLASIFICAR)
    return case(
        *(
            (getattr(Venta, regla.campo).contains(regla.patron, autoescape=True), regla.resultado)
            for regla in reglas
        ),
        else_=SIN_CLASIFICAR,
    )
