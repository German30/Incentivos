from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MetasSucursal(BaseModel):
    sucursal: str
    meta_global: float | None
    meta_5_skus: float | None
    meta_cero_faltante: float | None


class MetasSucursalIn(BaseModel):
    """Solo se actualizan los campos enviados."""

    meta_global: Decimal | None = Field(default=None, ge=0)
    meta_5_skus: Decimal | None = Field(default=None, ge=0)
    meta_cero_faltante: Decimal | None = Field(default=None, ge=0)


class MetaDispensadorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    indicador: str
    meta: float


class MetaIn(BaseModel):
    meta: Decimal = Field(ge=0)


class ReglaClasificacionIn(BaseModel):
    tipo: Literal["DOCTOR", "INCENTIVO"]
    campo: Literal["categoria", "clave_articulo"] = "categoria"
    patron: str = Field(min_length=1, max_length=100)
    resultado: str = Field(min_length=1, max_length=100)
    prioridad: int = 100


class ReglaClasificacionOut(ReglaClasificacionIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ReglaComisionIn(BaseModel):
    categoria_doctor: str = Field(min_length=1, max_length=100)
    tipo: Literal["PORCENTAJE", "MONTO_POR_UNIDAD"]
    valor: Decimal = Field(ge=0, description="Fracción (0.05 = 5%) o monto en pesos por unidad")
    venta_minima: Decimal = Field(default=Decimal(0), ge=0)
    venta_maxima: Decimal | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validar_rango(self):
        if self.venta_maxima is not None and self.venta_maxima <= self.venta_minima:
            raise ValueError("venta_maxima debe ser mayor que venta_minima")
        return self


class ReglaComisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    categoria_doctor: str
    tipo: str
    valor: float
    venta_minima: float
    venta_maxima: float | None


class ParametroOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    clave: str
    valor: float
    descripcion: str | None


class ParametroIn(BaseModel):
    valor: Decimal
