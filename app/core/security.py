from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings

# Hash contra el que se compara cuando el usuario no existe, para que el tiempo de respuesta
# no revele qué nombres de usuario son válidos.
HASH_FICTICIO = bcrypt.hashpw(b"usuario-inexistente", bcrypt.gensalt()).decode()


def hashear_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()


def verificar_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:  # contraseña de más de 72 bytes o hash inválido
        return False


def crear_token(usuario_id: int, rol: str) -> tuple[str, datetime]:
    settings = get_settings()
    expira = datetime.now(UTC) + timedelta(minutes=settings.jwt_expira_minutos)
    token = jwt.encode(
        {"sub": str(usuario_id), "rol": rol, "exp": expira},
        settings.jwt_secret,
        algorithm=settings.jwt_algoritmo,
    )
    return token, expira


def decodificar_token(token: str) -> int | None:
    """Devuelve el id del usuario, o None si el token es inválido o expiró."""
    settings = get_settings()
    try:
        datos = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algoritmo])
        return int(datos["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
