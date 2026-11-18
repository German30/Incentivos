import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { FiltrosService } from '../core/filtros.service';
import { fechaCorta } from '../core/formato';
import { Icono } from '../shared/icono';

/** Fila única de filtros sobre todos los reportes: mes (o rango libre) y sucursal. */
@Component({
  selector: 'app-filtros',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fila" role="group" aria-label="Filtros del reporte">
      <div class="segmentado" role="radiogroup" aria-label="Tipo de periodo">
        <button type="button" role="radio" [attr.aria-checked]="f.modo() === 'mes'" (click)="f.modo.set('mes')">Mes</button>
        <button type="button" role="radio" [attr.aria-checked]="f.modo() === 'rango'" (click)="f.modo.set('rango')">Rango</button>
      </div>

      @if (f.modo() === 'mes') {
        <div class="mes">
          <button type="button" class="icono-btn" (click)="f.mover(-1)" [disabled]="!hayAnterior()" aria-label="Mes anterior">
            <app-icono nombre="izquierda" />
          </button>
          <label class="sr-only" for="filtro-mes">Mes</label>
          <select id="filtro-mes" class="entrada" [value]="f.mes() ?? ''" (change)="f.mes.set($any($event.target).value)"
                  [disabled]="!f.meses().length">
            @for (m of f.meses(); track m.valor) {
              <option [value]="m.valor" [selected]="m.valor === f.mes()">{{ m.etiqueta }}</option>
            } @empty {
              <option value="">Cargando…</option>
            }
          </select>
          <button type="button" class="icono-btn" (click)="f.mover(1)" [disabled]="!haySiguiente()" aria-label="Mes siguiente">
            <app-icono nombre="derecha" />
          </button>
        </div>
      } @else {
        <div class="rango">
          <label class="campo">
            <span>Desde</span>
            <input type="date" class="entrada" [value]="f.inicio() ?? ''" [min]="minimo()" [max]="f.fin() ?? maximo()"
                   (change)="cambiarInicio($any($event.target).value)" />
          </label>
          <label class="campo">
            <span>Hasta</span>
            <input type="date" class="entrada" [value]="f.fin() ?? ''" [min]="f.inicio() ?? minimo()" [max]="maximo()"
                   (change)="cambiarFin($any($event.target).value)" />
          </label>
        </div>
      }

      <label class="campo sucursal">
        <span class="sr-only">Sucursal</span>
        <select class="entrada" [value]="f.sucursal() ?? ''" (change)="f.sucursal.set($any($event.target).value || null)"
                aria-label="Sucursal">
          <option value="" [selected]="!f.sucursal()">Todas las sucursales</option>
          @for (s of f.sucursales(); track s) {
            <option [value]="s" [selected]="s === f.sucursal()">{{ s }}</option>
          }
        </select>
      </label>

      @if (f.rango(); as r) {
        <p class="datos muted"><app-icono nombre="calendario" [tam]="16" />Datos del {{ fecha(r.primera_venta) }} al {{ fecha(r.ultima_venta) }}</p>
      }
    </div>
  `,
  styles: `
    .fila { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
    .mes { display: flex; align-items: center; gap: 4px; }
    .mes select { width: 12.5rem; text-transform: capitalize; }
    .mes .icono-btn { width: 36px; height: 36px; border-color: var(--rule); background: var(--paper); }
    .mes .icono-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .rango { display: flex; gap: 8px; }
    .rango .campo { grid-template-columns: auto 1fr; align-items: center; gap: 8px; }
    .rango input { width: 10.5rem; }
    .sucursal select { width: 13rem; }
    .datos { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; font-size: 0.8125rem; }
    @media (max-width: 720px) {
      .mes { flex: 1; }
      .mes select { flex: 1; width: auto; }
      .rango { width: 100%; flex-direction: column; }
      .rango input { width: 100%; }
      .sucursal { width: 100%; }
      .sucursal select { width: 100%; }
      .datos { margin-left: 0; }
    }
  `,
})
export class Filtros {
  protected readonly f = inject(FiltrosService);
  protected readonly fecha = fechaCorta;

  protected readonly indice = computed(() => this.f.meses().findIndex((m) => m.valor === this.f.mes()));
  protected readonly hayAnterior = computed(() => this.indice() >= 0 && this.indice() < this.f.meses().length - 1);
  protected readonly haySiguiente = computed(() => this.indice() > 0);
  protected readonly minimo = computed(() => this.f.rango()?.primera_venta?.slice(0, 10) ?? '');
  protected readonly maximo = computed(() => this.f.rango()?.ultima_venta?.slice(0, 10) ?? '');

  cambiarInicio(valor: string): void {
    if (valor) this.f.inicio.set(valor);
  }

  cambiarFin(valor: string): void {
    if (valor) this.f.fin.set(valor);
  }
}
