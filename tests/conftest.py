import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, text

from app.core.roles import Rol
from app.core.security import hashear_password
from app.db.session import SessionLocal, engine
from app.main import app
from app.models import Usuario

PASSWORD = "password-de-prueba"
PREFIJO = "pytest_"


def base_disponible() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM v_ventas LIMIT 1"))
            conn.execute(text("SELECT 1 FROM usuario LIMIT 1"))
        return True
    except Exception:  # noqa: BLE001
        return False


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(scope="session")
def usuarios():
    """Un usuario temporal por rol; se eliminan al terminar la sesión de pruebas."""
    if not base_disponible():
        pytest.skip("Base de datos no disponible")
    with SessionLocal() as db:
        db.execute(delete(Usuario).where(Usuario.usuario.startswith(PREFIJO)))
        creados = {
            rol: Usuario(
                usuario=f"{PREFIJO}{rol.value.lower()}",
                nombre=f"Prueba {rol.value}",
                password_hash=hashear_password(PASSWORD),
                rol=rol,
                activo=True,
            )
            for rol in Rol
        }
        db.add_all(creados.values())
        db.commit()
        yield {rol: u.usuario for rol, u in creados.items()}
        db.execute(delete(Usuario).where(Usuario.usuario.startswith(PREFIJO)))
        db.commit()


@pytest.fixture(scope="session")
def headers(client, usuarios):
    """Encabezado Authorization por rol."""
    resultado = {}
    for rol, usuario in usuarios.items():
        respuesta = client.post("/api/v1/auth/login", data={"username": usuario, "password": PASSWORD})
        assert respuesta.status_code == 200, respuesta.text
        resultado[rol] = {"Authorization": f"Bearer {respuesta.json()['access_token']}"}
    return resultado
