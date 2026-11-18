from datetime import date, datetime
from decimal import Decimal

from app.models import ReglaComision
from app.services.doctores import calcular_monto, regla_aplicable
from app.services.periodo import Periodo
from app.services.ventas import proyectar


def regla(tipo, valor, minima="0", maxima=None):
    return ReglaComision(
        categoria_doctor="X",
        tipo=tipo,
        valor=Decimal(valor),
        venta_minima=Decimal(minima),
        venta_maxima=Decimal(maxima) if maxima else None,
    )


CERO_FALTANTE = [
    regla("PORCENTAJE", "0.025", "70000.01", "110000"),
    regla("PORCENTAJE", "0.035", "110000"),
]


def valor_aplicable(venta: str) -> Decimal | None:
    regla_encontrada = regla_aplicable(CERO_FALTANTE, Decimal(venta))
    return regla_encontrada.valor if regla_encontrada else None


def test_cero_faltante_por_rangos():
    assert valor_aplicable("70000") is None
    assert valor_aplicable("70000.01") == Decimal("0.025")
    assert valor_aplicable("109999.99") == Decimal("0.025")
    assert valor_aplicable("110000") == Decimal("0.035")


def test_monto_porcentaje_sobre_venta():
    assert calcular_monto(regla("PORCENTAJE", "0.05"), Decimal("3706.00"), Decimal(10)) == Decimal("185.30")


def test_monto_fijo_por_unidad():
    # Igual que doctores_consolidado_dic: ELECTROCARDIOGRAMA 39 unidades x $50 = $1,950.
    assert calcular_monto(regla("MONTO_POR_UNIDAD", "50"), Decimal("10833.03"), Decimal(39)) == Decimal("1950.00")


def test_sin_regla_no_hay_comision():
    assert calcular_monto(None, Decimal("1000"), Decimal(1)) == Decimal(0)


def test_proyeccion_usa_dias_del_mes_consultado():
    periodo = Periodo(date(2026, 2, 1), date(2026, 2, 28))
    p = proyectar(Decimal("2300"), periodo, datetime(2026, 2, 23, 18, 0))
    assert p is not None
    assert (p.dia_actual, p.dias_del_mes) == (23, 28)
    assert p.proyeccion == Decimal("2800")


def test_proyeccion_solo_aplica_a_un_mes():
    assert proyectar(Decimal(1), Periodo(date(2026, 1, 1), date(2026, 2, 28)), datetime(2026, 2, 1)) is None
