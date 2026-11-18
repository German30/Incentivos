import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Íconos de autor: trazo 1.5, terminaciones cuadradas, retícula de 20.
const TRAZOS = {
  dispensadores: 'M3 17V9h4v8M8 17V4h4v13M13 17v-6h4v6M2 17h16',
  sucursales: 'M3 17V8l7-4 7 4v9M3 17h14M8 17v-5h4v5',
  doctores: 'M10 3v14M3 10h14',
  configuracion: 'M3 5h8M14 5h3M3 10h3M9 10h8M3 15h10M16 15h1M11 3v4M6 8v4M13 13v4',
  usuarios: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2M13 3.5a3 3 0 0 1 0 5.5M18 17v-2a4 4 0 0 0-3-3.9',
  cuenta: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 18v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1',
  salir: 'M8 3H3v14h5M12 6l4 4-4 4M16 10H7',
  izquierda: 'M12 4l-6 6 6 6',
  derecha: 'M8 4l6 6-6 6',
  mas: 'M10 4v12M4 10h12',
  editar: 'M3 17h4L17 7l-4-4L3 13v4ZM11 5l4 4',
  borrar: 'M4 6h12M8 6V3h4v3M5 6l1 11h8l1-11',
  cerrar: 'M5 5l10 10M15 5L5 15',
  ok: 'M4 10l4 4 8-8',
  buscar: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM13.5 13.5 17 17',
  recargar: 'M16 10a6 6 0 1 1-2-4.5M16 3v4h-4',
  alerta: 'M10 3l8 14H2L10 3ZM10 8v4M10 14v1',
  ordenar: 'M7 4v12M4 7l3-3 3 3M13 16V4M10 13l3 3 3-3',
  subir: 'M10 16V4M5 9l5-5 5 5',
  bajar: 'M10 4v12M5 11l5 5 5-5',
  calendario: 'M3 6h14v11H3zM3 9h14M7 3v4M13 3v4',
  campana: 'M5 14V9a5 5 0 0 1 10 0v5l1.5 2h-13L5 14ZM8.5 18h3',
  venta: 'M3 15l4-5 3 3 6-7M12 6h4v4',
  sincronizar: 'M4 8a6 6 0 0 1 11-2M16 12a6 6 0 0 1-11 2M15 3v3h-3M5 17v-3h3',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-grid;flex:none' },
  template: `
    <svg [attr.width]="tam()" [attr.height]="tam()" viewBox="0 0 20 20" fill="none"
         stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path [attr.d]="d()" />
    </svg>
  `,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tam = input(20);
  protected readonly d = computed(() => TRAZOS[this.nombre()]);
}
