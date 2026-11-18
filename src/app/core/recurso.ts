import { DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { mensajeError } from './errores';

export interface Recurso<T> {
  readonly valor: Signal<T | undefined>;
  readonly cargando: Signal<boolean>;
  readonly error: Signal<string | null>;
  /** Primera carga: no hay valor previo que mostrar. */
  readonly inicial: Signal<boolean>;
  recargar(): void;
  ajustar(fn: (actual: T | undefined) => T | undefined): void;
}

/**
 * Carga reactiva: vuelve a pedir cuando cambian los parámetros y conserva el valor
 * anterior mientras llega el nuevo (sin parpadeo de esqueleto al refiltrar).
 * Devolver `undefined` en `params` deja el recurso en espera.
 */
export function recurso<P, T>(params: () => P | undefined, cargar: (p: P) => Observable<T>): Recurso<T> {
  const valor = signal<T | undefined>(undefined);
  const cargando = signal(false);
  const error = signal<string | null>(null);
  const version = signal(0);
  let sub: Subscription | undefined;

  effect(() => {
    version();
    const p = params();
    untracked(() => {
      sub?.unsubscribe();
      if (p === undefined) return;
      cargando.set(true);
      error.set(null);
      sub = cargar(p).subscribe({
        next: (v) => {
          valor.set(v);
          cargando.set(false);
        },
        error: (e: unknown) => {
          error.set(mensajeError(e));
          cargando.set(false);
        },
      });
    });
  });

  inject(DestroyRef).onDestroy(() => sub?.unsubscribe());

  return {
    valor: valor.asReadonly(),
    cargando: cargando.asReadonly(),
    error: error.asReadonly(),
    inicial: computed(() => valor() === undefined && error() === null),
    recargar: () => version.update((v) => v + 1),
    ajustar: (fn) => valor.update(fn),
  };
}
