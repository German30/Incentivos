import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Estado como pastilla con ícono y texto: verde = cumple, rojo = debajo, gris = sin meta. Nunca solo color. */
@Component({
  selector: 'app-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'clase()' },
  template: `
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      @switch (clase()) {
        @case ('si') { <path d="M2.5 6.2 5 8.5l4.5-5" /> }
        @case ('no') { <path d="M6 2.5v7M3 6.5 6 9.5l3-3" /> }
        @default { <path d="M3 6h6" /> }
      }
    </svg>
    {{ texto() }}
  `,
  styles: `
    :host {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 7px; border-radius: 999px;
      font-size: 0.75rem; font-weight: 600; white-space: nowrap; line-height: 1.3;
    }
    svg { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    :host(.si) { background: var(--ok-wash); color: var(--ok); }
    :host(.no) { background: var(--alert-wash); color: var(--alert); }
    :host(.nulo) { background: var(--sunken); color: var(--ink-3); }
  `,
})
export class Estado {
  readonly cumple = input<boolean | null>(null);
  readonly si = input('Cumple');
  readonly no = input('Debajo');
  readonly nulo = input('Sin meta');

  protected readonly clase = computed(() => (this.cumple() === true ? 'si' : this.cumple() === false ? 'no' : 'nulo'));
  protected readonly texto = computed(() => (this.cumple() === true ? this.si() : this.cumple() === false ? this.no() : this.nulo()));
}
