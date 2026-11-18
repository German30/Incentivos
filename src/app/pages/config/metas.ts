import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MetaDispensador, MetasSucursal, MetasSucursalIn, Parametro } from '../../core/api.models';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { FiltrosService } from '../../core/filtros.service';
import { moneda } from '../../core/formato';
import { recurso } from '../../core/recurso';
import { Falla } from '../../shared/estados';

type CampoMeta = keyof MetasSucursalIn;

interface Borrador {
  sucursal: string;
  valores: Record<CampoMeta, string>;
  original: Record<CampoMeta, string>; }

const CAMPOS: { campo: CampoMeta; etiqueta: string }[] = [
  { campo: 'meta_global', etiqueta: 'Meta global' },
  { campo: 'meta_5_skus', etiqueta: 'Meta 5 SKUs' },
  { campo: 'meta_cero_faltante', etiqueta: 'Meta cero faltante' },
];

const texto = (n: number | null | undefined) => (n == null ? '' : String(n));

const ETIQUETAS_INDICADOR: Record<string, string> = { '18_SKUS': '18 SKUs', '5_SKUS': '5 SKUs', SOLURAL: 'SOLURAL' };

@Component({
  selector: 'app-config-metas',
  imports: [FormsModule, Falla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (datos.error(); as e) {
      <app-falla [mensaje]="e" (reintentar)="datos.recargar()" />
    } @else if (datos.inicial()) {
      <div class="esqueleto" style="height: 360px"></div>
    } @else {
      <section class="plancha" aria-labelledby="t-ms">
        <div class="plancha__cabeza">
          <h2 id="t-ms" class="rotulo">Metas por sucursal</h2>
          <span class="muted chica">Pesos por mes. Vacío = sin meta (no hay bono ni avance).</span>
        </div>
        <div class="tabla-marco">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Sucursal</th>
                @for (c of campos; track c.campo) { <th scope="col" class="der">{{ c.etiqueta }}</th> }
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (b of borradores(); track b.sucursal) {
                <tr>
                  <th scope="row" class="clave">{{ b.sucursal }}</th>
                  @for (c of campos; track c.campo) {
                    <td class="der">
                      <input class="entrada entrada--num" type="number" min="0" step="100" inputmode="decimal"
                             [attr.aria-label]="c.etiqueta + ' ' + b.sucursal" [(ngModel)]="b.valores[c.campo]"
                             (ngModelChange)="tocar()" placeholder="Sin meta" />
                    </td>
                  }
                  <td class="acciones">
                    @if (estado()[b.sucursal]; as s) {
                      <span class="estado" [class.estado--error]="s.error" role="status">{{ s.texto }}</span>
                    }
                    <button type="button" class="btn btn--chico" [class.btn--primario]="sucio(b)"
                            [disabled]="!sucio(b) || guardando() === b.sucursal" (click)="guardarSucursal(b)">
                      {{ guardando() === b.sucursal ? 'Guardando…' : 'Guardar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="nota muted">Solo se envían los campos modificados. Una meta guardada no se puede borrar: escriba 0 para que la sucursal quede sin meta.</p>
      </section>

      <div class="dos">
        <section class="plancha" aria-labelledby="t-md">
          <div class="plancha__cabeza">
            <h2 id="t-md" class="rotulo">Metas individuales</h2>
            <span class="muted chica">Iguales para todos los dispensadores</span>
          </div>
          <ul class="lista">
            @for (m of metasDisp(); track m.indicador) {
              <li>
                <label class="campo">
                  <span>{{ etiquetaIndicador(m.indicador) }}</span>
                  <input class="entrada entrada--num" type="number" min="0" step="100" inputmode="decimal"
                         [(ngModel)]="m.borrador" (ngModelChange)="tocar()" />
                </label>
                <span class="actual muted num">Actual {{ moneda(m.meta) }}</span>
                <button type="button" class="btn btn--chico" [class.btn--primario]="+m.borrador !== m.meta"
                        [disabled]="m.borrador === '' || +m.borrador === m.meta || +m.borrador < 0 || guardando() === m.indicador"
                        (click)="guardarIndicador(m)">Guardar</button>
                @if (estado()[m.indicador]; as s) {
                  <span class="estado" [class.estado--error]="s.error" role="status">{{ s.texto }}</span>
                }
              </li>
            }
          </ul>
        </section>

        <section class="plancha" aria-labelledby="t-par">
          <div class="plancha__cabeza">
            <h2 id="t-par" class="rotulo">Parámetros</h2>
          </div>
          <ul class="lista">
            @for (p of parametros(); track p.clave) {
              <li>
                <label class="campo">
                  <span>{{ p.clave.replaceAll('_', ' ') }}</span>
                  <input class="entrada entrada--num" type="number" step="any" inputmode="decimal"
                         [(ngModel)]="p.borrador" (ngModelChange)="tocar()" />
                </label>
                <span class="actual muted">{{ p.descripcion ?? 'Actual ' + p.valor }}</span>
                <button type="button" class="btn btn--chico" [class.btn--primario]="+p.borrador !== p.valor"
                        [disabled]="p.borrador === '' || +p.borrador === p.valor || guardando() === p.clave"
                        (click)="guardarParametro(p)">Guardar</button>
                @if (estado()[p.clave]; as s) {
                  <span class="estado" [class.estado--error]="s.error" role="status">{{ s.texto }}</span>
                }
              </li>
            } @empty {
              <li class="muted">No hay parámetros configurados.</li>
            }
          </ul>
        </section>
      </div>
    }
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .chica { font-size: 0.8125rem; }
    .clave { font-size: 1rem; font-weight: 700; text-align: left; }
    td .entrada--num { width: 11rem; }
    .acciones { white-space: nowrap; text-align: right; }
    .estado { margin-right: 10px; font-size: 0.8125rem; color: var(--blue); }
    .estado--error { color: var(--alert); }
    .nota { padding: 12px 20px 16px; font-size: 0.8125rem; }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .lista { margin: 0; padding: 8px 20px 16px; list-style: none; }
    .lista li {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 6px 12px;
      padding: 12px 0; border-bottom: 1px solid var(--grid); }
    .lista .campo span:first-child { }
    .lista .actual { grid-column: 1; font-size: 0.8125rem; }
    .lista .btn { grid-column: 2; grid-row: 1; }
    .lista .estado { grid-column: 2; text-align: right; margin: 0; }
    @media (max-width: 960px) {
      .dos { grid-template-columns: 1fr; }
    }
  `,
})
export class ConfigMetas {
  private readonly api = inject(ApiService);
  private readonly filtros = inject(FiltrosService);

  protected readonly campos = CAMPOS;
  protected readonly moneda = moneda;
  protected readonly guardando = signal<string | null>(null);
  protected readonly estado = signal<Record<string, { texto: string; error: boolean }>>({});
  private readonly version = signal(0);

  protected readonly datos = recurso(
    () => true,
    () =>
      forkJoin({
        sucursales: this.api.metasSucursales(),
        dispensador: this.api.metasDispensador(),
        parametros: this.api.parametros(),
      }),
  );

  /** Une las sucursales con meta y las del catálogo para poder fijar metas nuevas. */
  protected readonly borradores = computed<Borrador[]>(() => {
    const d = this.datos.valor();
    if (!d) return [];
    const porClave = new Map<string, MetasSucursal>(d.sucursales.map((s) => [s.sucursal, s]));
    for (const s of this.filtros.sucursales()) {
      if (!porClave.has(s)) porClave.set(s, { sucursal: s, meta_global: null, meta_5_skus: null, meta_cero_faltante: null }); }
    return [...porClave.values()]
      .sort((a, b) => a.sucursal.localeCompare(b.sucursal))
      .map((s) => {
        const valores = { meta_global: texto(s.meta_global), meta_5_skus: texto(s.meta_5_skus), meta_cero_faltante: texto(s.meta_cero_faltante) };
        return { sucursal: s.sucursal, valores: { ...valores }, original: valores }; }); });

  protected readonly metasDisp = computed(() =>
    (this.datos.valor()?.dispensador ?? []).map((m) => ({ ...m, borrador: String(m.meta) })),
  );

  protected readonly parametros = computed(() =>
    (this.datos.valor()?.parametros ?? []).map((p) => ({ ...p, borrador: String(p.valor) })),
  );

  /** Fuerza la reevaluación de sucio() con OnPush tras editar un campo. */
  tocar(): void {
    this.version.update((v) => v + 1); }

  sucio(b: Borrador): boolean {
    this.version();
    return CAMPOS.some(({ campo }) => b.valores[campo] !== b.original[campo] && b.valores[campo] !== ''); }

  etiquetaIndicador(i: string): string {
    return ETIQUETAS_INDICADOR[i] ?? i; }

  guardarSucursal(b: Borrador): void {
    const cambios: MetasSucursalIn = {};
    for (const { campo } of CAMPOS) {
      const v = b.valores[campo];
      if (v !== '' && v !== b.original[campo]) {
        if (+v < 0) return this.marcar(b.sucursal, 'Las metas no pueden ser negativas', true);
        cambios[campo] = +v; }
    }
    this.guardando.set(b.sucursal);
    this.api.actualizarMetasSucursal(b.sucursal, cambios).subscribe({
      next: (s) => {
        this.datos.ajustar((d) => {
          if (!d) return d;
          const resto = d.sucursales.filter((x) => x.sucursal !== s.sucursal);
          return { ...d, sucursales: [...resto, s] }; });
        this.marcar(b.sucursal, 'Guardado'); },
      error: (e) => this.marcar(b.sucursal, mensajeError(e), true),
    }); }

  guardarIndicador(m: MetaDispensador & { borrador: string }): void {
    this.guardando.set(m.indicador);
    this.api.actualizarMetaDispensador(m.indicador, +m.borrador).subscribe({
      next: (nuevo) => {
        this.datos.ajustar((d) => d && { ...d, dispensador: d.dispensador.map((x) => (x.indicador === nuevo.indicador ? nuevo : x)) });
        this.marcar(m.indicador, 'Guardado'); },
      error: (e) => this.marcar(m.indicador, mensajeError(e), true),
    }); }

  guardarParametro(p: Parametro & { borrador: string }): void {
    this.guardando.set(p.clave);
    this.api.actualizarParametro(p.clave, +p.borrador).subscribe({
      next: (nuevo) => {
        this.datos.ajustar((d) => d && { ...d, parametros: d.parametros.map((x) => (x.clave === nuevo.clave ? nuevo : x)) });
        this.marcar(p.clave, 'Guardado'); },
      error: (e) => this.marcar(p.clave, mensajeError(e), true),
    }); }

  private marcar(clave: string, texto: string, error = false): void {
    this.guardando.set(null);
    this.estado.update((s) => ({ ...s, [clave]: { texto, error } }));
    if (!error) setTimeout(() => this.estado.update(({ [clave]: _, ...resto }) => resto), 2500); }
}
