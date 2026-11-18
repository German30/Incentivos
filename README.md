# Incentivos
Software de interpretación de datos para calculo de incentivos

API en FastAPI que reemplaza la lógica del reporte Power BI `Farmacias VIDA_ABR_v1.pbix`
(ventas, metas e incentivos de dispensadores, y comisiones de doctores) leyendo directo de MySQL.

## Requisitos
- Python 3.12+
- MySQL 8 (local)

## Instalación
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS
pip install -r requirements-dev.txt
copy .env.example .env        # Windows (cp en Linux/macOS)
```

## Base de datos
Ajusta las variables `DB_*` del `.env` y ejecuta:
```bash
python -m scripts.init_db                          # importa ../db_incentivos/*.sql
python -m scripts.init_db --dumps C:/ruta/dumps    # otra carpeta
python -m scripts.init_db --sin-dumps              # solo vistas, índices y configuración
```
El script:
1. Crea la base `incentivos` e importa los dumps (quitando las líneas de GTID, que fallan en un MySQL local).
2. Crea índices `(status, fecha)` y las vistas:
   - `v_ventas`: unión de las tablas `dispensadores_<sucursal>` con `status = 1`. Es la fuente de todos
     los reportes; sustituye a `dispensadores_consolidado`, que era una foto incompleta.
   - `v_sincronizacion`: primera/última venta y última consulta por sucursal.
3. Crea y siembra las tablas de configuración, que antes estaban dispersas en el .pbix:

| Tabla | Contenido |
|---|---|
| `meta_dispensador` | Metas individuales: 18 SKUs (5,000), 5 SKUs (30,000), SOLURAL (1,000) |
| `meta_cero_faltante_sucursal` | Metas de cero faltante por sucursal (vacía: cargar vía API) |
| `regla_clasificacion` | Texto de SICAR → categoría de doctor / incentivo (antes `Categoria_Doctores` en DAX) |
| `regla_comision` | Comisión por categoría y rango de venta, con tipo `PORCENTAJE` o `MONTO_POR_UNIDAD` |
| `parametro` | `bono_venta_global` (2,000) |

Las metas globales y de 5 SKUs por sucursal siguen en `meta_global_sucursal` y `meta_5sku_sucursal`.

## Ejecutar
```bash
fastapi dev app/main.py
```
Documentación interactiva: http://127.0.0.1:8000/docs

## Credenciales de desarrollo local
> ⚠️ Solo para el entorno local. No usar en producción: cámbialas antes de desplegar.

| Servicio | Usuario | Contraseña |
|---|---|---|
| MySQL (`localhost:3306`, base `incentivos`) | `root` | `root123` |
| API (rol `ADMINISTRADOR`) | `admin` | `vMn1Lrelad4x4uUJ` |

El usuario `admin` lo creó `scripts/init_db.py`. Para cambiar su contraseña: `PUT /api/v1/auth/password`
o `python -m scripts.crear_usuario admin --rol ADMINISTRADOR`.

## Autenticación y roles
Login con JWT: `POST /api/v1/auth/login` con `username` y `password` como formulario
(`application/x-www-form-urlencoded`). Devuelve `access_token`, que se envía en cada petición como
`Authorization: Bearer <token>`. El token dura `JWT_EXPIRA_MINUTOS` (8 h por defecto).

| Rol | Puede ver |
|---|---|
| `ADMINISTRADOR` | Todo: reportes, sincronización, configuración y usuarios |
| `DISPENSADOR` | Reportes de dispensadores y de ventas por sucursal |
| `DOCTOR` | Reportes de doctores |

Los permisos están en [app/core/roles.py](app/core/roles.py). `GET /auth/me` devuelve los módulos del
usuario para que el frontend arme su menú con la misma regla que valida el backend.

- `init_db` crea un administrador inicial si no hay usuarios (define `ADMIN_USUARIO` / `ADMIN_PASSWORD`,
  o se genera una contraseña aleatoria y se imprime).
- Para crear un usuario o recuperar el acceso desde la terminal:
  `python -m scripts.crear_usuario admin --rol ADMINISTRADOR`
- En Swagger (`/docs`), el botón **Authorize** inicia sesión con usuario y contraseña.

## Endpoints (`/api/v1`)
Los reportes aceptan `fecha_inicio`, `fecha_fin` (inclusiva) y `sucursal`. Sin fechas usan el mes de la última venta.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Inicia sesión (público) |
| GET | `/auth/me` | Usuario actual y sus módulos |
| PUT | `/auth/password` | Cambiar la propia contraseña |
| GET/POST/PUT/DELETE | `/usuarios[/{id}]` | Gestión de usuarios (administrador) |
| GET | `/catalogos/rango` | Fechas con datos y periodo por defecto |
| GET | `/catalogos/sucursales` | Claves de sucursal |
| GET | `/catalogos/dispensadores` | Dispensadores y su sucursal base |
| GET | `/catalogos/categorias` | Cómo se clasifica cada categoría de SICAR (detecta las que caen en OTROS) |
| GET | `/dispensadores/resumen` | Venta global, tickets, ticket promedio, cero faltante, proyección |
| GET | `/dispensadores/ventas` | Ranking de ventas por dispensador |
| GET | `/dispensadores/incentivos` | 18 SKUs, 5 SKUs y SOLURAL vs meta por dispensador |
| GET | `/sucursales/resumen` | Venta vs meta, proyección, bono, 5 SKUs y cero faltante por sucursal |
| GET | `/sucursales/sincronizacion` | Última consulta replicada por sucursal |
| GET | `/doctores/comisiones` | Venta y comisión por doctor y categoría |
| GET | `/doctores/resumen` | Totales por categoría de doctor |
| GET/PUT | `/metas/sucursales[/{sucursal}]` | Metas global, 5 SKUs y cero faltante |
| GET/PUT | `/metas/dispensador[/{indicador}]` | Metas individuales |
| GET/POST/PUT/DELETE | `/reglas/clasificacion[/{id}]` | Reglas de clasificación |
| GET/POST/PUT/DELETE | `/reglas/comision[/{id}]` | Reglas de comisión |
| GET/PUT | `/parametros[/{clave}]` | Parámetros de negocio |

## Reglas de cálculo
- **Venta global**: suma de `importeSin`.
- **Ticket promedio**: promedio del `subtotal` por venta (`id_venta`).
- **Proyección**: `venta / día de la última venta × días del mes consultado`; solo cuando el periodo es un mes.
- **Bono venta global**: se otorga si la proyección alcanza la meta global de la sucursal (sin meta, no hay bono).
- **Comisión de doctores**: se evalúa con la venta de cada doctor en cada categoría. `PORCENTAJE` se
  multiplica por la venta y `MONTO_POR_UNIDAD` por la cantidad vendida, igual que `doctores_consolidado`.

## Tests
```bash
pytest
```
`tests/test_api.py` corre contra la base local y se omite si no está disponible.
