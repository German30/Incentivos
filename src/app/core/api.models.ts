// Contratos de Incentivos-Back (/api/v1). Los Decimal viajan como number.

export type Rol = 'ADMINISTRADOR' | 'DISPENSADOR' | 'DOCTOR';

export type Modulo =
  | 'catalogos'
  | 'catalogo_dispensadores'
  | 'dispensadores'
  | 'sucursales'
  | 'doctores'
  | 'sincronizacion'
  | 'clasificacion'
  | 'configuracion'
  | 'usuarios';

// --- Auth y usuarios --------------------------------------------------------

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
  ultimo_acceso: string | null;
}

export interface Sesion {
  usuario: Usuario;
  modulos: Modulo[];
}

export interface Token extends Sesion {
  access_token: string;
  token_type: string;
  expira_en: string;
}

export interface UsuarioCrear {
  usuario: string;
  nombre: string;
  password: string;
  rol: Rol;
}

export interface UsuarioActualizar {
  nombre?: string;
  password?: string;
  rol?: Rol;
  activo?: boolean;
}

export interface CambioPassword {
  password_actual: string;
  password_nueva: string;
}

// --- Reportes ---------------------------------------------------------------

export interface Periodo {
  fecha_inicio: string;
  fecha_fin: string;
}

export interface Proyeccion {
  dia_actual: number;
  dias_del_mes: number;
  proyeccion: number;
}

export interface Indicador {
  venta: number;
  meta: number | null;
  avance: number | null;
  cumple: boolean | null;
}

export interface ResumenDispensadores {
  periodo: Periodo;
  sucursal: string | null;
  venta_global: number;
  no_tickets: number;
  ticket_promedio: number;
  venta_cero_faltante: number;
  ventas_18_skus: number;
  ventas_5_skus: number;
  ventas_solural: number;
  proyeccion: Proyeccion | null;
  ultima_venta: string | null;
}

export interface VentaDispensador {
  posicion: number;
  sucursal: string;
  dispensador: string;
  venta_global: number;
  porcentaje_del_total: number;
  no_tickets: number;
  ticket_promedio: number;
  venta_cero_faltante: number;
}

export interface VentasDispensadores {
  periodo: Periodo;
  total: number;
  dispensadores: VentaDispensador[];
}

export interface IncentivoDispensador {
  sucursal: string;
  dispensador: string;
  skus_18: Indicador;
  skus_5: Indicador;
  solural: Indicador;
}

export interface IncentivosDispensadores {
  periodo: Periodo;
  dispensadores: IncentivoDispensador[];
}

export interface ResumenSucursal {
  sucursal: string;
  venta_global: Indicador;
  no_tickets: number;
  ticket_promedio: number;
  proyeccion: Proyeccion | null;
  cumple_meta_proyectada: boolean | null;
  bono_venta_global: number;
  skus_5: Indicador;
  cero_faltante: Indicador;
}

export interface ResumenSucursales {
  periodo: Periodo;
  sucursales: ResumenSucursal[];
}

export interface Sincronizacion {
  sucursal: string;
  ultima_consulta: string | null;
  ultima_venta: string | null;
}

export interface ComisionDoctor {
  doctor: string;
  categoria_doctor: string;
  cantidad: number;
  no_tickets: number;
  venta: number;
  tipo_comision: string | null;
  comision: number;
  monto_comision: number;
}

export interface ComisionesDoctores {
  periodo: Periodo;
  total_venta: number;
  total_comision: number;
  comisiones: ComisionDoctor[];
}

export interface ResumenCategoriaDoctor {
  categoria_doctor: string;
  doctores: number;
  cantidad: number;
  venta: number;
  monto_comision: number;
}

export interface ResumenDoctores {
  periodo: Periodo;
  categorias: ResumenCategoriaDoctor[];
}

// --- Catálogos --------------------------------------------------------------

export interface Rango {
  primera_venta: string | null;
  ultima_venta: string | null;
  periodo_por_defecto: Periodo;
}

export interface Dispensador {
  dispensador: string;
  sucursal: string;
}

export interface CategoriaClasificada {
  categoria: string | null;
  categoria_doctor: string;
  categoria_incentivo: string;
  renglones: number;
  venta: number;
}

// --- Configuración ----------------------------------------------------------

export interface MetasSucursal {
  sucursal: string;
  meta_global: number | null;
  meta_5_skus: number | null;
  meta_cero_faltante: number | null;
}

export type MetasSucursalIn = Partial<Omit<MetasSucursal, 'sucursal'>>;

export interface MetaDispensador {
  indicador: string;
  meta: number;
}

export type TipoClasificacion = 'DOCTOR' | 'INCENTIVO';
export type CampoClasificacion = 'categoria' | 'clave_articulo';

export interface ReglaClasificacionIn {
  tipo: TipoClasificacion;
  campo: CampoClasificacion;
  patron: string;
  resultado: string;
  prioridad: number;
}

export interface ReglaClasificacion extends ReglaClasificacionIn {
  id: number;
}

export type TipoComision = 'PORCENTAJE' | 'MONTO_POR_UNIDAD';

export interface ReglaComisionIn {
  categoria_doctor: string;
  tipo: TipoComision;
  valor: number;
  venta_minima: number;
  venta_maxima: number | null;
}

export interface ReglaComision extends ReglaComisionIn {
  id: number;
}

export interface Parametro {
  clave: string;
  valor: number;
  descripcion: string | null;
}

// --- Filtros de reporte -----------------------------------------------------

export interface FiltroReporte {
  fecha_inicio?: string;
  fecha_fin?: string;
  sucursal?: string | null;
}
