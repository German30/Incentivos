import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

import { compacto, moneda, pct } from '../core/formato';
import { ContenidoPista, LineaPista, Pista } from './pista';

export interface PuntoFlujo {
  clave: string;
  etiqueta: string;
  /** Venta registrada del periodo. */
  valor: number;
  /** Cierre proyectado (solo el mes en curso). */
  proyeccion?: number | null;
}

const ALTO = 260;
const M = { arriba: 36, derecha: 16, abajo: 34, izquierda: 52 };

type P = [number, number];

/** Trazo monótono (Fritsch–Carlson): suave como la referencia, sin rebasar los datos. */
function curva(pts: P[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const n = pts.length;
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let ruta = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (pts[i + 1][0] - pts[i][0]) / 3;
    ruta += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return ruta;
}

@Component({
  selector: 'app-flujo',
  imports: [Pista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (g(); as g) {
      <svg [attr.width]="ancho()" [attr.height]="alto" role="img" [attr.aria-label]="descripcion()" (mouseleave)="activo.set(null)">
        <defs>
          <linearGradient id="flujo-lavado" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--blue)" stop-opacity="0.16" />
            <stop offset="100%" stop-color="var(--blue)" stop-opacity="0" />
          </linearGradient>
        </defs>
        @for (t of g.ticks; track t.y) {
          <line class="rejilla" [attr.x1]="m.izquierda" [attr.x2]="ancho() - m.derecha" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="eje" [attr.x]="m.izquierda - 10" [attr.y]="t.y + 4" text-anchor="end">{{ t.texto }}</text>
        }
        @for (p of g.pts; track p.clave) {
          <text class="eje" [class.eje--activo]="p.i === g.foco" [attr.x]="p.x" [attr.y]="alto - 10" text-anchor="middle">{{ p.etiqueta }}</text>
        }
        @if (g.meta; as meta) {
          <line class="meta" [attr.x1]="m.izquierda" [attr.x2]="ancho() - m.derecha" [attr.y1]="meta.y" [attr.y2]="meta.y" />
          <text class="meta-texto" [attr.x]="ancho() - m.derecha" [attr.y]="meta.y - 6" text-anchor="end">Meta {{ meta.texto }}</text>
        }
        <path class="area" [attr.d]="g.area" fill="url(#flujo-lavado)" />
        <path class="linea" [attr.d]="g.linea" />
        @if (g.proy; as pr) {
          <path class="linea linea--proy" [attr.d]="'M' + pr.x0 + ',' + pr.y0 + ' L' + pr.x + ',' + pr.y" />
          <circle class="punto punto--proy" [attr.cx]="pr.x" [attr.cy]="pr.y" r="5" />
        }
        @if (g.pts[g.foco]; as f) {
          <line class="guia" [attr.x1]="f.x" [attr.x2]="f.x" [attr.y1]="f.y" [attr.y2]="alto - m.abajo" />
          <circle class="punto" [attr.cx]="f.x" [attr.cy]="f.y" r="6" />
          <g [attr.transform]="'translate(' + f.etqX + ',' + (f.y - 30) + ')'">
            <rect class="etq" x="-34" y="0" width="68" height="22" rx="6" />
            <text class="etq-t" x="0" y="15" text-anchor="middle">{{ f.corto }}</text>
          </g>
        }
        @for (p of g.pts; track p.clave) {
          <rect class="zona" [attr.x]="p.x - g.banda / 2" y="0" [attr.width]="g.banda" [attr.height]="alto - m.abajo"
                tabindex="0" (mouseenter)="activo.set(p.i)" (focus)="activo.set(p.i)" [appPista]="pistaDe(p.i)" />
        }
      </svg>
    }
  `,
  styles: `
    :host { display: block; width: 100%; min-height: 260px; }
    svg { display: block; overflow: visible; }
    .rejilla { stroke: var(--grid); stroke-width: 1; }
    .eje { font-size: 11.5px; font-weight: 500; fill: var(--ink-3); font-variant-numeric: tabular-nums; }
    .eje--activo { fill: var(--ink); font-weight: 650; }
    .meta { stroke: var(--ok); stroke-width: 1.5; stroke-dasharray: 4 4; }
    .meta-texto { font-size: 11px; font-weight: 600; fill: var(--ok); }
    .linea { fill: none; stroke: var(--blue); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .linea--proy { stroke-dasharray: 6 6; stroke-width: 2; }
    .guia { stroke: var(--rule); stroke-width: 1; }
    .punto { fill: var(--paper); stroke: var(--blue); stroke-width: 3; }
    .punto--proy { fill: var(--paper); stroke: var(--blue-line); stroke-width: 3; }
    .etq { fill: var(--paper); stroke: var(--grid); filter: drop-shadow(0 2px 6px rgba(16, 24, 40, 0.12)); }
    .etq-t { font-size: 11.5px; font-weight: 650; fill: var(--ink); font-variant-numeric: tabular-nums; }
    .zona { fill: transparent; outline: none; }
    .zona:focus-visible { fill: var(--blue-wash); fill-opacity: 0.5; }
  `,
})
export class Flujo {
  readonly puntos = input.required<PuntoFlujo[]>();
  readonly meta = input<number | null>(null);

  protected readonly m = M;
  protected readonly alto = ALTO;
  protected readonly ancho = signal(0);
  protected readonly activo = signal<number | null>(null);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const ro = new ResizeObserver(([e]) => this.ancho.set(Math.floor(e.contentRect.width)));
      ro.observe(el);
      destroy.onDestroy(() => ro.disconnect());
    });
  }

  protected readonly g = computed(() => {
    const w = this.ancho();
    const datos = this.puntos();
    if (w < 160 || !datos.length) return null;
    const meta = this.meta();
    const ultimo = datos[datos.length - 1];
    const maxY = Math.max(...datos.map((p) => p.valor), ultimo.proyeccion ?? 0, meta ?? 0) * 1.15 || 1;
    const plotW = w - M.izquierda - M.derecha;
    const plotH = ALTO - M.arriba - M.abajo;
    const paso = datos.length > 1 ? plotW / (datos.length - 1) : 0;
    const x = (i: number) => (datos.length > 1 ? M.izquierda + i * paso : M.izquierda + plotW / 2);
    const y = (v: number) => M.arriba + plotH - (v / maxY) * plotH;

    const mag = 10 ** Math.floor(Math.log10(maxY / 4));
    const tick = Math.ceil(maxY / 4 / mag) * mag;
    const ticks = [];
    for (let v = 0; v <= maxY; v += tick) ticks.push({ y: y(v), texto: compacto(v) });

    const pts = datos.map((p, i) => {
      const px = x(i);
      return {
        ...p,
        i,
        x: px,
        y: y(p.valor),
        corto: compacto(p.valor),
        etqX: Math.min(Math.max(px, M.izquierda + 34), w - M.derecha - 34),
      };
    });
    const linea = curva(pts.map((p) => [p.x, p.y] as P));
    const base = ALTO - M.abajo;
    const area = pts.length > 1 ? `${linea} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z` : '';
    const ult = pts[pts.length - 1];
    const proy =
      ultimo.proyeccion && ultimo.proyeccion > ultimo.valor ? { x0: ult.x, y0: ult.y, x: ult.x, y: y(ultimo.proyeccion) } : null;
    return {
      ticks,
      pts,
      linea,
      area,
      proy,
      banda: Math.max(24, paso || plotW),
      foco: this.activo() ?? pts.length - 1,
      meta: meta ? { y: y(meta), texto: compacto(meta) } : null,
    };
  });

  protected readonly descripcion = computed(() =>
    this.puntos()
      .map((p) => `${p.etiqueta}: ${moneda(p.valor)}${p.proyeccion ? ` (proyección ${moneda(p.proyeccion)})` : ''}`)
      .join('; '),
  );

  pistaDe(i: number): ContenidoPista {
    const p = this.puntos()[i];
    const anterior = this.puntos()[i - 1];
    const lineas: LineaPista[] = [{ etiqueta: 'Venta', valor: moneda(p.valor), color: 'var(--blue)' }];
    if (p.proyeccion) lineas.push({ etiqueta: 'Proyección al cierre', valor: moneda(p.proyeccion), color: 'var(--blue-line)' });
    if (anterior?.valor) lineas.push({ etiqueta: 'Vs mes anterior', valor: pct((p.proyeccion ?? p.valor) / anterior.valor - 1) });
    const meta = this.meta();
    if (meta) lineas.push({ etiqueta: 'Avance vs meta', valor: pct((p.proyeccion ?? p.valor) / meta) });
    return { titulo: p.etiqueta, lineas };
  }
}
