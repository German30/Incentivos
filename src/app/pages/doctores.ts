import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ComisionDoctor, ResumenCategoriaDoctor } from '../core/api.models';
import { ApiService } from '../core/api.service';
import { FiltrosService } from '../core/filtros.service';
import { decimal, entero, moneda, monedaCentavos, pct, periodoTexto, titulo } from '../core/formato';
import { recurso } from '../core/recurso';
import { Falla, Vacio } from '../shared/estados';
import { Icono } from '../shared/icono';
import { Mezcla, Segmento } from '../shared/mezcla';
import { ContenidoPista, Pista } from '../shared/pista';

type Orden = 'venta' | 'monto_comision' | 'doctor' | 'cantidad';
const PAGINA = 40;

@Component({
  selector: 'app-doctores',
  imports: [Falla, Vacio, Icono, Pista, Mezcla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <h1>Doctores</h1>
      @if (datos.valor(); as d) {
        <p class="muted"><span class="periodo">{{ periodo() }}</span> · venta y comisión por categoría de doctor</p>
      }
      <label class="casilla publico">
        <input type="checkbox" [checked]="publico()" (change)="publico.set($any($event.target).checked)" />
        Incluir “Público en General”
      </label>
    </header>

    @if (datos.error(); as e) {
      <app-falla [mensaje]="e" (reintentar)="datos.recargar()" />
    }

    @if (datos.inicial()) {
      <div class="esqueleto" style="height: 420px" aria-busy="true" aria-label="Cargando comisiones"></div>
    } @else if (datos.valor(); as d) {
      @if (!d.comisiones.comisiones.length) {
        <div class="plancha">
          <app-vacio titulo="Sin ventas de doctores en este periodo"
                     texto="No hay ventas asociadas a doctores para el periodo y la sucursal elegidos." />
        </div>
      } @else {
        <div class="reticula" [class.refrescando]="datos.cargando()">
          <section class="plancha heroe" aria-labelledby="t-total">
            <div class="plancha__cabeza"><h2 id="t-total" class="rotulo">Comisión del periodo</h2></div>
            <div class="plancha__cuerpo">
              <p class="cifra grande">{{ moneda(d.comisiones.total_comision) }}</p>
              <p class="muted sub">
                sobre <strong class="cifra">{{ moneda(d.comisiones.total_venta) }}</strong> de venta ·
                tasa efectiva <strong class="cifra">{{ pct(tasa(d.comisiones.total_comision, d.comisiones.total_venta)) }}</strong>
              </p>
              <h3 class="rotulo rotulo--tinta sub-t">¿Qué venta genera comisión?</h3>
              <app-mezcla [segmentos]="cobertura()" [total]="d.comisiones.total_venta" [columnas]="20" [conResto]="false" />
              <p class="muted nota">
                {{ entero(doctoresUnicos()) }} doctores en {{ d.resumen.categorias.length }} categorías.
                @if (sinRegla() > 0) {
                  {{ entero(sinRegla()) }} renglones no alcanzan ninguna regla de comisión para su rango de venta.
                }
              </p>
            </div>
          </section>

          <section class="plancha categorias" aria-labelledby="t-cat">
            <div class="plancha__cabeza">
              <h2 id="t-cat" class="rotulo">Por categoría</h2>
              <span class="leyenda muted"><i class="l-venta"></i>Venta <i class="l-com"></i>Comisión (dentro de la venta)</span>
            </div>
            <ol class="lista-cat">
              @for (c of d.resumen.categorias; track c.categoria_doctor) {
                <li>
                  <button type="button" class="cat" [class.cat--activa]="categoria() === c.categoria_doctor"
                          [attr.aria-pressed]="categoria() === c.categoria_doctor"
                          (click)="alternarCategoria(c.categoria_doctor)" [appPista]="pistaCategoria(c)">
                    <span class="cat-nombre">{{ nombre(c.categoria_doctor) }}</span>
                    <span class="cat-doc muted num">{{ c.doctores }} doc.</span>
                    <span class="cat-barra">
                      <span class="b-venta" [style.width.%]="(c.venta / maxVenta()) * 100">
                        <span class="b-com" [style.width.%]="c.venta ? (c.monto_comision / c.venta) * 100 : 0"></span>
                      </span>
                    </span>
                    <span class="cat-venta num">{{ moneda(c.venta) }}</span>
                    <span class="cat-com num">{{ moneda(c.monto_comision) }}</span>
                  </button>
                </li>
              }
            </ol>
          </section>

          <section class="plancha col-12" aria-labelledby="t-tabla">
            <div class="plancha__cabeza cabeza-tabla">
              <h2 id="t-tabla" class="rotulo">Comisiones por doctor</h2>
              @if (categoria(); as c) {
                <button type="button" class="filtro-activo" (click)="categoria.set(null)">
                  {{ nombre(c) }} <app-icono nombre="cerrar" [tam]="14" /><span class="sr-only">Quitar filtro de categoría</span>
                </button>
              }
            </div>
            <div class="herramientas">
              <label class="buscar">
                <app-icono nombre="buscar" [tam]="18" />
                <span class="sr-only">Buscar doctor</span>
                <input class="entrada" type="search" placeholder="Buscar doctor" [value]="busqueda()"
                       (input)="busqueda.set($any($event.target).value); limite.set(pagina)" />
              </label>
              <span class="muted chica">{{ entero(filas().length) }} renglones</span>
            </div>
            <div class="tabla-marco">
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col"><button type="button" class="orden" (click)="ordenar('doctor')" [attr.aria-sort]="aria('doctor')">Doctor <app-icono nombre="ordenar" [tam]="14" /></button></th>
                    <th scope="col" class="c-cat">Categoría</th>
                    <th scope="col" class="der c-opc"><button type="button" class="orden" (click)="ordenar('cantidad')" [attr.aria-sort]="aria('cantidad')">Cantidad <app-icono nombre="ordenar" [tam]="14" /></button></th>
                    <th scope="col" class="der c-opc">Tickets</th>
                    <th scope="col" class="der"><button type="button" class="orden" (click)="ordenar('venta')" [attr.aria-sort]="aria('venta')">Venta <app-icono nombre="ordenar" [tam]="14" /></button></th>
                    <th scope="col" class="der c-opc">Regla</th>
                    <th scope="col" class="der"><button type="button" class="orden" (click)="ordenar('monto_comision')" [attr.aria-sort]="aria('monto_comision')">Comisión <app-icono nombre="ordenar" [tam]="14" /></button></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of visibles(); track c.doctor + c.categoria_doctor) {
                    <tr>
                      <th scope="row" class="doctor">{{ c.doctor }}<span class="cat-movil muted">{{ nombre(c.categoria_doctor) }}</span></th>
                      <td class="muted c-cat">{{ nombre(c.categoria_doctor) }}</td>
                      <td class="der c-opc">{{ decimal(c.cantidad) }}</td>
                      <td class="der c-opc">{{ entero(c.no_tickets) }}</td>
                      <td class="der venta">
                        <span class="mini" aria-hidden="true"><i [style.width.%]="(c.venta / maxFila()) * 100"></i></span>
                        {{ moneda(c.venta) }}
                      </td>
                      <td class="der muted c-opc">{{ regla(c) }}</td>
                      <td class="der fuerte">{{ monedaCentavos(c.monto_comision) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="muted">Ningún doctor coincide con la búsqueda.</td></tr>
                  }
                </tbody>
                @if (filas().length) {
                  <tfoot>
                    <tr>
                      <td>Total {{ categoria() ? nombre(categoria()!) : '' }}</td>
                      <td class="c-cat"></td>
                      <td class="c-opc"></td>
                      <td class="c-opc"></td>
                      <td class="der">{{ moneda(sumaVenta()) }}</td>
                      <td class="c-opc"></td>
                      <td class="der">{{ monedaCentavos(sumaComision()) }}</td>
                    </tr>
                  </tfoot>
                }
              </table>
            </div>
            @if (filas().length > limite()) {
              <div class="mas">
                <button type="button" class="btn btn--chico" (click)="limite.set(limite() + pagina)">
                  Mostrar {{ entero(Math.min(pagina, filas().length - limite())) }} más
                </button>
              </div>
            }
          </section>
        </div>
      }
    }
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .cabecera { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 20px; }
    .publico { margin-left: auto; font-size: 0.875rem; }
    h1 { font-size: 1.625rem; }
    .periodo { text-transform: capitalize; color: var(--ink); font-weight: 600; }
    .reticula { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: start; gap: var(--gap); transition: opacity 200ms var(--ease); }
    .refrescando { opacity: 0.55; }
    .col-12 { grid-column: 1 / -1; }
    .grande { font-size: 2.5rem; }
    .sub { margin: 10px 0 20px; }
    .sub strong { color: var(--ink); font-size: 1.0625rem; }
    .libro { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; border-top: 1px solid var(--grid); }
    .libro > div { padding: 14px 16px 0 0; }
    .libro > div + div { padding-left: 16px; border-left: 1px solid var(--grid); }
    dt { font-size: 0.75rem; color: var(--ink-3); }
    dd { margin: 6px 0 0; font-size: 1.375rem; }
    .nota { margin-top: 14px; font-size: 0.8125rem; }
    .sub-t { margin: 0 0 12px; padding-top: 16px; border-top: 1px solid var(--grid); font-size: 0.8125rem; font-weight: 600; color: var(--ink-2); }
    .leyenda { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; }
    .leyenda i { width: 10px; height: 10px; border-radius: 50%; }
    .leyenda i + * { margin-right: 8px; }
    .l-venta { background: var(--s-18); }
    .l-com { background: var(--s-5); margin-left: 10px; }
    .lista-cat { margin: 0; padding: 8px 20px 16px; list-style: none; }
    .cat {
      display: grid; grid-template-columns: 10rem 3.5rem 1fr 7rem 6.5rem; align-items: center; gap: 12px;
      width: 100%; min-height: 44px; padding: 6px 0; border: 0; border-bottom: 1px solid var(--grid);
      background: transparent; text-align: left; cursor: pointer; transition: background-color 120ms var(--ease); }
    .cat:hover { background: var(--sunken); }
    .cat--activa { background: var(--blue-wash); }
    .cat-nombre { font-size: 0.875rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cat-doc { font-size: 0.75rem; }
    .cat-barra { height: 10px; border-radius: 999px; background: var(--grid); overflow: hidden; }
    .b-venta { display: flex; gap: 2px; height: 100%; border-radius: 999px; background: var(--s-18); overflow: hidden; }
    .b-com { display: block; height: 100%; min-width: 3px; background: var(--s-5); }
    .cat-venta, .cat-com { text-align: right; font-size: 0.875rem; }
    .cat-com { color: var(--ink); font-weight: 650; }
    .cabeza-tabla { align-items: center; }
    .filtro-activo {
      display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 8px 0 10px;
      border: 0; border-radius: 999px; background: var(--blue-wash); color: var(--blue); cursor: pointer;
      font-size: 0.75rem; font-weight: 600; }
    .filtro-activo:hover { background: var(--blue-line); }
    .herramientas { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 16px 20px 8px; }
    .buscar { position: relative; flex: 0 1 22rem; }
    .buscar app-icono { position: absolute; left: 12px; top: 11px; color: var(--ink-3); }
    .buscar input { padding-left: 38px; }
    .chica { font-size: 0.8125rem; }
    .orden {
      display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; cursor: pointer;
      font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; }
    .orden:hover, .orden[aria-sort='descending'], .orden[aria-sort='ascending'] { color: var(--blue); }
    .doctor { text-align: left; font-weight: 500; min-width: 14rem; }
    .cat-movil { display: none; }
    .venta { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
    .mini { display: inline-block; width: 64px; height: 6px; border-radius: 999px; background: var(--grid); overflow: hidden; }
    .mini i { display: block; height: 100%; border-radius: 999px; background: var(--s-18); }
    .fuerte { font-weight: 650; color: var(--ink); }
    .mas { padding: 16px 20px; }
    @media (max-width: 1200px) {
      .reticula { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      h1 { font-size: 1.375rem; }
      .publico { margin-left: 0; }
      .lista-cat { padding: 8px 16px 12px; }
      .cat { grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto auto; row-gap: 6px; }
      .cat-doc { grid-column: 2; grid-row: 1; text-align: right; }
      .cat-barra { grid-column: 1 / -1; grid-row: 2; }
      .cat-venta { grid-column: 1; grid-row: 3; text-align: left; }
      .cat-com { grid-column: 2; grid-row: 3; }
      .herramientas { padding: 12px 16px 4px; }
      .c-cat, .c-opc, .mini { display: none; }
      .cat-movil { display: block; font-size: 0.75rem; font-weight: 400; }
      .doctor { min-width: 0; }
      .tabla td, .tabla tbody th { vertical-align: top; }
      .venta { display: table-cell; }
    }
  `,
})
export class Doctores {
  private readonly api = inject(ApiService);
  private readonly f = inject(FiltrosService);

  protected readonly moneda = moneda;
  protected readonly monedaCentavos = monedaCentavos;
  protected readonly pct = pct;
  protected readonly entero = entero;
  protected readonly decimal = decimal;
  protected readonly Math = Math;
  protected readonly pagina = PAGINA;

  protected readonly publico = signal(true);
  protected readonly categoria = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly orden = signal<{ campo: Orden; asc: boolean }>({ campo: 'venta', asc: false });
  protected readonly limite = signal(PAGINA);

  protected readonly datos = recurso(
    () => {
      const filtro = this.f.filtro();
      return filtro ? { ...filtro, incluir_publico_general: this.publico() } : undefined; },
    (filtro) =>
      forkJoin({
        resumen: this.api.resumenDoctores(filtro),
        comisiones: this.api.comisionesDoctores(filtro),
      }),
  );

  protected readonly periodo = computed(() => {
    const p = this.datos.valor()?.resumen.periodo;
    return p ? periodoTexto(p.fecha_inicio, p.fecha_fin) : ''; });

  protected readonly maxVenta = computed(() => Math.max(1, ...(this.datos.valor()?.resumen.categorias ?? []).map((c) => c.venta)));
  protected readonly doctoresUnicos = computed(() => new Set((this.datos.valor()?.comisiones.comisiones ?? []).map((c) => c.doctor)).size);
  protected readonly cobertura = computed<Segmento[]>(() => {
    const filas = this.datos.valor()?.comisiones.comisiones ?? [];
    const con = filas.filter((c) => c.monto_comision > 0).reduce((a, c) => a + c.venta, 0);
    const sin = filas.filter((c) => !c.monto_comision).reduce((a, c) => a + c.venta, 0);
    return [
      { clave: 'con', etiqueta: 'Genera comisión', valor: con, color: 'var(--s-18)' },
      { clave: 'sin', etiqueta: 'No alcanza regla', valor: sin, color: 'var(--blue-line)' },
    ]; });

  protected readonly sinRegla = computed(() => (this.datos.valor()?.comisiones.comisiones ?? []).filter((c) => !c.tipo_comision).length);

  protected readonly filas = computed<ComisionDoctor[]>(() => {
    let lista = this.datos.valor()?.comisiones.comisiones ?? [];
    const cat = this.categoria();
    if (cat) lista = lista.filter((c) => c.categoria_doctor === cat);
    const q = this.busqueda().trim().toLowerCase();
    if (q) lista = lista.filter((c) => c.doctor.toLowerCase().includes(q));
    const { campo, asc } = this.orden();
    const signo = asc ? 1 : -1;
    return [...lista].sort((a, b) =>
      campo === 'doctor' ? signo * a.doctor.localeCompare(b.doctor) : signo * ((a[campo] as number) - (b[campo] as number)),
    ); });

  protected readonly visibles = computed(() => this.filas().slice(0, this.limite()));
  protected readonly maxFila = computed(() => Math.max(1, ...this.filas().map((c) => c.venta)));
  protected readonly sumaVenta = computed(() => this.filas().reduce((a, c) => a + c.venta, 0));
  protected readonly sumaComision = computed(() => this.filas().reduce((a, c) => a + c.monto_comision, 0));

  tasa(comision: number, venta: number): number {
    return venta ? comision / venta : 0; }

  nombre(categoria: string): string {
    return titulo(categoria); }

  alternarCategoria(c: string): void {
    this.categoria.set(this.categoria() === c ? null : c);
    this.limite.set(PAGINA); }

  ordenar(campo: Orden): void {
    const actual = this.orden();
    this.orden.set({ campo, asc: actual.campo === campo ? !actual.asc : campo === 'doctor' }); }

  aria(campo: Orden): string {
    const o = this.orden();
    return o.campo !== campo ? 'none' : o.asc ? 'ascending' : 'descending'; }

  regla(c: ComisionDoctor): string {
    if (!c.tipo_comision) return 'Sin regla';
    return c.tipo_comision === 'PORCENTAJE' ? pct(c.comision) : `${monedaCentavos(c.comision)} / u`; }

  pistaCategoria(c: ResumenCategoriaDoctor): ContenidoPista {
    return {
      titulo: titulo(c.categoria_doctor),
      lineas: [
        { etiqueta: 'Venta', valor: moneda(c.venta), color: 'var(--ink)' },
        { etiqueta: 'Comisión', valor: moneda(c.monto_comision), color: 'var(--blue)' },
        { etiqueta: 'Tasa efectiva', valor: pct(this.tasa(c.monto_comision, c.venta)) },
        { etiqueta: 'Doctores', valor: entero(c.doctores) },
        { etiqueta: 'Unidades', valor: decimal(c.cantidad) },
      ],
    }; }
}
