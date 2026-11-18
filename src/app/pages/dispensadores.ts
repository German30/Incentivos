import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { IncentivoDispensador, Indicador } from '../core/api.models';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FiltrosService } from '../core/filtros.service';
import { diasDelMes, entero, fechaHora, iso, moneda, partes, pct, pctEntero, periodoTexto } from '../core/formato';
import { recurso } from '../core/recurso';
import { Celdas } from '../shared/celdas';
import { Dona } from '../shared/dona';
import { Estado } from '../shared/estado';
import { Falla, Vacio } from '../shared/estados';
import { Flujo, PuntoFlujo } from '../shared/flujo';
import { Icono } from '../shared/icono';
import { Segmento } from '../shared/mezcla';

type ClaveIndicador = 'skus_18' | 'skus_5' | 'solural';

const INDICADORES: { clave: ClaveIndicador; etiqueta: string; color: string }[] = [
  { clave: 'skus_18', etiqueta: '18 SKUs', color: 'var(--s-18)' },
  { clave: 'skus_5', etiqueta: '5 SKUs', color: 'var(--s-5)' },
  { clave: 'solural', etiqueta: 'SOLURAL', color: 'var(--s-solural)' },
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RANKING_CORTO = 6;

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/i.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

@Component({
  selector: 'app-dispensadores',
  imports: [RouterLink, Celdas, Dona, Estado, Falla, Vacio, Flujo, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <h1>Dispensadores</h1>
      @if (datos.valor(); as d) {
        <p class="muted contexto">
          <span class="periodo">{{ periodo() }}</span> · {{ d.resumen.sucursal ?? 'Todas las sucursales' }}
          · Última venta {{ fechaHora(d.resumen.ultima_venta) }}
        </p>
      }
    </header>

    @if (datos.error(); as e) {
      <app-falla [mensaje]="e" (reintentar)="datos.recargar()" />
    }

    @if (datos.inicial()) {
      <div class="tablero" aria-busy="true" aria-label="Cargando reporte">
        <div class="esqueleto" style="grid-area: k; height: 96px"></div>
        <div class="esqueleto" style="grid-area: lado; height: 620px"></div>
        <div class="esqueleto" style="grid-area: f; height: 340px"></div>
        <div class="esqueleto" style="grid-area: m; height: 340px"></div>
      </div>
    } @else if (datos.valor(); as d) {
      @if (!d.resumen.no_tickets) {
        <div class="plancha">
          <app-vacio titulo="Sin ventas en este periodo"
                     texto="No hay tickets registrados para el periodo y la sucursal elegidos. Pruebe con el mes anterior o con todas las sucursales." />
        </div>
      } @else {
        <div class="tablero" [class.refrescando]="datos.cargando()">
          <!-- KPIs -->
          <section class="kpis" aria-label="Indicadores del periodo">
            @for (k of kpis(); track k.etiqueta) {
              <article class="plancha kpi" [style.--acento]="k.acento">
                <p class="kpi-e">{{ k.etiqueta }}</p>
                <div class="kpi-fila">
                  <p class="cifra kpi-v">{{ k.valor }}</p>
                  @if (k.pildora) {
                    <span class="pildora" [class.pildora--ok]="k.tono === 'ok'" [class.pildora--mal]="k.tono === 'mal'" [class.pildora--azul]="k.tono === 'azul'">
                      @if (k.flecha) { <app-icono [nombre]="k.flecha" [tam]="12" /> }
                      {{ k.pildora }}
                    </span>
                  }
                </div>
              </article>
            }
          </section>

          <!-- Lateral: ficha del dispensador elegido -->
          <aside class="lado" aria-labelledby="t-ficha">
            @if (elegido(); as e) {
              <h2 class="rotulo titulo-lado">Ficha del dispensador</h2>
              <div class="tarjeta" aria-live="polite">
                <svg class="ondas" viewBox="0 0 320 180" preserveAspectRatio="none" aria-hidden="true">
                  @for (o of ondas; track $index) {
                    <path [attr.d]="o" />
                  }
                </svg>
                <div class="t-arriba">
                  <span>Posición #{{ e.posicion }} de {{ d.ventas.dispensadores.length }}</span>
                  <span class="t-pct">{{ pct(e.porcentaje_del_total) }}</span>
                </div>
                <p id="t-ficha" class="t-nombre">{{ e.dispensador }}</p>
                <div class="t-abajo">
                  <span><small>Sucursal</small>{{ e.sucursal }}</span>
                  <span><small>Venta</small>{{ moneda(e.venta_global) }}</span>
                </div>
              </div>

              <div class="plancha detalle">
                <div class="plancha__cuerpo">
                  <p class="rotulo--tinta">Venta del periodo</p>
                  <div class="kpi-fila">
                    <p class="cifra det-v">{{ moneda(e.venta_global) }}</p>
                    <span class="pildora pildora--azul">{{ pct(e.porcentaje_del_total) }} del total</span>
                  </div>
                  <dl class="pares">
                    <div><dt>Tickets</dt><dd>{{ entero(e.no_tickets) }}</dd></div>
                    <div><dt>Ticket promedio</dt><dd>{{ moneda(e.ticket_promedio) }}</dd></div>
                    <div><dt>Cero faltante</dt><dd>{{ moneda(e.venta_cero_faltante) }}</dd></div>
                    <div><dt>Metas cumplidas</dt><dd>{{ cumplidas() }} de {{ kpisElegido().length }}</dd></div>
                  </dl>
                  <ul class="incentivos">
                    @for (k of kpisElegido(); track k.clave) {
                      <li>
                        <div class="inc-cabeza">
                          <span class="inc-nombre"><i [style.background]="k.color"></i>{{ k.etiqueta }}</span>
                          <app-estado [cumple]="k.ind.cumple" />
                        </div>
                        <app-celdas [venta]="k.ind.venta" [meta]="k.ind.meta" [titulo]="k.etiqueta + ' · ' + e.dispensador" />
                        <p class="inc-pie muted num">
                          {{ moneda(k.ind.venta) }}
                          @if (k.ind.meta) { de {{ moneda(k.ind.meta) }} · {{ pctEntero(k.ind.avance) }} }
                        </p>
                      </li>
                    }
                  </ul>
                </div>
              </div>

              <div class="plancha cambiar">
                <div class="plancha__cabeza"><h3 class="rotulo">Cambiar dispensador</h3></div>
                <div class="plancha__cuerpo">
                  <div class="avatares" role="listbox" aria-label="Dispensadores con más venta">
                    @for (a of avatares(); track a.dispensador) {
                      <button type="button" role="option" class="av" [class.av--activo]="a.dispensador === e.dispensador"
                              [attr.aria-selected]="a.dispensador === e.dispensador" [title]="a.dispensador"
                              (click)="seleccion.set(a.dispensador)">
                        {{ iniciales(a.dispensador) }}
                        <span class="sr-only">{{ a.dispensador }}</span>
                      </button>
                    }
                  </div>
                  <label class="campo">
                    <span>Buscar por nombre</span>
                    <input class="entrada" list="lista-dispensadores" placeholder="Escriba un nombre"
                           (change)="elegirPorNombre($any($event.target))" />
                  </label>
                  <datalist id="lista-dispensadores">
                    @for (x of d.ventas.dispensadores; track x.dispensador + x.sucursal) {
                      <option [value]="x.dispensador">{{ x.sucursal }}</option>
                    }
                  </datalist>
                </div>
              </div>
            }
          </aside>

          <!-- Flujo de venta -->
          <section class="plancha flujo" aria-labelledby="t-flujo">
            <div class="plancha__cabeza">
              <h2 id="t-flujo" class="rotulo">Flujo de venta</h2>
              <div class="segmentado" role="radiogroup" aria-label="Meses a mostrar">
                @for (n of [6, 12]; track n) {
                  <button type="button" role="radio" [attr.aria-checked]="meses() === n" (click)="meses.set(n)">{{ n }} meses</button>
                }
              </div>
            </div>
            <div class="plancha__cuerpo">
              @if (flujo.error(); as e) {
                <app-falla [mensaje]="e" (reintentar)="flujo.recargar()" />
              } @else if (flujo.inicial()) {
                <div class="esqueleto" style="height: 260px"></div>
              } @else if (flujo.valor(); as puntos) {
                <div [class.refrescando]="flujo.cargando()">
                  <app-flujo [puntos]="puntos" [meta]="meta()?.valor ?? null" />
                </div>
                <p class="nota muted">
                  Venta mensual{{ f.sucursal() ? ' de ' + f.sucursal() : '' }}. El tramo punteado es la proyección al cierre del mes en curso.
                  @if (meta()) { La línea verde es la meta global {{ meta()!.origen }}. }
                </p>
              }
            </div>
          </section>

          <!-- Metas por sucursal -->
          <section class="plancha metas" aria-labelledby="t-metas">
            <div class="plancha__cabeza">
              <h2 id="t-metas" class="rotulo">Metas por sucursal</h2>
              @if (auth.puede('sucursales')) { <a routerLink="/sucursales" class="ver-todo">Ver todo</a> }
            </div>
            <div class="plancha__cuerpo">
              @if (sucursalesMeta().length) {
                <ul class="lista-metas">
                  @for (s of sucursalesMeta(); track s.sucursal) {
                    <li>
                      <div class="lm-fila">
                        <span class="lm-nombre">{{ s.sucursal }}</span>
                        <span class="num lm-v">{{ moneda(s.venta_global.venta) }}</span>
                      </div>
                      <app-celdas [venta]="s.venta_global.venta" [meta]="s.venta_global.meta" [proyeccion]="s.proyeccion?.proyeccion ?? null"
                                  tam="chico" [titulo]="'Meta global ' + s.sucursal" />
                    </li>
                  }
                </ul>
              } @else {
                <ul class="lista-metas">
                  @for (s of segmentos(); track s.clave) {
                    <li>
                      <div class="lm-fila">
                        <span class="lm-nombre"><i class="punto" [style.background]="s.color"></i>{{ s.etiqueta }}</span>
                        <span class="num lm-v">{{ moneda(s.valor) }}</span>
                      </div>
                    </li>
                  }
                </ul>
                <p class="nota muted">Las metas por sucursal requieren acceso al módulo de sucursales.</p>
              }
            </div>
          </section>

          <!-- Mezcla de incentivo -->
          <section class="plancha mezcla" aria-labelledby="t-mezcla">
            <div class="plancha__cabeza">
              <h2 id="t-mezcla" class="rotulo">Venta con incentivo</h2>
            </div>
            <div class="plancha__cuerpo">
              <dl class="ritmo">
                @for (r of ritmo(); track r.etiqueta) {
                  <div><dt>{{ r.etiqueta }}</dt><dd class="cifra">{{ r.valor }}</dd></div>
                }
              </dl>
              <app-dona [segmentos]="segmentos()" [centroValor]="pct(conIncentivo() / d.resumen.venta_global)" centroEtiqueta="de la venta" />
            </div>
          </section>

          <!-- Ranking -->
          <section class="plancha ranking" aria-labelledby="t-ranking">
            <div class="plancha__cabeza">
              <h2 id="t-ranking" class="rotulo">Ranking por venta</h2>
              @if (d.ventas.dispensadores.length > corto) {
                <button type="button" class="ver-todo" (click)="todos.set(!todos())" [attr.aria-expanded]="todos()">
                  {{ todos() ? 'Ver menos' : 'Ver todo' }}
                </button>
              }
            </div>
            <ol class="lista-rank">
              @for (x of rankingVisible(); track x.dispensador + x.sucursal) {
                <li>
                  <button type="button" class="rk" [class.rk--activo]="x.dispensador === elegido()?.dispensador"
                          [attr.aria-pressed]="x.dispensador === elegido()?.dispensador" (click)="seleccion.set(x.dispensador)">
                    <span class="rk-av" aria-hidden="true">{{ x.posicion }}</span>
                    <span class="rk-nombre">
                      <strong>{{ x.dispensador }}</strong>
                      <small class="muted">{{ x.sucursal }} · {{ entero(x.no_tickets) }} tickets</small>
                    </span>
                    <span class="rk-v num">
                      {{ moneda(x.venta_global) }}
                      <small class="muted">{{ pct(x.porcentaje_del_total) }}</small>
                    </span>
                  </button>
                </li>
              }
            </ol>
          </section>

          <!-- Matriz de incentivos -->
          <section class="plancha matriz-card" aria-labelledby="t-matriz">
            <div class="plancha__cabeza cabeza-matriz">
              <h2 id="t-matriz" class="rotulo">Incentivos individuales</h2>
              <div class="resumen-cumple">
                @for (c of conteo(); track c.clave) {
                  <span class="pildora"><i [style.background]="c.color"></i>{{ c.etiqueta }} {{ c.cumplen }}/{{ c.total }} cumplen</span>
                }
              </div>
            </div>
            <div class="herramientas">
              <label class="buscar">
                <app-icono nombre="buscar" [tam]="18" />
                <span class="sr-only">Buscar dispensador</span>
                <input class="entrada" type="search" placeholder="Buscar dispensador o sucursal"
                       [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
              </label>
              <label class="casilla">
                <input type="checkbox" [checked]="soloPendientes()" (change)="soloPendientes.set($any($event.target).checked)" />
                Solo quienes no cumplen alguno
              </label>
            </div>
            <div class="tabla-marco">
              <table class="tabla matriz">
                <thead>
                  <tr>
                    <th scope="col">Dispensador</th>
                    <th scope="col">Sucursal</th>
                    @for (i of indicadores; track i.clave) {
                      <th scope="col">
                        <button type="button" class="orden" (click)="ordenarPor(i.clave)"
                                [attr.aria-sort]="orden() === i.clave ? 'descending' : 'none'">
                          {{ i.etiqueta }} <app-icono nombre="ordenar" [tam]="14" />
                        </button>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (fila of matriz(); track fila.dispensador + fila.sucursal) {
                    <tr [class.activa]="fila.dispensador === elegido()?.dispensador" (click)="seleccion.set(fila.dispensador)">
                      <th scope="row" class="disp">{{ fila.dispensador }}</th>
                      <td class="muted">{{ fila.sucursal }}</td>
                      @for (i of indicadores; track i.clave) {
                        <td class="celda-kpi" [attr.data-etiqueta]="i.etiqueta">
                          <app-celdas [venta]="fila[i.clave].venta" [meta]="fila[i.clave].meta" tam="chico"
                                      [titulo]="fila.dispensador + ' · ' + i.etiqueta" />
                          <span class="kpi-num num" [class.ok]="fila[i.clave].cumple">{{ avanceTexto(fila[i.clave]) }}</span>
                        </td>
                      }
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="muted">Nadie coincide con la búsqueda.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }
    }
  `,
  styles: `
    :host { display: grid; gap: var(--gap); }
    .cabecera { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 16px; }
    h1 { font-size: 1.625rem; }
    .contexto { font-size: 0.875rem; }
    .periodo { text-transform: capitalize; color: var(--ink); font-weight: 600; }
    .refrescando { opacity: 0.6; transition: opacity 200ms var(--ease); }

    .tablero {
      display: grid; gap: var(--gap); align-items: start;
      grid-template-columns: 300px repeat(6, minmax(0, 1fr));
      grid-template-areas:
        'lado k k k k k k'
        'lado f f f f m m'
        'lado x x x r r r'
        't t t t t t t';
    }
    .kpis { grid-area: k; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
    .lado { grid-area: lado; display: grid; gap: 16px; }
    .flujo { grid-area: f; }
    .metas { grid-area: m; }
    .mezcla { grid-area: x; }
    .ranking { grid-area: r; }
    .matriz-card { grid-area: t; }

    /* KPI */
    .kpi { position: relative; padding: 14px 16px 14px 24px; }
    .kpi::before { content: ''; position: absolute; left: 12px; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: var(--acento); }
    .kpi-e { font-size: 0.8125rem; color: var(--ink-3); }
    .kpi-fila { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 10px; margin-top: 4px; }
    .kpi-v { font-size: 1.375rem; }

    /* Lateral */
    .titulo-lado { font-size: 1.0625rem; }
    .tarjeta {
      position: relative; overflow: hidden; display: grid; gap: 14px; min-height: 176px; padding: 18px 20px;
      border-radius: var(--radius); color: #fff;
      background: linear-gradient(135deg, #2a5ea6 0%, var(--blue) 45%, var(--navy-deep) 100%);
      box-shadow: 0 10px 24px rgba(18, 40, 75, 0.28);
    }
    .ondas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .ondas path { fill: none; stroke: rgba(255, 255, 255, 0.09); stroke-width: 1; }
    .t-arriba, .t-abajo, .t-nombre { position: relative; }
    .t-arriba { display: flex; justify-content: space-between; font-size: 0.8125rem; color: rgba(255, 255, 255, 0.82); }
    .t-pct { font-weight: 650; color: #fff; }
    .t-nombre { align-self: center; font-size: 1.25rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; overflow-wrap: anywhere; }
    .t-abajo { display: flex; justify-content: space-between; gap: 12px; font-size: 0.9375rem; font-weight: 650; font-variant-numeric: tabular-nums; }
    .t-abajo small { display: block; font-size: 0.6875rem; font-weight: 500; color: rgba(255, 255, 255, 0.7); }
    .det-v { font-size: 1.5rem; }
    .pares { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin: 16px 0 0; padding-top: 16px; border-top: 1px solid var(--grid); }
    .pares dt { font-size: 0.75rem; color: var(--ink-3); }
    .pares dd { margin: 2px 0 0; font-weight: 650; font-variant-numeric: tabular-nums; }
    .incentivos { display: grid; gap: 14px; margin: 18px 0 0; padding: 16px 0 0; border-top: 1px solid var(--grid); list-style: none; }
    .inc-cabeza { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .inc-nombre { display: inline-flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 600; }
    .inc-nombre i, .punto, .resumen-cumple i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .inc-pie { margin-top: 6px; font-size: 0.75rem; }
    .cambiar .plancha__cuerpo { display: grid; gap: 14px; }
    .avatares { display: flex; gap: 8px; flex-wrap: wrap; }
    .av {
      display: grid; place-items: center; width: 42px; height: 42px; padding: 0; border-radius: 50%;
      border: 2px solid var(--paper); background: var(--blue-wash); color: var(--blue);
      font-size: 0.8125rem; font-weight: 700; cursor: pointer; box-shadow: 0 0 0 1px var(--grid);
      transition: box-shadow 160ms var(--ease), background-color 160ms var(--ease), color 160ms var(--ease);
    }
    .av:hover { box-shadow: 0 0 0 2px var(--blue-line); }
    .av--activo { background: var(--blue); color: #fff; box-shadow: 0 0 0 2px var(--blue); }

    /* Metas por sucursal */
    .lista-metas { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
    .lm-fila { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 0.875rem; }
    .lm-nombre { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
    .lm-v { font-weight: 650; }
    .nota { margin-top: 10px; font-size: 0.8125rem; }

    /* Mezcla */
    .ritmo { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 0 18px; }
    .ritmo dt { font-size: 0.75rem; color: var(--ink-3); }
    .ritmo dd { margin: 2px 0 0; font-size: 1.125rem; }

    /* Ranking */
    .lista-rank { margin: 0; padding: 8px 12px 12px; list-style: none; }
    .rk {
      display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px;
      width: 100%; padding: 8px; border: 0; border-radius: 12px; background: transparent; text-align: left; cursor: pointer;
      transition: background-color 120ms var(--ease);
    }
    .rk:hover { background: var(--sunken); }
    .rk--activo { background: var(--blue-wash); }
    .rk-av { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--sunken); color: var(--blue); font-size: 0.8125rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .rk--activo .rk-av { background: var(--blue); color: #fff; }
    .rk-nombre { display: grid; min-width: 0; }
    .rk-nombre strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; font-weight: 600; }
    .rk-nombre small, .rk-v small { font-size: 0.75rem; }
    .rk-v { display: grid; justify-items: end; font-size: 0.875rem; font-weight: 650; }

    /* Matriz */
    .cabeza-matriz { flex-wrap: wrap; }
    .resumen-cumple { display: flex; flex-wrap: wrap; gap: 6px; }
    .herramientas { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 16px 20px; font-size: 0.875rem; }
    .buscar { position: relative; flex: 0 1 22rem; }
    .buscar app-icono { position: absolute; left: 12px; top: 11px; color: var(--ink-3); }
    .buscar input { padding-left: 38px; }
    .matriz tbody tr { cursor: pointer; }
    .matriz tbody tr.activa { background: var(--blue-wash); }
    .disp { text-align: left; white-space: nowrap; }
    .orden { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; cursor: pointer; font: inherit; color: inherit; }
    .orden:hover, .orden[aria-sort='descending'] { color: var(--blue); }
    .celda-kpi { min-width: 12rem; }
    .celda-kpi app-celdas { display: inline-block; width: calc(100% - 3.5rem); vertical-align: middle; }
    .kpi-num { display: inline-block; width: 3.25rem; text-align: right; font-size: 0.8125rem; font-weight: 650; color: var(--ink-2); vertical-align: middle; }
    .kpi-num.ok { color: var(--ok); }

    @media (max-width: 1320px) {
      .tablero {
        grid-template-columns: repeat(6, minmax(0, 1fr));
        grid-template-areas:
          'k k k k k k'
          'f f f f f f'
          'lado lado lado m m m'
          'lado lado lado x x x'
          'lado lado lado r r r'
          't t t t t t';
      }
    }
    @media (max-width: 860px) {
      .tablero { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'k' 'lado' 'f' 'm' 'x' 'r' 't'; }
      .kpis { grid-template-columns: 1fr 1fr; gap: 12px; }
    }
    @media (max-width: 640px) {
      h1 { font-size: 1.375rem; }
      .tablero { gap: 16px; }
      .kpi-v { font-size: 1.125rem; }
      .ritmo dd { font-size: 1rem; }
      .plancha__cuerpo { padding: 14px 16px 16px; }
      .plancha__cabeza { padding: 16px 16px 0; flex-wrap: wrap; }
      .herramientas { padding: 14px 16px; }
      .matriz thead { display: none; }
      .matriz, .matriz tbody { display: block; }
      .matriz tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 14px 16px; border-bottom: 1px solid var(--grid); }
      .matriz tbody td, .matriz tbody th { padding: 0; border: 0; }
      .matriz .disp { white-space: normal; }
      .matriz .celda-kpi { grid-column: 1 / -1; display: grid; grid-template-columns: 4.5rem minmax(0, 1fr) 3rem; align-items: center; gap: 8px; min-width: 0; }
      .matriz .celda-kpi::before { content: attr(data-etiqueta); font-size: 0.75rem; font-weight: 600; color: var(--ink-3); }
      .matriz .celda-kpi app-celdas { width: auto; }
      .matriz .kpi-num { width: auto; }
    }
  `,
})
export class Dispensadores {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly f = inject(FiltrosService);

  protected readonly moneda = moneda;
  protected readonly pct = pct;
  protected readonly pctEntero = pctEntero;
  protected readonly entero = entero;
  protected readonly fechaHora = fechaHora;
  protected readonly iniciales = iniciales;
  protected readonly indicadores = INDICADORES;
  protected readonly corto = RANKING_CORTO;

  /** Líneas onduladas de la tarjeta, como el grabado de la referencia. */
  protected readonly ondas = Array.from({ length: 14 }, (_, i) => {
    const y = 40 + i * 9;
    return `M-10 ${y} C 70 ${y - 40}, 150 ${y + 50}, 330 ${y - 20}`;
  });

  protected readonly seleccion = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly soloPendientes = signal(false);
  protected readonly orden = signal<ClaveIndicador | null>(null);
  protected readonly todos = signal(false);
  protected readonly meses = signal(6);

  protected readonly datos = recurso(
    () => this.f.filtro(),
    (filtro) =>
      forkJoin({
        resumen: this.api.resumenDispensadores(filtro),
        ventas: this.api.ventasDispensadores(filtro),
        incentivos: this.api.incentivosDispensadores(filtro),
        sucursales: this.auth.puede('sucursales')
          ? this.api.resumenSucursales(filtro).pipe(catchError(() => of(null)))
          : of(null),
      }),
  );

  /** Serie mensual que termina en el mes del filtro: una consulta de resumen por mes. */
  protected readonly flujo = recurso(
    () => {
      const filtro = this.f.filtro();
      const lista = this.f.meses();
      if (!filtro?.fecha_inicio || !lista.length) return undefined;
      const base = (filtro.fecha_fin ?? filtro.fecha_inicio).slice(0, 7);
      const i = Math.max(0, lista.findIndex((m) => m.valor === base));
      const meses = lista.slice(i, i + this.meses()).reverse().map((m) => m.valor);
      return { meses, sucursal: filtro.sucursal ?? null };
    },
    ({ meses, sucursal }) =>
      forkJoin(
        meses.map((mes) => {
          const [a, m] = mes.split('-').map(Number);
          return this.api
            .resumenDispensadores({ fecha_inicio: iso(a, m, 1), fecha_fin: iso(a, m, diasDelMes(a, m)), sucursal })
            .pipe(
              map(
                (r): PuntoFlujo => ({
                  clave: mes,
                  etiqueta: `${MESES_CORTOS[m - 1]}${meses.length > 6 || m === 1 ? ' ' + String(a).slice(2) : ''}`,
                  valor: r.venta_global,
                  proyeccion: r.proyeccion?.proyeccion ?? null,
                }),
              ),
            );
        }),
      ),
  );

  protected readonly periodo = computed(() => {
    const p = this.datos.valor()?.resumen.periodo;
    return p ? periodoTexto(p.fecha_inicio, p.fecha_fin) : '';
  });

  /** Meta global: la de la sucursal filtrada, o la suma de las sucursales con meta. */
  protected readonly meta = computed(() => {
    const s = this.datos.valor()?.sucursales?.sucursales;
    if (!s?.length) return null;
    const metas = s.map((x) => x.venta_global.meta).filter((m): m is number => !!m);
    if (!metas.length) return null;
    const valor = metas.reduce((a, b) => a + b, 0);
    const origen = this.f.sucursal()
      ? `de ${this.f.sucursal()}`
      : metas.length === s.length
        ? '(suma de sucursales)'
        : `(suma de ${metas.length} sucursales con meta)`;
    return { valor, origen };
  });

  protected readonly kpis = computed(() => {
    const r = this.datos.valor()?.resumen;
    if (!r) return [];
    const meta = this.meta();
    const p = r.proyeccion;
    const vsMeta = p && meta ? p.proyeccion / meta.valor - 1 : null;
    const flecha = vsMeta === null ? null : vsMeta >= 0 ? ('subir' as const) : ('bajar' as const);
    return [
      {
        etiqueta: 'Venta global',
        valor: moneda(r.venta_global),
        pildora: meta ? `${pctEntero(r.venta_global / meta.valor)} de la meta` : null,
        tono: 'azul',
        flecha: null,
        acento: 'var(--acc-1)',
      },
      {
        etiqueta: 'Proyección al cierre',
        valor: p ? moneda(p.proyeccion) : 'Solo por mes',
        pildora: vsMeta === null ? (p ? `día ${p.dia_actual} de ${p.dias_del_mes}` : null) : `${vsMeta >= 0 ? '+' : ''}${pct(vsMeta)} vs meta`,
        tono: vsMeta === null ? 'neutro' : vsMeta >= 0 ? 'ok' : 'mal',
        flecha,
        acento: 'var(--acc-2)',
      },
      {
        etiqueta: 'Ticket promedio',
        valor: moneda(r.ticket_promedio),
        pildora: `${entero(r.no_tickets)} tickets`,
        tono: 'neutro',
        flecha: null,
        acento: 'var(--acc-3)',
      },
      {
        etiqueta: 'Cero faltante',
        valor: moneda(r.venta_cero_faltante),
        pildora: `${pct(r.venta_cero_faltante / r.venta_global)} de la venta`,
        tono: 'neutro',
        flecha: null,
        acento: 'var(--acc-4)',
      },
    ];
  });

  protected readonly segmentos = computed<Segmento[]>(() => {
    const r = this.datos.valor()?.resumen;
    if (!r) return [];
    return [
      { clave: '18', etiqueta: '18 SKUs', valor: r.ventas_18_skus, color: 'var(--s-18)' },
      { clave: '5', etiqueta: '5 SKUs', valor: r.ventas_5_skus, color: 'var(--s-5)' },
      { clave: 'solural', etiqueta: 'SOLURAL', valor: r.ventas_solural, color: 'var(--s-solural)' },
    ];
  });

  protected readonly conIncentivo = computed(() => this.segmentos().reduce((a, s) => a + s.valor, 0));

  /** Promedio diario, semanal y cierre de la venta con incentivo. */
  protected readonly ritmo = computed(() => {
    const r = this.datos.valor()?.resumen;
    if (!r) return [];
    const total = this.conIncentivo();
    let dias: number;
    if (r.proyeccion) dias = r.proyeccion.dia_actual;
    else {
      const [a1, m1, d1] = partes(r.periodo.fecha_inicio);
      const fin = r.ultima_venta && r.ultima_venta.slice(0, 10) < r.periodo.fecha_fin ? r.ultima_venta : r.periodo.fecha_fin;
      const [a2, m2, d2] = partes(fin);
      dias = Math.max(1, Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000) + 1);
    }
    const diario = total / dias;
    const cierre = r.proyeccion ? (total / r.proyeccion.dia_actual) * r.proyeccion.dias_del_mes : total;
    return [
      { etiqueta: 'Diario', valor: moneda(diario) },
      { etiqueta: 'Semanal', valor: moneda(diario * 7) },
      { etiqueta: r.proyeccion ? 'Cierre proyectado' : 'Periodo', valor: moneda(cierre) },
    ];
  });

  protected readonly sucursalesMeta = computed(() =>
    [...(this.datos.valor()?.sucursales?.sucursales ?? [])]
      .filter((s) => s.venta_global.meta)
      .sort((a, b) => b.venta_global.venta / b.venta_global.meta! - a.venta_global.venta / a.venta_global.meta!)
      .slice(0, 6),
  );

  protected readonly elegido = computed(() => {
    const lista = this.datos.valor()?.ventas.dispensadores ?? [];
    return lista.find((d) => d.dispensador === this.seleccion()) ?? lista.at(0) ?? null;
  });

  protected readonly avatares = computed(() => {
    const lista = this.datos.valor()?.ventas.dispensadores ?? [];
    const top = lista.slice(0, 5);
    const e = this.elegido();
    return e && !top.some((t) => t.dispensador === e.dispensador) ? [...top.slice(0, 4), e] : top;
  });

  protected readonly rankingVisible = computed(() => {
    const lista = this.datos.valor()?.ventas.dispensadores ?? [];
    return this.todos() ? lista : lista.slice(0, RANKING_CORTO);
  });

  protected readonly kpisElegido = computed(() => {
    const e = this.elegido();
    const inc = this.datos.valor()?.incentivos.dispensadores.find((d) => d.dispensador === e?.dispensador && d.sucursal === e?.sucursal);
    if (!inc) return [];
    return INDICADORES.map((i) => ({ ...i, ind: inc[i.clave] }));
  });

  protected readonly cumplidas = computed(() => this.kpisElegido().filter((k) => k.ind.cumple).length);

  protected readonly conteo = computed(() => {
    const lista = this.datos.valor()?.incentivos.dispensadores ?? [];
    return INDICADORES.map((i) => ({
      ...i,
      cumplen: lista.filter((d) => d[i.clave].cumple).length,
      total: lista.filter((d) => d[i.clave].meta).length,
    }));
  });

  protected readonly matriz = computed<IncentivoDispensador[]>(() => {
    const q = this.busqueda().trim().toLowerCase();
    let lista = this.datos.valor()?.incentivos.dispensadores ?? [];
    if (q) lista = lista.filter((d) => d.dispensador.toLowerCase().includes(q) || d.sucursal.toLowerCase().includes(q));
    if (this.soloPendientes()) lista = lista.filter((d) => INDICADORES.some((i) => d[i.clave].cumple === false));
    const o = this.orden();
    if (o) lista = [...lista].sort((a, b) => (b[o].avance ?? -1) - (a[o].avance ?? -1));
    return lista;
  });

  elegirPorNombre(entrada: HTMLInputElement): void {
    const nombre = entrada.value.trim().toLowerCase();
    const x = this.datos.valor()?.ventas.dispensadores.find((d) => d.dispensador.toLowerCase() === nombre);
    if (x) {
      this.seleccion.set(x.dispensador);
      entrada.value = '';
    }
  }

  ordenarPor(clave: ClaveIndicador): void {
    this.orden.set(this.orden() === clave ? null : clave);
  }

  avanceTexto(i: Indicador): string {
    return i.meta ? pctEntero(i.avance) : '—';
  }
}
