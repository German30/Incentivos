"""Crea un usuario o restablece su contraseña desde la terminal (útil si se pierde el acceso de administrador).

Uso:
    python -m scripts.crear_usuario admin --rol ADMINISTRADOR
    python -m scripts.crear_usuario jperez --rol DISPENSADOR --nombre "Juan Pérez"
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.roles import Rol
from app.core.security import hashear_password
from app.db.session import SessionLocal
from app.models import Usuario
from app.schemas.usuarios import validar_password


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("usuario")
    parser.add_argument("--rol", choices=[r.value for r in Rol], default=Rol.ADMINISTRADOR.value)
    parser.add_argument("--nombre", help="por defecto, el nombre de usuario")
    args = parser.parse_args()

    password = getpass.getpass("Contraseña (mínimo 8 caracteres): ")
    if len(password) < 8 or password != getpass.getpass("Repita la contraseña: "):
        sys.exit("Las contraseñas no coinciden o tienen menos de 8 caracteres.")
    try:
        validar_password(password)
    except ValueError as error:
        sys.exit(str(error))

    with SessionLocal() as db:
        usuario = db.scalar(select(Usuario).where(Usuario.usuario == args.usuario))
        if usuario is None:
            usuario = Usuario(usuario=args.usuario, nombre=args.nombre or args.usuario)
            db.add(usuario)
            accion = "creado"
        else:
            accion = "actualizado"
        usuario.password_hash = hashear_password(password)
        usuario.rol = Rol(args.rol)
        usuario.activo = True
        if args.nombre:
            usuario.nombre = args.nombre
        db.commit()
    print(f"Usuario '{args.usuario}' {accion} con rol {args.rol}.")


if __name__ == "__main__":
    main()
