import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ResumenSucursal } from '../core/api.models';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FiltrosService } from '../core/filtros.service';
import { entero, fechaHora, hace, moneda, pct, pctEntero, periodoTexto } from '../core/formato';
import { recurso } from '../core/recurso';
import { Celdas } from '../shared/celdas';
import { Estado } from '../shared/estado';
import { Falla, Vacio } from '../shared/estados';
import { Icono } from '../shared/icono';
import { ContenidoPista, Pista } from '../shared/pista';

type Orden = 'proyectado' | 'venta' | 'sucursal';

@Component({
  selector: 'app-sucursales',
  imports: [Celdas, Estado, Falla, Vacio, Icono, Pista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <h1>Sucursales</h1>
      @if (resumen.valor(); as r) {
        <p class="muted"><span class="periodo">{{ periodo() }}</span> · venta contra meta global y bono por proyección</p>
      }
    </header>

    @if (auth.puede('sucursales')) {
      @if (resumen.error(); as e) {
        <app-falla [mensaje]="e" (reintentar)="resumen.recargar()" />
      }

      @if (resumen.inicial()) {
        <div class="esqueleto" style="height: 520px" aria-busy="true" aria-label="Cargando sucursales"></div>
      } @else if (resumen.valor(); as r) {
        @if (!r.sucursales.length) {
          <div class="plancha">
            <app-vacio titulo="Sin ventas en este periodo" texto="Ninguna sucursal registró tickets en el periodo elegido." />
          </div>
        } @else {
          <section class="plancha" [class.refrescando]="resumen.cargando()" aria-labelledby="t-carrera">
            <div class="plancha__cabeza cabeza">
              <h2 id="t-carrera" class="rotulo">Carrera a la meta global</h2>
              <div class="totales">
                <span><strong class="cifra">{{ totales().cumplen }}</strong>/{{ totales().conMeta }} proyectan cumplir</span>
                <span>Bono total <strong class="cifra">{{ moneda(totales().bono) }}</strong></span>
              </div>
            </div>

            <div class="leyenda muted" aria-hidden="true">
              <span><i class="l-venta"></i>Venta</span>
              <span><i class="l-cumple"></i>Venta que ya cumple</span>
              <span><i class="l-proy"></i>Proyección al cierre</span>
              <span>Barra completa = meta global</span>
            </div>

            <div class="orden">
              <span class="rotulo rotulo--tinta">Ordenar por</span>
              <div class="segmentado" role="radiogroup" aria-label="Ordenar sucursales">
                @for (o of ordenes; track o.valor) {
                  <button type="button" role="radio" [attr.aria-checked]="orden() === o.valor" (click)="orden.set(o.valor)">{{ o.texto }}</button>
                }
              </div>
            </div>

            <ol class="carrera">
              @for (s of filas(); track s.sucursal) {
                <li class="fila">
                  <div class="nombre">
                    <span class="clave">{{ s.sucursal }}</span>
                    <span class="muted chica num">{{ entero(s.no_tickets) }} tickets · {{ moneda(s.ticket_promedio) }} prom.</span>
                  </div>
                  <div class="principal">
                    <app-celdas [venta]="s.venta_global.venta" [meta]="s.venta_global.meta" [proyeccion]="s.proyeccion?.proyeccion ?? null"
                                tam="grande" [titulo]="'Venta global ' + s.sucursal" />
                    <p class="cifras num">
                      <span class="cifra">{{ moneda(s.venta_global.venta) }}</span>
                      @if (s.venta_global.meta) {
                        <span class="muted">de {{ moneda(s.venta_global.meta) }}</span>
                      }
                      @if (s.proyeccion && s.venta_global.meta) {
                        <span class="proy">→ {{ pctEntero(s.proyeccion.proyeccion / s.venta_global.meta) }} proyectado</span>
                      }
                    </p>
                  </div>
                  <div class="bono" [appPista]="pistaBono(s)" tabindex="0">
                    <app-estado [cumple]="s.cumple_meta_proyectada" si="Bono" no="Sin bono" nulo="Sin proyección" />
                    @if (s.bono_venta_global) {
                      <span class="cifra monto-bono">{{ moneda(s.bono_venta_global) }}</span>
                    }
                  </div>
                  <div class="secundario">
                    <span class="rotulo rotulo--tinta">5 SKUs</span>
                    <app-celdas [venta]="s.skus_5.venta" [meta]="s.skus_5.meta" [celdas]="10" tam="chico" [titulo]="'5 SKUs ' + s.sucursal" />
                    <span class="num chica">{{ s.skus_5.meta ? pctEntero(s.skus_5.avance) : moneda(s.skus_5.venta) }}</span>
                  </div>
                  <div class="secundario">
                    <span class="rotulo rotulo--tinta">Cero faltante</span>
                    <app-celdas [venta]="s.cero_faltante.venta" [meta]="s.cero_faltante.meta" [celdas]="10" tam="chico" [titulo]="'Cero faltante ' + s.sucursal" />
                    <span class="num chica">{{ s.cero_faltante.meta ? pctEntero(s.cero_faltante.avance) : moneda(s.cero_faltante.venta) }}</span>
                  </div>
                </li>
              }
            </ol>
            @if (sinMeta() > 0 && auth.puede('configuracion')) {
              <p class="nota muted">{{ sinMeta() }} sucursal(es) sin meta global: no pueden ganar bono. Defínala en Configuración → Metas.</p>
            }
          </section>
        }
      }
    }

    @if (auth.puede('sincronizacion')) {
      <section class="plancha" aria-labelledby="t-sinc">
        <div class="plancha__cabeza">
          <h2 id="t-sinc" class="rotulo">Sincronización con SICAR</h2>
          <button type="button" class="btn btn--chico" (click)="sinc.recargar()" [disabled]="sinc.cargando()">
            <app-icono nombre="recargar" [tam]="16" /> Actualizar
          </button>
        </div>
        @if (sinc.error(); as e) {
          <div class="plancha__cuerpo"><app-falla [mensaje]="e" (reintentar)="sinc.recargar()" /></div>
        } @else if (sinc.inicial()) {
          <div class="esqueleto" style="height: 240px"></div>
        } @else {
          <div class="tabla-marco">
            <table class="tabla">
              <thead>
                <tr>
                  <th scope="col">Sucursal</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Última consulta replicada</th>
                  <th scope="col">Última venta</th>
                </tr>
              </thead>
              <tbody>
                @for (s of sinc.valor(); track s.sucursal) {
                  <tr>
                    <th scope="row" class="clave-tabla">{{ s.sucursal }}</th>
                    <td><app-estado [cumple]="alDia(s.ultima_consulta)" si="Al día" no="Retrasada" nulo="Sin registro" /></td>
                    <td><span class="num">{{ fechaHora(s.ultima_consulta) }}</span> <span class="muted">· {{ hace(s.ultima_consulta) }}</span></td>
                    <td class="num">{{ fechaHora(s.ultima_venta) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="muted">No hay registros de sincronización.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="nota muted">“Retrasada” significa más de 24 horas sin replicar desde la sucursal; sus reportes pueden estar incompletos.</p>
        }
      </section>
    }
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .cabecera { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 20px; }
    h1 { font-size: 1.625rem; }
    .periodo { text-transform: capitalize; color: var(--ink); font-weight: 600; }
    .refrescando { opacity: 0.55; transition: opacity 200ms var(--ease); }
    .cabeza { flex-wrap: wrap; }
    .totales { display: flex; flex-wrap: wrap; gap: 20px; font-size: 0.875rem; color: var(--ink-2); }
    .totales strong { font-size: 1.125rem; color: var(--ink); }
    .leyenda { display: flex; flex-wrap: wrap; gap: 8px 20px; padding: 14px 20px 0; font-size: 0.8125rem; }
    .leyenda span { display: inline-flex; align-items: center; gap: 6px; }
    .leyenda i { width: 10px; height: 10px; border-radius: 50%; }
    .l-venta { background: var(--blue); }
    .l-cumple { background: var(--ok); }
    .l-proy { background: var(--blue-line); }
    .orden { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; padding: 14px 20px 6px; }
    .orden .rotulo { margin-right: 6px; }
    .carrera { margin: 0; padding: 0 20px 8px; list-style: none; }
    .fila {
      display: grid; grid-template-columns: 10.5rem minmax(16rem, 1fr) 9rem 11rem 11rem; align-items: center; gap: 12px 24px;
      padding: 18px 0; border-bottom: 1px solid var(--grid); }
    .nombre { display: grid; gap: 2px; }
    .clave { font-size: 1.375rem; font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; }
    .chica { font-size: 0.75rem; }
    .principal { display: grid; gap: 8px; min-width: 0; }
    .cifras { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 0.875rem; }
    .cifras .cifra { font-size: 1.125rem; }
    .proy { color: var(--blue); font-weight: 600; }
    .bono { display: grid; gap: 4px; justify-items: start; outline-offset: 4px; }
    .monto-bono { font-size: 1.25rem; color: var(--blue); }
    .secundario { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; align-items: center; }
    .secundario .rotulo { grid-column: 1 / -1; font-size: 0.6875rem; }
    .nota { padding: 12px 20px 16px; font-size: 0.8125rem; }
    .clave-tabla { font-weight: 700; text-align: left; }
    @media (max-width: 1200px) {
      .fila { grid-template-columns: 7rem minmax(0, 1fr) 8rem; }
      .secundario { grid-column: span 1; }
      .fila .secundario:first-of-type { grid-column: 2; }
    }
    @media (max-width: 720px) {
      h1 { font-size: 1.375rem; }
      .carrera { padding: 0 16px 8px; }
      .fila { grid-template-columns: 1fr auto; }
      .principal { grid-column: 1 / -1; grid-row: 2; }
      .bono { grid-column: 2; grid-row: 1; justify-items: end; }
      .fila .secundario, .fila .secundario:first-of-type { grid-column: span 1; }
      .leyenda, .orden { padding-left: 16px; padding-right: 16px; }
    }
  `,
})
export class Sucursales {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  private readonly f = inject(FiltrosService);

  protected readonly moneda = moneda;
  protected readonly pct = pct;
  protected readonly pctEntero = pctEntero;
  protected readonly entero = entero;
  protected readonly fechaHora = fechaHora;
  protected readonly hace = (v: string | null) => hace(v);
  protected readonly ordenes: { valor: Orden; texto: string }[] = [
    { valor: 'proyectado', texto: '% proyectado' },
    { valor: 'venta', texto: 'Venta' },
    { valor: 'sucursal', texto: 'Clave' },
  ];
  protected readonly orden = signal<Orden>('proyectado');

  protected readonly resumen = recurso(
    () => (this.auth.puede('sucursales') ? this.f.filtro() : undefined),
    (filtro) => this.api.resumenSucursales(filtro),
  );

  protected readonly sinc = recurso(
    () => (this.auth.puede('sincronizacion') ? true : undefined),
    () => this.api.sincronizacion(),
  );

  protected readonly periodo = computed(() => {
    const p = this.resumen.valor()?.periodo;
    return p ? periodoTexto(p.fecha_inicio, p.fecha_fin) : ''; });

  protected readonly filas = computed(() => {
    const lista = [...(this.resumen.valor()?.sucursales ?? [])];
    const proyectado = (s: ResumenSucursal) =>
      s.venta_global.meta ? (s.proyeccion?.proyeccion ?? s.venta_global.venta) / s.venta_global.meta : -1;
    switch (this.orden()) {
      case 'proyectado':
        return lista.sort((a, b) => proyectado(b) - proyectado(a));
      case 'venta':
        return lista.sort((a, b) => b.venta_global.venta - a.venta_global.venta);
      default:
        return lista.sort((a, b) => a.sucursal.localeCompare(b.sucursal)); }
  });

  protected readonly totales = computed(() => {
    const lista = this.resumen.valor()?.sucursales ?? [];
    return {
      cumplen: lista.filter((s) => s.cumple_meta_proyectada).length,
      conMeta: lista.filter((s) => s.venta_global.meta).length,
      bono: lista.reduce((a, s) => a + s.bono_venta_global, 0),
    }; });

  protected readonly sinMeta = computed(() => (this.resumen.valor()?.sucursales ?? []).filter((s) => !s.venta_global.meta).length);

  alDia(valor: string | null): boolean | null {
    if (!valor) return null;
    return Date.now() - new Date(valor).getTime() < 24 * 3600 * 1000; }

  pistaBono(s: ResumenSucursal): ContenidoPista {
    const lineas = [];
    if (s.proyeccion) lineas.push({ etiqueta: 'Proyección al cierre', valor: moneda(s.proyeccion.proyeccion) });
    lineas.push({ etiqueta: 'Meta global', valor: moneda(s.venta_global.meta) });
    lineas.push({ etiqueta: 'Bono', valor: moneda(s.bono_venta_global) });
    return { titulo: `Bono venta global · ${s.sucursal}`, lineas }; }
}
