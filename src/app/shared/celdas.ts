import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { moneda, pct } from '../core/formato';
import { ContenidoPista, LineaPista, Pista } from './pista';

/**
 * Barra de avance contra meta: el riel completo es la meta, la venta llena en azul
 * (verde al cumplir) y la proyección al cierre se ve como tramo claro por delante.
 */
@Component({
  selector: 'app-celdas',
  imports: [Pista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta()) {
      <div class="medidor" [class]="'medidor--' + tam()" tabindex="0" role="img" [attr.aria-label]="descripcion()" [appPista]="pista()">
        <div class="riel">
          @if (avanceProyectado() > avance()) {
            <i class="p" [style.width.%]="min1(avanceProyectado()) * 100"></i>
          }
          <i class="v" [class.v--cumple]="cumple()" [style.width.%]="min1(avance()) * 100"></i>
        </div>
        @if (excedente(); as e) {
          <span class="excedente num" [title]="'Rebasa la meta en ' + e">+{{ e }}</span>
        }
      </div>
    } @else {
      <span class="sin-meta">Sin meta</span>
    }
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .medidor { display: flex; align-items: center; gap: 8px; border-radius: 999px; outline-offset: 4px; }
    .riel { position: relative; flex: 1; min-width: 0; height: 8px; border-radius: 999px; background: var(--grid); overflow: hidden; }
    .medidor--grande .riel { height: 10px; }
    .medidor--chico .riel { height: 6px; }
    .riel i { position: absolute; inset: 0 auto 0 0; border-radius: 999px; }
    .v { background: var(--blue); }
    .v--cumple { background: var(--ok); }
    .p { background: var(--blue-line); }
    .excedente { flex: none; font-size: 0.75rem; font-weight: 650; color: var(--ok); }
    .sin-meta { font-size: 0.8125rem; color: var(--ink-3); }
  `,
})
export class Celdas {
  readonly venta = input.required<number>();
  readonly meta = input<number | null>(null);
  readonly proyeccion = input<number | null>(null);
  /** Conservado por compatibilidad: la barra ya no se divide en celdas. */
  readonly celdas = input(20);
  readonly tam = input<'chico' | 'normal' | 'grande'>('normal');
  readonly titulo = input('Avance');

  protected readonly min1 = (n: number) => Math.min(1, Math.max(0, n));

  protected readonly avance = computed(() => {
    const m = this.meta();
    return m ? this.venta() / m : 0;
  });

  protected readonly avanceProyectado = computed(() => {
    const m = this.meta();
    const p = this.proyeccion();
    return m && p != null ? p / m : 0;
  });

  protected readonly cumple = computed(() => this.avance() >= 1);

  protected readonly excedente = computed(() => {
    const a = Math.max(this.avance(), this.avanceProyectado());
    return a > 1 ? pct(a - 1) : null;
  });

  protected readonly descripcion = computed(() => {
    const partes = [`${this.titulo()}: ${moneda(this.venta())} de ${moneda(this.meta())}`, `${pct(this.avance())} de la meta`];
    if (this.proyeccion() != null) partes.push(`proyección ${moneda(this.proyeccion())}`);
    return partes.join(', ');
  });

  protected readonly pista = computed<ContenidoPista>(() => {
    const meta = this.meta() ?? 0;
    const lineas: LineaPista[] = [
      { etiqueta: 'Venta', valor: moneda(this.venta()), color: this.cumple() ? 'var(--ok)' : 'var(--blue)' },
      { etiqueta: 'Meta', valor: moneda(meta) },
      { etiqueta: 'Avance', valor: pct(this.avance()) },
    ];
    const p = this.proyeccion();
    if (p != null) lineas.push({ etiqueta: 'Proyección al cierre', valor: `${moneda(p)} · ${pct(this.avanceProyectado())}`, color: 'var(--blue-line)' });
    const falta = meta - this.venta();
    lineas.push(falta > 0 ? { etiqueta: 'Falta', valor: moneda(falta) } : { etiqueta: 'Excedente', valor: moneda(-falta) });
    return { titulo: this.titulo(), lineas };
  });
}
