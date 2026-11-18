from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from app.core.roles import Rol


def validar_password(valor: str) -> str:
    # bcrypt solo considera los primeros 72 bytes.
    if len(valor.encode("utf-8")) > 72:
        raise ValueError("La contraseña no puede exceder 72 bytes")
    return valor


Password = Annotated[str, Field(min_length=8), AfterValidator(validar_password)]
NombreUsuario = Annotated[str, Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9._-]+$")]


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario: str
    nombre: str
    rol: Rol
    activo: bool
    creado_en: datetime
    ultimo_acceso: datetime | None


class SesionOut(BaseModel):
    usuario: UsuarioOut
    modulos: list[str]


class TokenOut(SesionOut):
    access_token: str
    token_type: str = "bearer"
    expira_en: datetime


class UsuarioCrear(BaseModel):
    usuario: NombreUsuario
    nombre: str = Field(min_length=1, max_length=150)
    password: Password
    rol: Rol


class UsuarioActualizar(BaseModel):
    """Solo se modifican los campos enviados."""

    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    password: Password | None = None
    rol: Rol | None = None
    activo: bool | None = None


class CambioPassword(BaseModel):
    password_actual: str
    password_nueva: Password
