import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CampoClasificacion, ReglaClasificacion, ReglaClasificacionIn, TipoClasificacion } from '../../core/api.models';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/errores';
import { FiltrosService } from '../../core/filtros.service';
import { entero, moneda, pct, periodoTexto } from '../../core/formato';
import { recurso } from '../../core/recurso';
import { Falla, Vacio } from '../../shared/estados';
import { Icono } from '../../shared/icono';

interface Forma {
  id: number | null;
  tipo: TipoClasificacion;
  campo: CampoClasificacion;
  patron: string;
  resultado: string;
  prioridad: string; }

const OTROS = 'OTROS';

@Component({
  selector: 'app-config-clasificacion',
  imports: [FormsModule, Falla, Vacio, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.puede('clasificacion')) {
      <section class="plancha" aria-labelledby="t-cat">
        <div class="plancha__cabeza cabeza">
          <h2 id="t-cat" class="rotulo">Categorías de SICAR en {{ periodo() }}</h2>
          @if (resumenOtros(); as r) {
            <span class="alerta-otros" [class.sin]="!r.categorias">
              @if (r.categorias) {
                <app-icono nombre="alerta" [tam]="16" />
                {{ r.categorias }} {{ r.categorias === 1 ? 'categoría cae' : 'categorías caen' }} en OTROS · {{ moneda(r.venta) }} sin comisión
              } @else {
                Todas las categorías tienen clasificación de doctor
              }
            </span>
          }
        </div>
        @if (categorias.error(); as e) {
          <div class="plancha__cuerpo"><app-falla [mensaje]="e" (reintentar)="categorias.recargar()" /></div>
        } @else if (categorias.inicial()) {
          <div class="esqueleto" style="height: 240px"></div>
        } @else {
          <div class="herramientas">
            <label class="casilla">
              <input type="checkbox" [checked]="soloOtros()" (change)="soloOtros.set($any($event.target).checked)" />
              Solo las que caen en OTROS
            </label>
            <span class="muted chica">Usa el periodo y la sucursal de la barra de filtros.</span>
          </div>
          <div class="tabla-marco alta" [class.refrescando]="categorias.cargando()">
            <table class="tabla">
              <thead>
                <tr>
                  <th scope="col">Categoría SICAR</th>
                  <th scope="col">Categoría doctor</th>
                  <th scope="col">Incentivo</th>
                  <th scope="col" class="der">Renglones</th>
                  <th scope="col" class="der">Venta</th>
                  <th scope="col"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (c of filasCategorias(); track (c.categoria ?? '') + c.categoria_doctor + c.categoria_incentivo) {
                  <tr [class.otros]="c.categoria_doctor === otros">
                    <th scope="row" class="cat">{{ c.categoria ?? '(sin categoría)' }}</th>
                    <td><span class="etiqueta" [class.etiqueta--otros]="c.categoria_doctor === otros">{{ c.categoria_doctor }}</span></td>
                    <td><span class="etiqueta" [class.etiqueta--otros]="c.categoria_incentivo === otros">{{ c.categoria_incentivo }}</span></td>
                    <td class="der">{{ entero(c.renglones) }}</td>
                    <td class="der">{{ moneda(c.venta) }}</td>
                    <td class="acciones">
                      @if (c.categoria && c.categoria_doctor === otros) {
                        <button type="button" class="btn btn--chico" (click)="desdeCategoria(c.categoria)">Clasificar</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted">Sin categorías para mostrar en este periodo.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }

    @if (auth.puede('configuracion')) {
      @if (forma(); as f) {
        <form class="plancha" (ngSubmit)="guardar()" aria-labelledby="t-editor" id="editor-clasificacion">
          <div class="plancha__cabeza">
            <h2 id="t-editor" class="rotulo">{{ f.id ? 'Editar regla' : 'Nueva regla de clasificación' }}</h2>
            <button type="button" class="icono-btn" (click)="forma.set(null)" aria-label="Cerrar editor"><app-icono nombre="cerrar" /></button>
          </div>
          <div class="plancha__cuerpo campos">
            <label class="campo">
              <span>Clasifica</span>
              <select class="entrada" name="tipo" [(ngModel)]="f.tipo">
                <option value="DOCTOR">Categoría de doctor</option>
                <option value="INCENTIVO">Incentivo de dispensador</option>
              </select>
            </label>
            <label class="campo">
              <span>Busca en</span>
              <select class="entrada" name="campo" [(ngModel)]="f.campo">
                <option value="categoria">Categoría SICAR</option>
                <option value="clave_articulo">Clave de artículo</option>
              </select>
            </label>
            <label class="campo">
              <span>Contiene el texto</span>
              <input class="entrada" name="patron" required maxlength="100" [(ngModel)]="f.patron" placeholder="Ej. LABORATORIO" />
            </label>
            <label class="campo">
              <span>Resultado</span>
              <input class="entrada" name="resultado" required maxlength="100" [(ngModel)]="f.resultado" [attr.list]="'resultados-' + f.tipo"
                     placeholder="Ej. LABORATORIOS" />
            </label>
            <label class="campo">
              <span>Prioridad</span>
              <input class="entrada entrada--num" name="prioridad" type="number" step="1" [(ngModel)]="f.prioridad" />
            </label>
          </div>
          @if (errorForma(); as e) { <p class="aviso margen" role="alert">{{ e }}</p> }
          <div class="pie">
            <p class="muted">Gana la primera regla que coincida, de menor a mayor prioridad. Lo que no coincide con ninguna queda en OTROS.</p>
            <button type="button" class="btn btn--fantasma" (click)="forma.set(null)">Cancelar</button>
            <button type="submit" class="btn btn--primario" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar regla' }}</button>
          </div>
          <datalist id="resultados-DOCTOR">@for (r of resultados().DOCTOR; track r) { <option [value]="r"></option> }</datalist>
          <datalist id="resultados-INCENTIVO">@for (r of resultados().INCENTIVO; track r) { <option [value]="r"></option> }</datalist>
        </form>
      }

      <section class="plancha" aria-labelledby="t-reglas">
        <div class="plancha__cabeza cabeza">
          <h2 id="t-reglas" class="rotulo">Reglas de clasificación</h2>
          <div class="acciones-cabeza">
            <div class="segmentado" role="radiogroup" aria-label="Tipo de regla">
              @for (t of tipos; track t.valor) {
                <button type="button" role="radio" [attr.aria-checked]="tipo() === t.valor" (click)="tipo.set(t.valor)">{{ t.texto }}</button>
              }
            </div>
            @if (!forma()) {
              <button type="button" class="btn btn--chico btn--primario" (click)="nueva()">Nueva regla</button>
            }
          </div>
        </div>
        @if (reglas.error(); as e) {
          <div class="plancha__cuerpo"><app-falla [mensaje]="e" (reintentar)="reglas.recargar()" /></div>
        } @else if (reglas.inicial()) {
          <div class="esqueleto" style="height: 280px"></div>
        } @else if (!filasReglas().length) {
          <app-vacio titulo="No hay reglas de este tipo" texto="Sin reglas, todas las ventas quedan en OTROS." />
        } @else {
          <div class="tabla-marco">
            <table class="tabla">
              <thead>
                <tr>
                  <th scope="col" class="der">Prioridad</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Condición</th>
                  <th scope="col">Entonces</th>
                  <th scope="col"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (r of filasReglas(); track r.id) {
                  <tr>
                    <td class="der">{{ r.prioridad }}</td>
                    <td class="muted">{{ r.tipo === 'DOCTOR' ? 'Doctor' : 'Incentivo' }}</td>
                    <td>{{ r.campo === 'categoria' ? 'Categoría' : 'Clave' }} contiene <code>{{ r.patron }}</code></td>
                    <td><span class="etiqueta">{{ r.resultado }}</span></td>
                    <td class="acciones">
                      @if (confirmar() === r.id) {
                        <span class="confirmar" role="group" aria-label="Confirmar eliminación">
                          ¿Eliminar?
                          <button type="button" class="btn btn--chico btn--peligro" (click)="eliminar(r)" [disabled]="guardando()">Eliminar</button>
                          <button type="button" class="btn btn--chico btn--fantasma" (click)="confirmar.set(null)">No</button>
                        </span>
                      } @else {
                        <button type="button" class="icono-btn" (click)="editar(r)" [attr.aria-label]="'Editar regla ' + r.patron"><app-icono nombre="editar" /></button>
                        <button type="button" class="icono-btn icono-btn--peligro" (click)="confirmar.set(r.id)" [attr.aria-label]="'Eliminar regla ' + r.patron"><app-icono nombre="borrar" /></button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (errorLista(); as e) { <p class="aviso margen" role="alert">{{ e }}</p> }
      </section>
    }
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .cabeza { flex-wrap: wrap; align-items: center; }
    .chica { font-size: 0.8125rem; }
    .alerta-otros { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 600; color: var(--alert); }
    .alerta-otros.sin { color: var(--blue); }
    .herramientas { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px 6px; font-size: 0.875rem; }
    .alta { max-height: 420px; overflow-y: auto; }
    .refrescando { opacity: 0.55; }
    .cat { text-align: left; font-weight: 500; }
    tr.otros { background: var(--alert-wash); }
    tr.otros:hover { background: var(--alert-wash); filter: brightness(0.98); }
    .etiqueta { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--sunken); font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .etiqueta--otros { background: var(--alert-wash); color: var(--alert); }
    code { padding: 1px 6px; border-radius: 6px; background: var(--sunken); border: 1px solid var(--grid); font-size: 0.8125rem; }
    .acciones { text-align: right; white-space: nowrap; width: 1%; }
    .acciones-cabeza { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .confirmar { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--alert); }
    .campos { display: grid; grid-template-columns: 1.4fr 1.2fr 1.6fr 1.6fr 0.8fr; gap: 16px; }
    .pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 12px; padding: 0 20px 20px; }
    .pie p { flex: 1 1 24rem; font-size: 0.8125rem; }
    .margen { margin: 0 20px 16px; }
    @media (max-width: 960px) {
      .campos { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 520px) {
      .campos { grid-template-columns: 1fr; }
    }
  `,
})
export class ConfigClasificacion {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  private readonly f = inject(FiltrosService);

  protected readonly moneda = moneda;
  protected readonly entero = entero;
  protected readonly pct = pct;
  protected readonly otros = OTROS;
  protected readonly tipos: { valor: TipoClasificacion | null; texto: string }[] = [
    { valor: null, texto: 'Todas' },
    { valor: 'DOCTOR', texto: 'Doctor' },
    { valor: 'INCENTIVO', texto: 'Incentivo' },
  ];

  protected readonly tipo = signal<TipoClasificacion | null>(null);
  protected readonly soloOtros = signal(false);
  protected readonly forma = signal<Forma | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForma = signal<string | null>(null);
  protected readonly errorLista = signal<string | null>(null);
  protected readonly confirmar = signal<number | null>(null);

  protected readonly categorias = recurso(
    () => (this.auth.puede('clasificacion') ? this.f.filtro() : undefined),
    (filtro) => this.api.categorias(filtro),
  );

  protected readonly reglas = recurso(
    () => (this.auth.puede('configuracion') ? true : undefined),
    () => this.api.reglasClasificacion(),
  );

  protected readonly periodo = computed(() => {
    const filtro = this.f.filtro();
    return filtro?.fecha_inicio && filtro.fecha_fin ? periodoTexto(filtro.fecha_inicio, filtro.fecha_fin) : 'el periodo'; });

  protected readonly filasCategorias = computed(() => {
    const lista = this.categorias.valor() ?? [];
    return this.soloOtros() ? lista.filter((c) => c.categoria_doctor === OTROS) : lista; });

  protected readonly resumenOtros = computed(() => {
    const lista = (this.categorias.valor() ?? []).filter((c) => c.categoria_doctor === OTROS);
    if (!this.categorias.valor()) return null;
    return { categorias: new Set(lista.map((c) => c.categoria)).size, venta: lista.reduce((a, c) => a + c.venta, 0) }; });

  protected readonly filasReglas = computed(() => {
    const t = this.tipo();
    const lista = this.reglas.valor() ?? [];
    return (t ? lista.filter((r) => r.tipo === t) : lista)
      .slice()
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.prioridad - b.prioridad || a.id - b.id); });

  protected readonly resultados = computed(() => {
    const lista = this.reglas.valor() ?? [];
    const de = (t: TipoClasificacion) => [...new Set(lista.filter((r) => r.tipo === t).map((r) => r.resultado))].sort();
    return { DOCTOR: de('DOCTOR'), INCENTIVO: de('INCENTIVO') }; });

  nueva(): void {
    this.errorForma.set(null);
    this.forma.set({ id: null, tipo: this.tipo() ?? 'DOCTOR', campo: 'categoria', patron: '', resultado: '', prioridad: '100' }); }

  desdeCategoria(categoria: string): void {
    this.errorForma.set(null);
    this.forma.set({ id: null, tipo: 'DOCTOR', campo: 'categoria', patron: categoria, resultado: '', prioridad: '100' });
    setTimeout(() => document.getElementById('editor-clasificacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }

  editar(r: ReglaClasificacion): void {
    this.errorForma.set(null);
    this.forma.set({ ...r, prioridad: String(r.prioridad) });
    setTimeout(() => document.getElementById('editor-clasificacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }

  guardar(): void {
    const f = this.forma();
    if (!f) return;
    if (!f.patron.trim() || !f.resultado.trim()) return this.errorForma.set('Escriba el texto a buscar y el resultado.');
    const prioridad = Number.parseInt(f.prioridad, 10);
    if (Number.isNaN(prioridad)) return this.errorForma.set('La prioridad debe ser un número entero.');
    const datos: ReglaClasificacionIn = {
      tipo: f.tipo,
      campo: f.campo,
      patron: f.patron.trim(),
      resultado: f.resultado.trim().toUpperCase(),
      prioridad,
    };
    this.guardando.set(true);
    this.errorForma.set(null);
    const peticion = f.id ? this.api.actualizarReglaClasificacion(f.id, datos) : this.api.crearReglaClasificacion(datos);
    peticion.subscribe({
      next: (r) => {
        this.reglas.ajustar((lista) => [...(lista ?? []).filter((x) => x.id !== r.id), r]);
        this.guardando.set(false);
        this.forma.set(null);
        this.categorias.recargar(); },
      error: (e) => {
        this.errorForma.set(mensajeError(e));
        this.guardando.set(false); },
    }); }

  eliminar(r: ReglaClasificacion): void {
    this.guardando.set(true);
    this.errorLista.set(null);
    this.api.eliminarReglaClasificacion(r.id).subscribe({
      next: () => {
        this.reglas.ajustar((lista) => (lista ?? []).filter((x) => x.id !== r.id));
        this.confirmar.set(null);
        this.guardando.set(false);
        this.categorias.recargar(); },
      error: (e) => {
        this.errorLista.set(mensajeError(e));
        this.guardando.set(false); },
    }); }
}
