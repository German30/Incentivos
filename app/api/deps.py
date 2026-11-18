from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.roles import PERMISOS
from app.core.security import decodificar_token
from app.db.session import get_db
from app.models import Usuario
from app.schemas.reportes import Indicador, PeriodoOut
from app.services.periodo import Periodo, resolver_periodo

DbSession = Annotated[Session, Depends(get_db)]

oauth2 = OAuth2PasswordBearer(tokenUrl=f"{get_settings().api_prefix}/auth/login")


def usuario_actual(db: DbSession, token: Annotated[str, Depends(oauth2)]) -> Usuario:
    """Se consulta el usuario en cada petición: desactivarlo o cambiarle el rol aplica de inmediato."""
    usuario_id = decodificar_token(token)
    usuario = db.get(Usuario, usuario_id) if usuario_id is not None else None
    if usuario is None or not usuario.activo:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Sesión inválida o expirada",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def requiere_modulo(modulo: str):
    roles = PERMISOS[modulo]

    def verificar(usuario: UsuarioActual) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Su rol no tiene acceso al módulo '{modulo}'")
        return usuario

    return Depends(verificar)

SucursalQuery = Annotated[
    str | None,
    Query(min_length=2, max_length=3, description="Clave de sucursal (AC1, AC2, ALL, LB, NVA, PZA, VL1, VL2, ZZA)"),
]


def obtener_periodo(
    db: DbSession,
    fecha_inicio: Annotated[date | None, Query(description="Por defecto: inicio del mes de la última venta")] = None,
    fecha_fin: Annotated[date | None, Query(description="Inclusiva. Por defecto: fin de ese mes")] = None,
) -> Periodo:
    return resolver_periodo(db, fecha_inicio, fecha_fin)


PeriodoDep = Annotated[Periodo, Depends(obtener_periodo)]


def periodo_out(periodo: Periodo) -> PeriodoOut:
    return PeriodoOut(fecha_inicio=periodo.inicio, fecha_fin=periodo.fin)


def indicador(venta: Decimal, meta: Decimal | None) -> Indicador:
    if not meta:
        return Indicador(venta=venta, meta=meta, avance=None, cumple=None)
    return Indicador(venta=venta, meta=meta, avance=venta / meta, cumple=venta >= meta)
