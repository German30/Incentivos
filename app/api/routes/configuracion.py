"""Metas, reglas y parámetros: una sola fuente de verdad en la base (hallazgo 6.1)."""

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import DbSession
from app.models import (
    Meta5skuSucursal,
    MetaCeroFaltanteSucursal,
    MetaDispensador,
    Base,
    MetaGlobalSucursal,
    Parametro,
    ReglaClasificacion,
    ReglaComision,
)
from app.schemas.configuracion import (
    MetaDispensadorOut,
    MetaIn,
    MetasSucursal,
    MetasSucursalIn,
    ParametroIn,
    ParametroOut,
    ReglaClasificacionIn,
    ReglaClasificacionOut,
    ReglaComisionIn,
    ReglaComisionOut,
)
from app.services.ventas import metas_por_sucursal

router = APIRouter(tags=["configuracion"])

MODELOS_META_SUCURSAL = {
    "meta_global": (MetaGlobalSucursal, "global"),
    "meta_5_skus": (Meta5skuSucursal, "5_skus"),
    "meta_cero_faltante": (MetaCeroFaltanteSucursal, "cero_faltante"),
}


def obtener_o_404[M: Base](db: Session, modelo: type[M], clave: str | int) -> M:
    registro = db.get(modelo, clave)
    if registro is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{modelo.__tablename__} '{clave}' no existe")
    return registro


def metas_sucursal_out(sucursal: str, metas: dict) -> MetasSucursal:
    return MetasSucursal(
        sucursal=sucursal,
        **{campo: metas.get(nombre) for campo, (_, nombre) in MODELOS_META_SUCURSAL.items()},
    )


# --- Metas por sucursal ----------------------------------------------------


@router.get("/metas/sucursales", response_model=list[MetasSucursal])
def listar_metas_sucursal(db: DbSession):
    return [metas_sucursal_out(s, m) for s, m in sorted(metas_por_sucursal(db).items())]


@router.put("/metas/sucursales/{sucursal}", response_model=MetasSucursal)
def actualizar_metas_sucursal(sucursal: str, datos: MetasSucursalIn, db: DbSession):
    sucursal = sucursal.upper()
    if len(sucursal) > 3:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "La clave de sucursal tiene máximo 3 caracteres")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if valor is None:
            continue
        modelo, _ = MODELOS_META_SUCURSAL[campo]
        db.merge(modelo(sucursal=sucursal, meta=valor))
    db.commit()
    return metas_sucursal_out(sucursal, metas_por_sucursal(db).get(sucursal, {}))


# --- Metas por dispensador -------------------------------------------------


@router.get("/metas/dispensador", response_model=list[MetaDispensadorOut])
def listar_metas_dispensador(db: DbSession):
    return db.scalars(select(MetaDispensador).order_by(MetaDispensador.indicador)).all()


@router.put("/metas/dispensador/{indicador}", response_model=MetaDispensadorOut)
def actualizar_meta_dispensador(indicador: str, datos: MetaIn, db: DbSession):
    meta = obtener_o_404(db, MetaDispensador, indicador.upper())
    meta.meta = datos.meta
    db.commit()
    return meta


# --- Reglas de clasificación -----------------------------------------------


@router.get("/reglas/clasificacion", response_model=list[ReglaClasificacionOut])
def listar_reglas_clasificacion(db: DbSession, tipo: str | None = None):
    consulta = select(ReglaClasificacion).order_by(
        ReglaClasificacion.tipo, ReglaClasificacion.prioridad, ReglaClasificacion.id
    )
    if tipo:
        consulta = consulta.where(ReglaClasificacion.tipo == tipo.upper())
    return db.scalars(consulta).all()


@router.post(
    "/reglas/clasificacion", response_model=ReglaClasificacionOut, status_code=status.HTTP_201_CREATED
)
def crear_regla_clasificacion(datos: ReglaClasificacionIn, db: DbSession):
    regla = ReglaClasificacion(**datos.model_dump())
    db.add(regla)
    db.commit()
    return regla


@router.put("/reglas/clasificacion/{regla_id}", response_model=ReglaClasificacionOut)
def actualizar_regla_clasificacion(regla_id: int, datos: ReglaClasificacionIn, db: DbSession):
    regla = obtener_o_404(db, ReglaClasificacion, regla_id)
    for campo, valor in datos.model_dump().items():
        setattr(regla, campo, valor)
    db.commit()
    return regla


@router.delete("/reglas/clasificacion/{regla_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_regla_clasificacion(regla_id: int, db: DbSession):
    db.delete(obtener_o_404(db, ReglaClasificacion, regla_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Reglas de comisión ----------------------------------------------------


@router.get("/reglas/comision", response_model=list[ReglaComisionOut])
def listar_reglas_comision(db: DbSession):
    return db.scalars(
        select(ReglaComision).order_by(ReglaComision.categoria_doctor, ReglaComision.venta_minima)
    ).all()


@router.post("/reglas/comision", response_model=ReglaComisionOut, status_code=status.HTTP_201_CREATED)
def crear_regla_comision(datos: ReglaComisionIn, db: DbSession):
    regla = ReglaComision(**datos.model_dump())
    regla.categoria_doctor = regla.categoria_doctor.upper()
    db.add(regla)
    db.commit()
    return regla


@router.put("/reglas/comision/{regla_id}", response_model=ReglaComisionOut)
def actualizar_regla_comision(regla_id: int, datos: ReglaComisionIn, db: DbSession):
    regla = obtener_o_404(db, ReglaComision, regla_id)
    for campo, valor in datos.model_dump().items():
        setattr(regla, campo, valor)
    regla.categoria_doctor = regla.categoria_doctor.upper()
    db.commit()
    return regla


@router.delete("/reglas/comision/{regla_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_regla_comision(regla_id: int, db: DbSession):
    db.delete(obtener_o_404(db, ReglaComision, regla_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Parámetros ------------------------------------------------------------


@router.get("/parametros", response_model=list[ParametroOut])
def listar_parametros(db: DbSession):
    return db.scalars(select(Parametro).order_by(Parametro.clave)).all()


@router.put("/parametros/{clave}", response_model=ParametroOut)
def actualizar_parametro(clave: str, datos: ParametroIn, db: DbSession):
    parametro = obtener_o_404(db, Parametro, clave)
    parametro.valor = datos.valor
    db.commit()
    return parametro
