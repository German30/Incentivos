const MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const MONEDA_CENTAVOS = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const COMPACTO = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const ENTERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const PCT = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });
const PCT_ENTERO = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 });

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const moneda = (n: number | null | undefined) => (n == null ? '—' : MONEDA.format(n));
export const monedaCentavos = (n: number | null | undefined) => (n == null ? '—' : MONEDA_CENTAVOS.format(n));
export const compacto = (n: number | null | undefined) => (n == null ? '—' : `$${COMPACTO.format(n)}`);
export const entero = (n: number | null | undefined) => (n == null ? '—' : ENTERO.format(n));
export const decimal = (n: number | null | undefined) => (n == null ? '—' : DECIMAL.format(n));
export const pct = (n: number | null | undefined) => (n == null ? '—' : PCT.format(n));
export const pctEntero = (n: number | null | undefined) => (n == null ? '—' : PCT_ENTERO.format(n));

/** 'YYYY-MM-DD' → partes, sin pasar por zona horaria. */
export function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [a, m, d];
}

export function iso(a: number, m: number, d: number): string {
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function diasDelMes(a: number, m: number): number {
  return new Date(a, m, 0).getDate();
}

export function fechaCorta(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [a, m, d] = partes(valor);
  return `${d} ${MESES_CORTOS[m - 1]} ${a}`;
}

export function fechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return `${fechaCorta(valor)} · ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
}

export function periodoTexto(inicio: string, fin: string): string {
  const [a1, m1, d1] = partes(inicio);
  const [a2, m2, d2] = partes(fin);
  if (a1 === a2 && m1 === m2) {
    if (d1 === 1 && d2 === diasDelMes(a2, m2)) return `${MESES[m1 - 1]} ${a1}`;
    return `${d1}–${d2} ${MESES_CORTOS[m1 - 1]} ${a1}`;
  }
  return `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;
}

/** Tiempo transcurrido legible: "hace 3 h", "hace 2 días". */
export function hace(valor: string | null | undefined, ahora = Date.now()): string {
  if (!valor) return 'sin registro';
  const ms = ahora - new Date(valor).getTime();
  if (Number.isNaN(ms)) return '—';
  const min = Math.round(ms / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

export function titulo(texto: string): string {
  return texto.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
