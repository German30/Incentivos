import pytest
from fastapi.routing import APIRoute

from app.core.roles import Rol
from app.main import app
from tests.conftest import PASSWORD

ADMIN, DISPENSADOR, DOCTOR = Rol.ADMINISTRADOR, Rol.DISPENSADOR, Rol.DOCTOR
SEPTIEMBRE = "fecha_inicio=2026-09-01&fecha_fin=2026-09-30"
PUBLICAS = {"/api/v1/health", "/api/v1/auth/login"}

# (ruta, roles con acceso)
MATRIZ = [
    ("/catalogos/rango", {ADMIN, DISPENSADOR, DOCTOR}),
    ("/catalogos/sucursales", {ADMIN, DISPENSADOR, DOCTOR}),
    ("/catalogos/dispensadores", {ADMIN, DISPENSADOR}),
    (f"/catalogos/categorias?{SEPTIEMBRE}", {ADMIN}),
    (f"/dispensadores/resumen?{SEPTIEMBRE}", {ADMIN, DISPENSADOR}),
    (f"/dispensadores/ventas?{SEPTIEMBRE}", {ADMIN, DISPENSADOR}),
    (f"/dispensadores/incentivos?{SEPTIEMBRE}", {ADMIN, DISPENSADOR}),
    (f"/sucursales/resumen?{SEPTIEMBRE}", {ADMIN, DISPENSADOR}),
    ("/sucursales/sincronizacion", {ADMIN}),
    (f"/doctores/comisiones?{SEPTIEMBRE}", {ADMIN, DOCTOR}),
    (f"/doctores/resumen?{SEPTIEMBRE}", {ADMIN, DOCTOR}),
    ("/metas/sucursales", {ADMIN}),
    ("/metas/dispensador", {ADMIN}),
    ("/reglas/clasificacion", {ADMIN}),
    ("/reglas/comision", {ADMIN}),
    ("/parametros", {ADMIN}),
    ("/usuarios", {ADMIN}),
]


def test_todas_las_rutas_requieren_sesion(client):
    """Protege contra endpoints nuevos que se agreguen sin control de acceso."""
    for ruta in app.routes:
        if not isinstance(ruta, APIRoute) or ruta.path in PUBLICAS:
            continue
        for metodo in ruta.methods or ():
            path = ruta.path.replace("{", "").replace("}", "")  # parámetros de ruta con valor literal
            respuesta = client.request(metodo, path)
            assert respuesta.status_code == 401, f"{metodo} {ruta.path} responde {respuesta.status_code} sin token"


@pytest.mark.parametrize(("ruta", "permitidos"), MATRIZ, ids=[r for r, _ in MATRIZ])
@pytest.mark.parametrize("rol", list(Rol), ids=[r.value for r in Rol])
def test_matriz_de_permisos(client, headers, ruta, permitidos, rol):
    respuesta = client.get(f"/api/v1{ruta}", headers=headers[rol])
    esperado = 200 if rol in permitidos else 403
    assert respuesta.status_code == esperado, respuesta.text


def test_me_devuelve_modulos_del_rol(client, headers):
    doctor = client.get("/api/v1/auth/me", headers=headers[DOCTOR]).json()
    assert doctor["usuario"]["rol"] == "DOCTOR"
    assert "doctores" in doctor["modulos"] and "dispensadores" not in doctor["modulos"]

    dispensador = client.get("/api/v1/auth/me", headers=headers[DISPENSADOR]).json()
    assert "dispensadores" in dispensador["modulos"] and "doctores" not in dispensador["modulos"]


def test_login_incorrecto(client, usuarios):
    respuesta = client.post("/api/v1/auth/login", data={"username": usuarios[ADMIN], "password": "otra-cosa"})
    assert respuesta.status_code == 401
    respuesta = client.post("/api/v1/auth/login", data={"username": "no-existe", "password": PASSWORD})
    assert respuesta.status_code == 401


def test_token_invalido(client):
    respuesta = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer basura"})
    assert respuesta.status_code == 401


def test_ciclo_de_vida_de_usuario(client, headers):
    nuevo = {"usuario": "pytest_temporal", "nombre": "Temporal", "password": "temporal123", "rol": "DOCTOR"}
    creado = client.post("/api/v1/usuarios", json=nuevo, headers=headers[ADMIN])
    assert creado.status_code == 201, creado.text
    usuario_id = creado.json()["id"]
    assert client.post("/api/v1/usuarios", json=nuevo, headers=headers[ADMIN]).status_code == 409

    login = client.post("/api/v1/auth/login", data={"username": "pytest_temporal", "password": "temporal123"})
    token = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/v1/doctores/resumen", headers=token).status_code == 200

    # Cambiar el rol aplica de inmediato, sin volver a iniciar sesión.
    client.put(f"/api/v1/usuarios/{usuario_id}", json={"rol": "DISPENSADOR"}, headers=headers[ADMIN])
    assert client.get("/api/v1/doctores/resumen", headers=token).status_code == 403

    # Desactivarlo invalida su sesión.
    client.put(f"/api/v1/usuarios/{usuario_id}", json={"activo": False}, headers=headers[ADMIN])
    assert client.get("/api/v1/auth/me", headers=token).status_code == 401

    assert client.delete(f"/api/v1/usuarios/{usuario_id}", headers=headers[ADMIN]).status_code == 204


def test_admin_no_puede_bloquearse(client, headers):
    yo = client.get("/api/v1/auth/me", headers=headers[ADMIN]).json()["usuario"]["id"]
    assert client.put(f"/api/v1/usuarios/{yo}", json={"activo": False}, headers=headers[ADMIN]).status_code == 400
    assert client.put(f"/api/v1/usuarios/{yo}", json={"rol": "DOCTOR"}, headers=headers[ADMIN]).status_code == 400
    assert client.delete(f"/api/v1/usuarios/{yo}", headers=headers[ADMIN]).status_code == 400


def test_cambio_de_password(client, headers, usuarios):
    h = headers[DOCTOR]
    malo = client.put("/api/v1/auth/password", json={"password_actual": "x", "password_nueva": "nueva-clave-1"}, headers=h)
    assert malo.status_code == 400
    ok = client.put(
        "/api/v1/auth/password", json={"password_actual": PASSWORD, "password_nueva": "nueva-clave-1"}, headers=h
    )
    assert ok.status_code == 204
    login = client.post("/api/v1/auth/login", data={"username": usuarios[DOCTOR], "password": "nueva-clave-1"})
    assert login.status_code == 200
    client.put("/api/v1/auth/password", json={"password_actual": "nueva-clave-1", "password_nueva": PASSWORD}, headers=h)
