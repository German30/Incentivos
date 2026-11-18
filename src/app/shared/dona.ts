import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { moneda, pct } from '../core/formato';
import { ContenidoPista, Pista } from './pista';
import { Segmento } from './mezcla';

const R = 52;
const GROSOR = 22;
const CIRC = 2 * Math.PI * R;
const AIRE = 2; // px de superficie entre tramos

/** Dona de parte-a-todo (≤ 6 tramos) con leyenda; el centro dice qué suma el anillo. */
@Component({
  selector: 'app-dona',
  imports: [Pista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cuerpo">
      <svg viewBox="0 0 140 140" role="img" [attr.aria-label]="descripcion()" (mouseleave)="activo.set(null)">
        <circle class="riel" cx="70" cy="70" [attr.r]="r" [attr.stroke-width]="grosor" />
        @for (t of tramos(); track t.clave) {
          <circle class="tramo" cx="70" cy="70" [attr.r]="r" [attr.stroke-width]="grosor" [attr.stroke]="t.color"
                  [attr.stroke-dasharray]="t.largo + ' ' + circ" [attr.stroke-dashoffset]="-t.inicio"
                  [class.tenue]="activo() && activo() !== t.clave" tabindex="0"
                  (mouseenter)="activo.set(t.clave)" (focus)="activo.set(t.clave)" [appPista]="pistaDe(t.clave)" />
        }
        <text class="centro-v" x="70" y="68" text-anchor="middle">{{ centroValor() }}</text>
        <text class="centro-e" x="70" y="86" text-anchor="middle">{{ centroEtiqueta() }}</text>
      </svg>
      <ul class="leyenda">
        @for (s of filas(); track s.clave) {
          <li [class.tenue]="activo() && activo() !== s.clave" (mouseenter)="activo.set(s.clave)" (mouseleave)="activo.set(null)">
            <i [style.background]="s.color"></i>
            <span class="nombre">{{ s.etiqueta }}</span>
            <span class="num pct">{{ s.pct }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .cuerpo { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 20px; }
    svg { width: 150px; height: 150px; transform: rotate(-90deg); overflow: visible; }
    svg text { transform: rotate(90deg); transform-origin: 70px 70px; }
    .riel { fill: none; stroke: var(--grid); }
    .tramo { fill: none; transition: opacity 160ms var(--ease); outline: none; cursor: default; }
    .tramo:focus-visible { stroke-width: 26; }
    .tenue { opacity: 0.3; }
    .centro-v { font-size: 17px; font-weight: 700; fill: var(--ink); letter-spacing: -0.02em; }
    .centro-e { font-size: 9px; font-weight: 500; fill: var(--ink-3); }
    .leyenda { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    li { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 10px; font-size: 0.875rem; color: var(--ink-2); transition: opacity 160ms var(--ease); }
    li i { width: 10px; height: 10px; border-radius: 50%; }
    .pct { font-weight: 650; color: var(--ink); }
    @media (max-width: 420px) {
      .cuerpo { grid-template-columns: 1fr; justify-items: center; }
      .leyenda { width: 100%; }
    }
  `,
})
export class Dona {
  readonly segmentos = input.required<Segmento[]>();
  readonly centroValor = input('');
  readonly centroEtiqueta = input('');

  protected readonly r = R;
  protected readonly grosor = GROSOR;
  protected readonly circ = CIRC;
  protected readonly activo = signal<string | null>(null);

  private readonly total = computed(() => this.segmentos().reduce((a, s) => a + s.valor, 0));

  protected readonly filas = computed(() =>
    this.segmentos().map((s) => ({ ...s, pct: pct(this.total() ? s.valor / this.total() : 0) })),
  );

  protected readonly tramos = computed(() => {
    const total = this.total();
    if (!total) return [];
    const visibles = this.segmentos().filter((s) => s.valor > 0);
    const aire = visibles.length > 1 ? AIRE : 0;
    let inicio = 0;
    return visibles.map((s) => {
      const arco = (s.valor / total) * CIRC;
      const t = { clave: s.clave, color: s.color, inicio, largo: Math.max(0.5, arco - aire) };
      inicio += arco;
      return t;
    });
  });

  protected readonly descripcion = computed(() => this.filas().map((s) => `${s.etiqueta} ${s.pct}`).join(', '));

  pistaDe(clave: string): ContenidoPista | null {
    const s = this.filas().find((f) => f.clave === clave);
    return s ? { titulo: s.etiqueta, lineas: [{ etiqueta: 'Venta', valor: moneda(s.valor), color: s.color }, { etiqueta: 'Participación', valor: s.pct }] } : null;
  }
}
