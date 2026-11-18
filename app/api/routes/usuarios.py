from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import DbSession, UsuarioActual
from app.core.roles import Rol
from app.core.security import hashear_password
from app.models import Usuario
from app.schemas.usuarios import UsuarioActualizar, UsuarioCrear, UsuarioOut

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def obtener_usuario(db, usuario_id: int) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    return usuario


@router.get("", response_model=list[UsuarioOut])
def listar(db: DbSession):
    return db.scalars(select(Usuario).order_by(Usuario.usuario)).all()


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear(datos: UsuarioCrear, db: DbSession):
    if db.scalar(select(Usuario).where(Usuario.usuario == datos.usuario)):
        raise HTTPException(status.HTTP_409_CONFLICT, f"El usuario '{datos.usuario}' ya existe")
    usuario = Usuario(
        usuario=datos.usuario,
        nombre=datos.nombre,
        password_hash=hashear_password(datos.password),
        rol=datos.rol,
        activo=True,
    )
    db.add(usuario)
    db.commit()
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioOut)
def actualizar(usuario_id: int, datos: UsuarioActualizar, actual: UsuarioActual, db: DbSession):
    usuario = obtener_usuario(db, usuario_id)
    cambios = datos.model_dump(exclude_unset=True, exclude_none=True)
    # Evita que el administrador se bloquee a sí mismo.
    if usuario.id == actual.id and (
        cambios.get("activo") is False or cambios.get("rol", Rol.ADMINISTRADOR) != Rol.ADMINISTRADOR
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puede desactivarse ni quitarse el rol de administrador")

    if "password" in cambios:
        usuario.password_hash = hashear_password(cambios.pop("password"))
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)
    db.commit()
    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(usuario_id: int, actual: UsuarioActual, db: DbSession):
    usuario = obtener_usuario(db, usuario_id)
    if usuario.id == actual.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puede eliminar su propio usuario")
    db.delete(usuario)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
