"""Pruebas de integración contra la base local creada con scripts/init_db.py."""

import pytest

from app.core.roles import Rol

SEPTIEMBRE = {"fecha_inicio": "2026-09-01", "fecha_fin": "2026-09-30"}


@pytest.fixture
def get(client, headers):
    def _get(ruta, **params):
        respuesta = client.get(f"/api/v1{ruta}", params=params, headers=headers[Rol.ADMINISTRADOR])
        assert respuesta.status_code == 200, respuesta.text
        return respuesta.json()

    return _get


@pytest.fixture
def admin(headers):
    return headers[Rol.ADMINISTRADOR]


def test_rango_y_periodo_por_defecto(get):
    rango = get("/catalogos/rango")
    assert rango["ultima_venta"] is not None
    assert rango["periodo_por_defecto"]["fecha_inicio"].endswith("-01")


def test_resumen_cuadra_con_ventas_por_dispensador(get):
    resumen = get("/dispensadores/resumen", **SEPTIEMBRE)
    ventas = get("/dispensadores/ventas", **SEPTIEMBRE)
    assert resumen["venta_global"] == pytest.approx(ventas["total"])
    assert resumen["no_tickets"] == sum(d["no_tickets"] for d in ventas["dispensadores"])
    assert resumen["proyeccion"]["dias_del_mes"] == 30


def test_resumen_sucursales_suma_el_total(get):
    resumen = get("/dispensadores/resumen", **SEPTIEMBRE)
    sucursales = get("/sucursales/resumen", **SEPTIEMBRE)["sucursales"]
    assert sum(s["venta_global"]["venta"] for s in sucursales) == pytest.approx(resumen["venta_global"])


def test_filtro_por_sucursal(get):
    pza = get("/dispensadores/ventas", sucursal="pza", **SEPTIEMBRE)
    assert pza["dispensadores"]
    assert {d["sucursal"] for d in pza["dispensadores"]} == {"PZA"}


def test_comisiones_respetan_reglas(get):
    comisiones = get("/doctores/comisiones", **SEPTIEMBRE)["comisiones"]
    assert comisiones
    for c in comisiones:
        if c["tipo_comision"] == "PORCENTAJE":
            assert c["monto_comision"] == pytest.approx(c["venta"] * c["comision"], abs=0.01)
        elif c["tipo_comision"] == "MONTO_POR_UNIDAD":
            assert c["monto_comision"] == pytest.approx(c["cantidad"] * c["comision"], abs=0.01)
        else:
            assert c["monto_comision"] == 0


def test_fechas_invertidas_devuelven_422(client, admin):
    respuesta = client.get(
        "/api/v1/dispensadores/resumen", params={"fecha_inicio": "2026-09-10", "fecha_fin": "2026-09-01"},
        headers=admin,
    )
    assert respuesta.status_code == 422


def test_crud_regla_comision(client, admin):
    nueva = {"categoria_doctor": "test pytest", "tipo": "PORCENTAJE", "valor": 0.01}
    creada = client.post("/api/v1/reglas/comision", json=nueva, headers=admin)
    assert creada.status_code == 201
    regla_id = creada.json()["id"]
    try:
        assert creada.json()["categoria_doctor"] == "TEST PYTEST"
        actualizada = client.put(f"/api/v1/reglas/comision/{regla_id}", json={**nueva, "valor": 0.02}, headers=admin)
        assert actualizada.json()["valor"] == 0.02
    finally:
        assert client.delete(f"/api/v1/reglas/comision/{regla_id}", headers=admin).status_code == 204
