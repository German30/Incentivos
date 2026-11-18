from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.tipos import Numero


class PeriodoOut(BaseModel):
    fecha_inicio: date
    fecha_fin: date


class ProyeccionOut(BaseModel):
    dia_actual: int
    dias_del_mes: int
    proyeccion: Numero


class Indicador(BaseModel):
    venta: Numero
    meta: Numero | None
    avance: Numero | None
    cumple: bool | None


# --- Dispensadores ---------------------------------------------------------


class ResumenDispensadores(BaseModel):
    periodo: PeriodoOut
    sucursal: str | None
    venta_global: Numero
    no_tickets: int
    ticket_promedio: Numero
    venta_cero_faltante: Numero
    ventas_18_skus: Numero
    ventas_5_skus: Numero
    ventas_solural: Numero
    proyeccion: ProyeccionOut | None
    ultima_venta: datetime | None


class VentaDispensador(BaseModel):
    posicion: int
    sucursal: str
    dispensador: str
    venta_global: Numero
    porcentaje_del_total: Numero
    no_tickets: int
    ticket_promedio: Numero
    venta_cero_faltante: Numero


class VentasDispensadores(BaseModel):
    periodo: PeriodoOut
    total: Numero
    dispensadores: list[VentaDispensador]


class IncentivoDispensador(BaseModel):
    sucursal: str
    dispensador: str
    skus_18: Indicador
    skus_5: Indicador
    solural: Indicador


class IncentivosDispensadores(BaseModel):
    periodo: PeriodoOut
    dispensadores: list[IncentivoDispensador]


# --- Sucursales ------------------------------------------------------------


class ResumenSucursal(BaseModel):
    sucursal: str
    venta_global: Indicador
    no_tickets: int
    ticket_promedio: Numero
    proyeccion: ProyeccionOut | None
    cumple_meta_proyectada: bool | None
    bono_venta_global: Numero
    skus_5: Indicador
    cero_faltante: Indicador


class ResumenSucursales(BaseModel):
    periodo: PeriodoOut
    sucursales: list[ResumenSucursal]


class Sincronizacion(BaseModel):
    sucursal: str
    ultima_consulta: datetime | None
    ultima_venta: datetime | None


# --- Doctores --------------------------------------------------------------


class ComisionDoctorOut(BaseModel):
    doctor: str
    categoria_doctor: str
    cantidad: Numero
    no_tickets: int
    venta: Numero
    tipo_comision: str | None
    comision: Numero
    monto_comision: Numero


class ComisionesDoctores(BaseModel):
    periodo: PeriodoOut
    total_venta: Numero
    total_comision: Numero
    comisiones: list[ComisionDoctorOut]


class ResumenCategoriaDoctor(BaseModel):
    categoria_doctor: str
    doctores: int
    cantidad: Numero
    venta: Numero
    monto_comision: Numero


class ResumenDoctores(BaseModel):
    periodo: PeriodoOut
    categorias: list[ResumenCategoriaDoctor]


# --- Catálogos -------------------------------------------------------------


class Rango(BaseModel):
    primera_venta: datetime | None
    ultima_venta: datetime | None
    periodo_por_defecto: PeriodoOut


class DispensadorOut(BaseModel):
    dispensador: str
    sucursal: str


class CategoriaClasificada(BaseModel):
    categoria: str | None
    categoria_doctor: str
    categoria_incentivo: str
    renglones: int
    venta: Numero
