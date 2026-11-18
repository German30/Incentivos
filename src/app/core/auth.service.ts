import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';

import { Modulo, Sesion, Token } from './api.models';
import { ApiService } from './api.service';

const CLAVE = 'incentivos.sesion';

interface SesionGuardada {
  token: string;
  expira_en: string;
  sesion: Sesion;
}

function leer(): SesionGuardada | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const guardada = JSON.parse(crudo) as SesionGuardada;
    return new Date(guardada.expira_en).getTime() > Date.now() ? guardada : null;
  } catch {
    return null;
  }
}

function escribir(valor: SesionGuardada | null): void {
  try {
    if (valor) localStorage.setItem(CLAVE, JSON.stringify(valor));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Almacenamiento bloqueado: la sesión vive solo en memoria.
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly guardada = signal<SesionGuardada | null>(leer());

  readonly token = computed(() => this.guardada()?.token ?? null);
  readonly sesion = computed(() => this.guardada()?.sesion ?? null);
  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly modulos = computed(() => new Set<Modulo>(this.sesion()?.modulos ?? []));
  readonly autenticado = computed(() => this.token() !== null);

  puede(modulo: Modulo): boolean {
    return this.modulos().has(modulo);
  }

  /** Primera ruta a la que el rol tiene acceso. */
  inicio(): string {
    const m = this.modulos();
    if (m.has('dispensadores')) return '/dispensadores';
    if (m.has('sucursales')) return '/sucursales';
    if (m.has('doctores')) return '/doctores';
    return '/cuenta';
  }

  login(usuario: string, password: string): Observable<Token> {
    return this.api.login(usuario, password).pipe(
      tap((t) =>
        this.guardar({ token: t.access_token, expira_en: t.expira_en, sesion: { usuario: t.usuario, modulos: t.modulos } }),
      ),
    );
  }

  /** Refresca usuario y módulos: un cambio de rol en el backend aplica al recargar. */
  refrescar(): Promise<void> {
    const actual = this.guardada();
    if (!actual) return Promise.resolve();
    return firstValueFrom(
      this.api.yo().pipe(
        tap((sesion) => this.guardar({ ...actual, sesion })),
        map(() => undefined),
        catchError(() => of(undefined)),
      ),
    );
  }

  salir(expirada = false): void {
    this.guardar(null);
    void this.router.navigate(['/login'], expirada ? { queryParams: { expirada: 1 } } : {});
  }

  private guardar(valor: SesionGuardada | null): void {
    this.guardada.set(valor);
    escribir(valor);
  }
}
