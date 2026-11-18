from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import DbSession, UsuarioActual
from app.core.roles import modulos_de
from app.core.security import HASH_FICTICIO, crear_token, hashear_password, verificar_password
from app.models import Usuario
from app.schemas.usuarios import CambioPassword, SesionOut, TokenOut, UsuarioOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(datos: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    """Recibe `username` y `password` como formulario (application/x-www-form-urlencoded)."""
    usuario = db.scalar(select(Usuario).where(Usuario.usuario == datos.username))
    valido = verificar_password(datos.password, usuario.password_hash if usuario else HASH_FICTICIO)
    if not usuario or not valido or not usuario.activo:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario.ultimo_acceso = datetime.now()
    db.commit()
    token, expira = crear_token(usuario.id, usuario.rol)
    return TokenOut(
        access_token=token,
        expira_en=expira,
        usuario=UsuarioOut.model_validate(usuario),
        modulos=modulos_de(usuario.rol),
    )


@router.get("/me", response_model=SesionOut)
def yo(usuario: UsuarioActual):
    """Usuario de la sesión y módulos a los que tiene acceso (para armar el menú)."""
    return SesionOut(usuario=UsuarioOut.model_validate(usuario), modulos=modulos_de(usuario.rol))


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_password(datos: CambioPassword, usuario: UsuarioActual, db: DbSession):
    if not verificar_password(datos.password_actual, usuario.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contraseña actual no es correcta")
    usuario.password_hash = hashear_password(datos.password_nueva)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
