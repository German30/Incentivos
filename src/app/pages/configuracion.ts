import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../core/auth.service';
import { ConfigClasificacion } from './config/clasificacion';
import { ConfigComision } from './config/comision';
import { ConfigMetas } from './config/metas';

type Pestana = 'metas' | 'comision' | 'clasificacion';

const CLAVE = 'incentivos.config.pestana';

@Component({
  selector: 'app-configuracion',
  imports: [ConfigMetas, ConfigComision, ConfigClasificacion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <h1>Configuración</h1>
      <p class="muted">Las reglas viven en la base: lo que cambie aquí aplica de inmediato a todos los reportes.</p>
    </header>

    <div class="segmentado pestanas" role="tablist" aria-label="Secciones de configuración" (keydown)="teclado($event)">
      @for (p of pestanas(); track p.id) {
        <button type="button" role="tab" [id]="'tab-' + p.id" [attr.aria-selected]="activa() === p.id"
                [attr.aria-controls]="'panel-' + p.id" [tabindex]="activa() === p.id ? 0 : -1" (click)="elegir(p.id)">
          {{ p.texto }}
        </button>
      }
    </div>

    <div role="tabpanel" [id]="'panel-' + activa()" [attr.aria-labelledby]="'tab-' + activa()">
      @switch (activa()) {
        @case ('metas') { <app-config-metas /> }
        @case ('comision') { <app-config-comision /> }
        @case ('clasificacion') { <app-config-clasificacion /> }
      }
    </div>
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .cabecera { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 20px; }
    h1 { font-size: 1.625rem; }
    .pestanas { justify-self: start; max-width: 100%; overflow-x: auto; }
    .pestanas button { min-height: 36px; padding: 0 16px; }
    @media (max-width: 640px) {
      h1 { font-size: 1.375rem; }
    }
  `,
})
export class Configuracion {
  private readonly auth = inject(AuthService);

  protected readonly pestanas = computed(() => {
    const lista: { id: Pestana; texto: string }[] = [];
    if (this.auth.puede('configuracion')) {
      lista.push({ id: 'metas', texto: 'Metas y parámetros' }, { id: 'comision', texto: 'Comisiones de doctores' }); }
    if (this.auth.puede('configuracion') || this.auth.puede('clasificacion')) {
      lista.push({ id: 'clasificacion', texto: 'Clasificación' }); }
    return lista; });

  private readonly elegida = signal<Pestana | null>(this.leer());

  protected readonly activa = computed<Pestana>(() => {
    const e = this.elegida();
    const lista = this.pestanas();
    return lista.some((p) => p.id === e) ? e! : (lista[0]?.id ?? 'clasificacion'); });

  elegir(id: Pestana): void {
    this.elegida.set(id);
    try {
      sessionStorage.setItem(CLAVE, id); } catch {
      // sin almacenamiento
    }
  }

  teclado(evento: KeyboardEvent): void {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
    const lista = this.pestanas();
    const i = lista.findIndex((p) => p.id === this.activa());
    const siguiente = lista[(i + (evento.key === 'ArrowRight' ? 1 : -1) + lista.length) % lista.length];
    this.elegir(siguiente.id);
    document.getElementById(`tab-${siguiente.id}`)?.focus(); }

  private leer(): Pestana | null {
    try {
      return sessionStorage.getItem(CLAVE) as Pestana | null; } catch {
      return null; }
  }
}
