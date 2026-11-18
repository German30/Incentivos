import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icono } from './icono';

@Component({
  selector: 'app-falla',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="aviso" role="alert">
      <app-icono nombre="alerta" />
      <span class="texto">{{ mensaje() }}</span>
      <button type="button" class="btn btn--chico btn--peligro" (click)="reintentar.emit()">
        <app-icono nombre="recargar" [tam]="16" /> Reintentar
      </button>
    </div>
  `,
  styles: `
    .aviso { align-items: center; }
    .texto { flex: 1; }
  `,
})
export class Falla {
  readonly mensaje = input.required<string>();
  readonly reintentar = output<void>();
}

@Component({
  selector: 'app-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vacio">
      <span class="marca" aria-hidden="true"></span>
      <p class="titulo">{{ titulo() }}</p>
      <p class="muted">{{ texto() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .vacio { display: grid; justify-items: center; gap: 6px; padding: 40px 20px; text-align: center; }
    .marca {
      display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 8px; border-radius: 50%;
      background: var(--blue-wash); color: var(--blue);
    }
    .marca::before { content: ''; width: 18px; height: 18px; border-radius: 6px; border: 2px solid currentColor; }
    .titulo { font-weight: 650; font-size: 1rem; }
    .muted { max-width: 46ch; font-size: 0.875rem; }
  `,
})
export class Vacio {
  readonly titulo = input.required<string>();
  readonly texto = input('');
}
