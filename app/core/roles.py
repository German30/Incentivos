from enum import StrEnum


class Rol(StrEnum):
    ADMINISTRADOR = "ADMINISTRADOR"
    DISPENSADOR = "DISPENSADOR"
    DOCTOR = "DOCTOR"


# Única fuente de verdad de qué rol ve qué módulo. La usan los endpoints (requiere_modulo)
# y /auth/me, para que el frontend arme su menú con lo mismo que valida el backend.
PERMISOS: dict[str, frozenset[Rol]] = {
    "catalogos": frozenset(Rol),
    "catalogo_dispensadores": frozenset({Rol.ADMINISTRADOR, Rol.DISPENSADOR}),
    "dispensadores": frozenset({Rol.ADMINISTRADOR, Rol.DISPENSADOR}),
    "sucursales": frozenset({Rol.ADMINISTRADOR, Rol.DISPENSADOR}),
    "doctores": frozenset({Rol.ADMINISTRADOR, Rol.DOCTOR}),
    "sincronizacion": frozenset({Rol.ADMINISTRADOR}),
    "clasificacion": frozenset({Rol.ADMINISTRADOR}),
    "configuracion": frozenset({Rol.ADMINISTRADOR}),
    "usuarios": frozenset({Rol.ADMINISTRADOR}),
}


def modulos_de(rol: Rol) -> list[str]:
    return [modulo for modulo, roles in PERMISOS.items() if rol in roles]
