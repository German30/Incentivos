# Incentivos
Software de interpretación de datos para calculo de incentivos

Frontend en Angular 21 para [Incentivos-Back](../Incentivos-Back): ventas, metas e incentivos de
dispensadores y sucursales, comisiones de doctores, y la configuración de metas, reglas y usuarios.

## Requisitos
- Node 22.12+ (Angular 21)
- Incentivos-Back corriendo en `http://127.0.0.1:8000`

## Desarrollo
```bash
npm install
npm start          # http://localhost:4200
```
`ng serve` usa [proxy.conf.json](proxy.conf.json): las peticiones a `/api` se envían al backend, así que no hace
falta agregar `localhost:4200` a `CORS_ORIGINS`. En producción sirva el frontend y la API bajo el mismo dominio
(o agregue el origen del frontend a `CORS_ORIGINS` y ajuste `API` en [api.service.ts](src/app/core/api.service.ts)).

```bash
npm run build      # dist/incentivos-front
```

## Estructura
| Ruta | Contenido |
|---|---|
| `src/app/core` | Cliente de la API (todos los endpoints), sesión JWT, interceptor, guards por módulo, filtros de periodo |
| `src/app/layout` | Barra superior, navegación por rol y fila de filtros (mes o rango, sucursal) |
| `src/app/shared` | Gráficas propias: curso del mes con proyección, medidor en celdas contra meta, mezcla en 100 celdas, ranking |
| `src/app/pages` | Dispensadores, Sucursales, Doctores, Configuración, Usuarios, Cuenta, Login |

El menú y los guards usan los `modulos` que devuelve `GET /auth/me`, la misma regla que valida el backend.

## Pantallas
| Pantalla | Rol | Endpoints |
|---|---|---|
| Dispensadores | Administrador, Dispensador | `/dispensadores/resumen`, `/ventas`, `/incentivos`, `/sucursales/resumen` (meta) |
| Sucursales | Administrador, Dispensador | `/sucursales/resumen`, `/sucursales/sincronizacion` (administrador) |
| Doctores | Administrador, Doctor | `/doctores/resumen`, `/doctores/comisiones` |
| Configuración | Administrador | `/metas/*`, `/parametros`, `/reglas/comision`, `/reglas/clasificacion`, `/catalogos/categorias` |
| Usuarios | Administrador | `/usuarios` |
| Cuenta | Todos | `/auth/me`, `/auth/password` |

Diseño: ver [PRODUCT.md](PRODUCT.md) y [DESIGN.md](DESIGN.md).
