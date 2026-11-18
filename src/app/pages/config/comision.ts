import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ReglaComision, ReglaComisionIn, TipoComision } from '../../core/api.models';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { compacto, moneda, monedaCentavos, pct, titulo } from '../../core/formato';
import { recurso } from '../../core/recurso';
import { Falla, Vacio } from '../../shared/estados';
import { Icono } from '../../shared/icono';
import { ContenidoPista, Pista } from '../../shared/pista';

interface Forma {
  id: number | null;
  categoria_doctor: string;
  tipo: TipoComision;
  valor: string; // % para PORCENTAJE, pesos para MONTO_POR_UNIDAD
  venta_minima: string;
  venta_maxima: string; }

const VACIA: Forma = { id: null, categoria_doctor: '', tipo: 'PORCENTAJE', valor: '', venta_minima: '0', venta_maxima: '' };

@Component({
  selector: 'app-config-comision',
  imports: [FormsModule, Falla, Vacio, Icono, Pista],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (forma(); as f) {
      <form class="plancha editor" (ngSubmit)="guardar()" aria-labelledby="t-editor">
        <div class="plancha__cabeza">
          <h2 id="t-editor" class="rotulo">{{ f.id ? 'Editar regla' : 'Nueva regla de comisión' }}</h2>
          <button type="button" class="icono-btn" (click)="cerrar()" aria-label="Cerrar editor"><app-icono nombre="cerrar" /></button>
        </div>
        <div class="plancha__cuerpo campos">
          <label class="campo">
            <span>Categoría de doctor</span>
            <input class="entrada" name="cat" list="categorias-doctor" required maxlength="100" [(ngModel)]="f.categoria_doctor"
                   placeholder="Ej. LABORATORIOS" />
          </label>
          <label class="campo">
            <span>Tipo</span>
            <select class="entrada" name="tipo" [(ngModel)]="f.tipo">
              <option value="PORCENTAJE">Porcentaje de la venta</option>
              <option value="MONTO_POR_UNIDAD">Monto por unidad</option>
            </select>
          </label>
          <label class="campo">
            <span>{{ f.tipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Pesos por unidad' }}</span>
            <input class="entrada entrada--num" name="valor" type="number" min="0" step="any" required [(ngModel)]="f.valor"
                   [placeholder]="f.tipo === 'PORCENTAJE' ? '5' : '25'" />
          </label>
          <label class="campo">
            <span>Venta mínima</span>
            <input class="entrada entrada--num" name="min" type="number" min="0" step="any" required [(ngModel)]="f.venta_minima" />
          </label>
          <label class="campo">
            <span>Venta máxima (excluida)</span>
            <input class="entrada entrada--num" name="max" type="number" min="0" step="any" [(ngModel)]="f.venta_maxima" placeholder="Sin límite" />
          </label>
        </div>
        @if (errorForma(); as e) {
          <p class="aviso margen" role="alert">{{ e }}</p>
        }
        <div class="pie">
          <p class="muted">Aplica a la venta de cada doctor en la categoría: mínima ≤ venta &lt; máxima. Si dos rangos coinciden, gana el de mínima mayor.</p>
          <button type="button" class="btn btn--fantasma" (click)="cerrar()">Cancelar</button>
          <button type="submit" class="btn btn--primario" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar regla' }}</button>
        </div>
        <datalist id="categorias-doctor">
          @for (c of grupos(); track c.categoria) { <option [value]="c.categoria"></option> }
        </datalist>
      </form>
    }

    <section class="plancha" aria-labelledby="t-reglas">
      <div class="plancha__cabeza">
        <h2 id="t-reglas" class="rotulo">Reglas de comisión</h2>
        @if (!forma()) {
          <button type="button" class="btn btn--chico btn--primario" (click)="nueva()">Nueva regla</button>
        }
      </div>

      @if (reglas.error(); as e) {
        <div class="plancha__cuerpo"><app-falla [mensaje]="e" (reintentar)="reglas.recargar()" /></div>
      } @else if (reglas.inicial()) {
        <div class="esqueleto" style="height: 320px"></div>
      } @else if (!grupos().length) {
        <app-vacio titulo="Aún no hay reglas" texto="Sin reglas, ninguna venta de doctores genera comisión. Cree la primera para una categoría." />
      } @else {
        @for (g of grupos(); track g.categoria) {
          <div class="grupo">
            <div class="grupo-cabeza">
              <h3>{{ nombre(g.categoria) }}</h3>
              <span class="muted chica">{{ g.reglas.length }} {{ g.reglas.length === 1 ? 'rango' : 'rangos' }}</span>
            </div>
            <!-- Escalera de rangos -->
            <div class="escalera" role="img" [attr.aria-label]="'Rangos de ' + nombre(g.categoria)">
              @for (r of g.tramos; track r.regla.id) {
                <span class="tramo" [style.left.%]="r.izq" [style.width.%]="r.ancho" [class.tramo--abierto]="r.regla.venta_maxima === null"
                      tabindex="0" [appPista]="pistaRegla(r.regla)">
                  <b>{{ valorTexto(r.regla) }}</b>
                </span>
              }
              <span class="eje izq">{{ compacto(0) }}</span>
              <span class="eje der">{{ g.tope ? compacto(g.tope) + (g.abierto ? ' en adelante' : '') : 'Cualquier venta' }}</span>
            </div>
            <table class="tabla fija">
              <colgroup><col class="c-rango" /><col class="c-tipo" /><col class="c-valor" /><col class="c-acc" /></colgroup>
              <thead>
                <tr>
                  <th scope="col">Rango de venta</th>
                  <th scope="col">Tipo</th>
                  <th scope="col" class="der">Valor</th>
                  <th scope="col"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (r of g.reglas; track r.id) {
                  <tr>
                    <td class="num">{{ moneda(r.venta_minima) }} – {{ r.venta_maxima === null ? 'sin límite' : moneda(r.venta_maxima) }}</td>
                    <td class="muted">{{ r.tipo === 'PORCENTAJE' ? 'Porcentaje' : 'Monto por unidad' }}</td>
                    <td class="der fuerte">{{ valorTexto(r) }}</td>
                    <td class="acciones">
                      @if (confirmar() === r.id) {
                        <span class="confirmar" role="group" aria-label="Confirmar eliminación">
                          ¿Eliminar?
                          <button type="button" class="btn btn--chico btn--peligro" (click)="eliminar(r)" [disabled]="guardando()">Eliminar</button>
                          <button type="button" class="btn btn--chico btn--fantasma" (click)="confirmar.set(null)">No</button>
                        </span>
                      } @else {
                        <button type="button" class="icono-btn" (click)="editar(r)" [attr.aria-label]="'Editar regla ' + valorTexto(r)"><app-icono nombre="editar" /></button>
                        <button type="button" class="icono-btn icono-btn--peligro" (click)="confirmar.set(r.id)" [attr.aria-label]="'Eliminar regla ' + valorTexto(r)"><app-icono nombre="borrar" /></button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
      @if (errorLista(); as e) {
        <p class="aviso margen" role="alert">{{ e }}</p>
      }
    </section>
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .campos { display: grid; grid-template-columns: 2fr 1.6fr 1fr 1fr 1fr; gap: 16px; }
    .pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 12px; padding: 0 20px 20px; }
    .pie p { flex: 1 1 24rem; font-size: 0.8125rem; }
    .margen { margin: 0 20px 16px; }
    .chica { font-size: 0.8125rem; }
    .grupo { padding: 20px 20px 8px; border-bottom: 1px solid var(--grid); }
    .grupo:last-of-type { border-bottom: 0; }
    .grupo-cabeza { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
    h3 { font-size: 1.125rem; }
    .escalera { position: relative; height: 54px; margin: 0 0 12px; }
    .escalera::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 30px; border-radius: 8px; background: var(--sunken); }
    .tramo {
      position: absolute; bottom: 0; height: 30px; display: flex; align-items: center; padding: 0 10px; overflow: hidden;
      background: var(--s-18); color: #fff; border-radius: 8px; box-shadow: 0 0 0 1px var(--paper); outline-offset: 2px; }
    .tramo:nth-child(even) { background: var(--s-5); }
    .tramo--abierto { border-top-right-radius: 0; border-bottom-right-radius: 0; }
    .tramo--abierto::after { content: '→'; position: absolute; right: 10px; font-size: 0.875rem; opacity: 0.85; }
    .tramo b { font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .eje { position: absolute; top: 0; font-size: 11px; font-weight: 500; color: var(--ink-3); }
    .eje.izq { left: 0; }
    .eje.der { right: 0; }
    .fuerte { font-weight: 650; color: var(--ink); }
    .fija { table-layout: fixed; }
    .c-rango { width: 42%; }
    .c-tipo { width: 28%; }
    .c-valor { width: 14%; }
    .c-acc { width: 16%; }
    .acciones { text-align: right; white-space: nowrap; }
    .confirmar { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--alert); }
    @media (max-width: 960px) {
      .campos { grid-template-columns: 1fr 1fr; }
      .campos .campo:first-child { grid-column: 1 / -1; }
    }
    @media (max-width: 520px) {
      .campos { grid-template-columns: 1fr; }
      .grupo { padding: 16px 16px 8px; }
    }
  `,
})
export class ConfigComision {
  private readonly api = inject(ApiService);

  protected readonly moneda = moneda;
  protected readonly compacto = compacto;
  protected readonly forma = signal<Forma | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForma = signal<string | null>(null);
  protected readonly errorLista = signal<string | null>(null);
  protected readonly confirmar = signal<number | null>(null);

  protected readonly reglas = recurso(() => true, () => this.api.reglasComision());

  protected readonly grupos = computed(() => {
    const porCat = new Map<string, ReglaComision[]>();
    for (const r of this.reglas.valor() ?? []) {
      porCat.set(r.categoria_doctor, [...(porCat.get(r.categoria_doctor) ?? []), r]); }
    return [...porCat.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([categoria, reglas]) => {
        const ordenadas = [...reglas].sort((a, b) => a.venta_minima - b.venta_minima);
        const abierto = ordenadas.some((r) => r.venta_maxima === null);
        const finitos = ordenadas.flatMap((r) => [r.venta_minima, r.venta_maxima ?? 0]);
        const mayor = Math.max(...finitos, 0);
        const tope = mayor ? (abierto ? mayor * 1.25 : mayor) : 1;
        const tramos = ordenadas.map((r) => {
          const fin = r.venta_maxima ?? tope;
          return { regla: r, izq: (r.venta_minima / tope) * 100, ancho: Math.max(1.5, ((fin - r.venta_minima) / tope) * 100) }; });
        return { categoria, reglas: ordenadas, tramos, tope: mayor, abierto }; }); });

  nombre(c: string): string {
    return titulo(c); }

  valorTexto(r: ReglaComision): string {
    return r.tipo === 'PORCENTAJE' ? pct(r.valor) : `${monedaCentavos(r.valor)} / u`; }

  pistaRegla(r: ReglaComision): ContenidoPista {
    return {
      titulo: titulo(r.categoria_doctor),
      lineas: [
        { etiqueta: 'Desde', valor: moneda(r.venta_minima) },
        { etiqueta: 'Hasta', valor: r.venta_maxima === null ? 'Sin límite' : moneda(r.venta_maxima) },
        { etiqueta: 'Comisión', valor: this.valorTexto(r) },
      ],
    }; }

  nueva(): void {
    this.errorForma.set(null);
    this.forma.set({ ...VACIA }); }

  editar(r: ReglaComision): void {
    this.errorForma.set(null);
    this.forma.set({
      id: r.id,
      categoria_doctor: r.categoria_doctor,
      tipo: r.tipo as TipoComision,
      valor: String(r.tipo === 'PORCENTAJE' ? +(r.valor * 100).toFixed(4) : r.valor),
      venta_minima: String(r.venta_minima),
      venta_maxima: r.venta_maxima === null ? '' : String(r.venta_maxima),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); }

  cerrar(): void {
    this.forma.set(null); }

  guardar(): void {
    const f = this.forma();
    if (!f) return;
    if (!f.categoria_doctor.trim()) return this.errorForma.set('Escriba la categoría de doctor.');
    if (f.valor === '' || +f.valor < 0) return this.errorForma.set('El valor debe ser un número mayor o igual a 0.');
    const min = f.venta_minima === '' ? 0 : +f.venta_minima;
    const max = f.venta_maxima === '' ? null : +f.venta_maxima;
    if (max !== null && max <= min) return this.errorForma.set('La venta máxima debe ser mayor que la mínima.');

    const datos: ReglaComisionIn = {
      categoria_doctor: f.categoria_doctor.trim().toUpperCase(),
      tipo: f.tipo,
      valor: f.tipo === 'PORCENTAJE' ? +f.valor / 100 : +f.valor,
      venta_minima: min,
      venta_maxima: max,
    };
    this.guardando.set(true);
    this.errorForma.set(null);
    const peticion = f.id ? this.api.actualizarReglaComision(f.id, datos) : this.api.crearReglaComision(datos);
    peticion.subscribe({
      next: (r) => {
        this.reglas.ajustar((lista) => [...(lista ?? []).filter((x) => x.id !== r.id), r]);
        this.guardando.set(false);
        this.forma.set(null); },
      error: (e) => {
        this.errorForma.set(mensajeError(e));
        this.guardando.set(false); },
    }); }

  eliminar(r: ReglaComision): void {
    this.guardando.set(true);
    this.errorLista.set(null);
    this.api.eliminarReglaComision(r.id).subscribe({
      next: () => {
        this.reglas.ajustar((lista) => (lista ?? []).filter((x) => x.id !== r.id));
        this.confirmar.set(null);
        this.guardando.set(false); },
      error: (e) => {
        this.errorLista.set(mensajeError(e));
        this.guardando.set(false); },
    }); }
}
