import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { moneda, pct } from '../core/formato';
import { ContenidoPista, Pista } from './pista';

export interface Segmento {
  clave: string;
  etiqueta: string;
  valor: number;
  color: string;
}

/**
 * Parte de un total en una barra segmentada redondeada, con 2px de aire entre tramos.
 * Lo que no pertenece a ningún segmento queda como riel gris (“resto”).
 */
@Component({
  selector: 'app-mezcla',
  imports: [Pista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barra" role="img" [attr.aria-label]="descripcion()" (mouseleave)="activo.set(null)">
      @for (s of filas(); track s.clave) {
        @if (s.fraccion > 0) {
          <span class="tramo" [style.flex-grow]="s.fraccion" [style.background]="s.color"
                [class.tenue]="activo() && activo() !== s.clave" (mouseenter)="activo.set(s.clave)"
                [appPista]="pistaDe(s.clave)"></span>
        }
      }
      @if (conResto() && resto().fraccion > 0) {
        <span class="tramo tramo--resto" [style.flex-grow]="resto().fraccion"
              [class.tenue]="activo() && activo() !== 'resto'" (mouseenter)="activo.set('resto')"
              [appPista]="pistaDe('resto')"></span>
      }
    </div>
    <ul class="leyenda">
      @for (s of filas(); track s.clave) {
        <li [class.tenue]="activo() && activo() !== s.clave" (mouseenter)="activo.set(s.clave)" (mouseleave)="activo.set(null)">
          <i [style.background]="s.color"></i>
          <span class="nombre">{{ s.etiqueta }}</span>
          <span class="num monto">{{ s.monto }}</span>
          <span class="num pct">{{ s.pct }}</span>
        </li>
      }
      @if (conResto()) {
        <li class="resto" [class.tenue]="activo() && activo() !== 'resto'" (mouseenter)="activo.set('resto')" (mouseleave)="activo.set(null)">
          <i></i>
          <span class="nombre">{{ etiquetaResto() }}</span>
          <span class="num monto">{{ resto().monto }}</span>
          <span class="num pct">{{ resto().pct }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: grid; gap: 16px; }
    .barra { display: flex; gap: 2px; height: 14px; border-radius: 999px; overflow: hidden; background: var(--grid); }
    .tramo { flex-basis: 0; min-width: 4px; transition: opacity 160ms var(--ease); }
    .tramo--resto { background: var(--grid); }
    .tenue { opacity: 0.35; }
    .leyenda { display: grid; margin: 0; padding: 0; list-style: none; }
    li {
      display: grid; grid-template-columns: 10px 1fr auto 4rem; align-items: center; gap: 10px;
      padding: 8px 0; border-bottom: 1px solid var(--grid); font-size: 0.875rem;
      transition: opacity 160ms var(--ease);
    }
    li:last-child { border-bottom: 0; }
    li i { width: 10px; height: 10px; border-radius: 50%; }
    .resto i { background: var(--rule); }
    .monto { color: var(--ink-2); }
    .pct { text-align: right; font-weight: 650; }
  `,
})
export class Mezcla {
  readonly segmentos = input.required<Segmento[]>();
  readonly total = input.required<number>();
  readonly etiquetaResto = input('Resto de la venta');
  /** Conservado por compatibilidad con la versión en celdas. */
  readonly columnas = input(20);
  readonly conResto = input(true);

  protected readonly activo = signal<string | null>(null);

  protected readonly filas = computed(() =>
    this.segmentos().map((s) => {
      const fraccion = this.total() ? s.valor / this.total() : 0;
      return { ...s, fraccion, monto: moneda(s.valor), pct: pct(fraccion) };
    }),
  );

  protected readonly resto = computed(() => {
    const usado = this.segmentos().reduce((a, s) => a + s.valor, 0);
    const r = Math.max(0, this.total() - usado);
    const fraccion = this.total() ? r / this.total() : 0;
    return { valor: r, fraccion, monto: moneda(r), pct: pct(fraccion) };
  });

  protected readonly descripcion = computed(() => {
    const partes = this.filas().map((s) => `${s.etiqueta} ${s.pct}`);
    if (this.conResto()) partes.push(`${this.etiquetaResto()} ${this.resto().pct}`);
    return partes.join(', ');
  });

  pistaDe(clave: string): ContenidoPista | null {
    if (clave === 'resto') {
      const r = this.resto();
      return { titulo: this.etiquetaResto(), lineas: [{ etiqueta: 'Venta', valor: r.monto }, { etiqueta: 'Del total', valor: r.pct }] };
    }
    const s = this.filas().find((f) => f.clave === clave);
    return s
      ? { titulo: s.etiqueta, lineas: [{ etiqueta: 'Venta', valor: s.monto, color: s.color }, { etiqueta: 'Del total', valor: s.pct }] }
      : null;
  }
}
