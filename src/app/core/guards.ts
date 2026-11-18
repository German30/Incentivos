import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Modulo } from './api.models';
import { AuthService } from './auth.service';

export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() || inject(Router).createUrlTree(['/login']);
};

export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.autenticado() || inject(Router).createUrlTree([auth.inicio()]);
};

/** Misma regla que valida el backend: los módulos vienen de /auth/me. */
export function moduloGuard(...modulos: Modulo[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return modulos.some((m) => auth.puede(m)) || inject(Router).createUrlTree([auth.inicio()]);
  };
}

export const inicioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return inject(Router).createUrlTree([auth.autenticado() ? auth.inicio() : '/login']);
};
