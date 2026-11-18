import { HttpErrorResponse } from '@angular/common/http';

interface ErrorValidacion {
  loc?: (string | number)[];
  msg?: string;
}

const CAMPOS: Record<string, string> = {
  password: 'contraseña',
  password_nueva: 'contraseña nueva',
  password_actual: 'contraseña actual',
  usuario: 'usuario',
  nombre: 'nombre',
  meta: 'meta',
  valor: 'valor',
  venta_minima: 'venta mínima',
  venta_maxima: 'venta máxima',
  patron: 'patrón',
  resultado: 'resultado',
  categoria_doctor: 'categoría',
};

/** Convierte cualquier error del backend en una frase que diga qué pasó y qué hacer. */
export function mensajeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado. Intente de nuevo.';
  if (error.status === 0) return 'No hay conexión con el servidor. Verifique que la API esté en marcha.';

  const detalle = error.error?.detail;
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle) && detalle.length) {
    return (detalle as ErrorValidacion[])
      .map((d) => {
        const campo = String(d.loc?.at(-1) ?? '');
        const nombre = CAMPOS[campo] ?? campo;
        const msg = (d.msg ?? '').replace(/^Value error, /, '');
        return nombre && nombre !== 'body' ? `${nombre}: ${msg}` : msg;
      })
      .join(' · ');
  }
  if (error.status === 403) return 'Su rol no tiene acceso a esta sección.';
  if (error.status === 404) return 'El registro ya no existe. Recargue la página.';
  if (error.status >= 500) return 'El servidor no pudo completar la consulta. Revise la conexión a la base de datos.';
  return `Error ${error.status}. Intente de nuevo.`;
}
