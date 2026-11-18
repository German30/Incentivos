from fastapi import APIRouter

from app.api.deps import requiere_modulo
from app.api.routes import (
    auth,
    catalogos,
    configuracion,
    dispensadores,
    doctores,
    health,
    sucursales,
    usuarios,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
# catalogos y sucursales mezclan módulos: sus permisos se declaran por endpoint.
api_router.include_router(catalogos.router)
api_router.include_router(sucursales.router)
api_router.include_router(dispensadores.router, dependencies=[requiere_modulo("dispensadores")])
api_router.include_router(doctores.router, dependencies=[requiere_modulo("doctores")])
api_router.include_router(configuracion.router, dependencies=[requiere_modulo("configuracion")])
api_router.include_router(usuarios.router, dependencies=[requiere_modulo("usuarios")])
