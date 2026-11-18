import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { Modulo } from '../core/api.models';
import { AuthService } from '../core/auth.service';
import { FiltrosService } from '../core/filtros.service';
import { titulo } from '../core/formato';
import { Icono, NombreIcono } from '../shared/icono';
import { Filtros } from './filtros';

interface Entrada {
  ruta: string;
  texto: string;
  corto: string;
  icono: NombreIcono;
  modulos: Modulo[];
}

const ENTRADAS: Entrada[] = [
  { ruta: '/dispensadores', texto: 'Dispensadores', corto: 'Dispens.', icono: 'dispensadores', modulos: ['dispensadores'] },
  { ruta: '/sucursales', texto: 'Sucursales', corto: 'Sucursal', icono: 'sucursales', modulos: ['sucursales', 'sincronizacion'] },
  { ruta: '/doctores', texto: 'Doctores', corto: 'Doctores', icono: 'doctores', modulos: ['doctores'] },
  { ruta: '/configuracion', texto: 'Configuración', corto: 'Config.', icono: 'configuracion', modulos: ['configuracion', 'clasificacion'] },
  { ruta: '/usuarios', texto: 'Usuarios', corto: 'Usuarios', icono: 'usuarios', modulos: ['usuarios'] },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, Filtros],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    <header class="barra">
      <a class="marca" [routerLink]="auth.inicio()" aria-label="Incentivos, inicio">
        <span class="logo" aria-hidden="true"><app-icono nombre="venta" [tam]="16" /></span>
        Incentivos
      </a>
      <nav class="nav" aria-label="Módulos">
        @for (e of entradas(); track e.ruta) {
          <a [routerLink]="e.ruta" routerLinkActive="activo" ariaCurrentWhenActive="page">
            <app-icono [nombre]="e.icono" [tam]="17" />{{ e.texto }}
          </a>
        }
      </nav>
      <div class="usuario">
        <a routerLink="/cuenta" routerLinkActive="activo" class="quien" ariaCurrentWhenActive="page" aria-label="Mi cuenta">
          <span class="datos">
            <span class="nombre">{{ auth.usuario()?.nombre }}</span>
            <span class="rol">{{ rol() }}</span>
          </span>
          <span class="avatar" aria-hidden="true">{{ iniciales() }}</span>
        </a>
        <button type="button" class="icono-btn" (click)="salir()" aria-label="Cerrar sesión" title="Cerrar sesión">
          <app-icono nombre="salir" [tam]="18" />
        </button>
      </div>
    </header>

    <main id="contenido" class="contenido" tabindex="-1">
      @if (conFiltros()) {
        <app-filtros />
      }
      @if (f.errorCatalogo()) {
        <div class="aviso" role="alert">
          No se pudo leer el rango de fechas con datos.
          <button type="button" class="btn btn--chico btn--peligro" (click)="f.reintentar()">Reintentar</button>
        </div>
      }
      <router-outlet />
    </main>

    <nav class="tabbar" aria-label="Módulos">
      @for (e of entradas(); track e.ruta) {
        <a [routerLink]="e.ruta" routerLinkActive="activo" ariaCurrentWhenActive="page" [attr.aria-label]="e.texto">
          <app-icono [nombre]="e.icono" />
          <span aria-hidden="true">{{ e.corto }}</span>
        </a>
      }
      <a routerLink="/cuenta" routerLinkActive="activo" ariaCurrentWhenActive="page">
        <app-icono nombre="cuenta" />
        <span>Cuenta</span>
      </a>
    </nav>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; }
    .saltar { position: absolute; left: 16px; top: -48px; z-index: 50; padding: 8px 12px; border-radius: 8px; background: var(--blue); color: #fff; }
    .saltar:focus { top: 8px; }
    .barra {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; gap: 24px;
      height: 64px; padding: 0 28px;
      background: var(--paper); border-bottom: 1px solid var(--grid);
    }
    .marca { display: inline-flex; align-items: center; gap: 10px; font-size: 1.0625rem; font-weight: 700; letter-spacing: -0.02em; color: var(--ink); text-decoration: none; }
    .logo { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--blue); color: #fff; }
    .nav { display: flex; gap: 4px; margin-right: auto; }
    .nav a {
      display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: var(--radius-sm);
      font-size: 0.875rem; font-weight: 550; color: var(--ink-3); text-decoration: none;
      transition: background-color 160ms var(--ease), color 160ms var(--ease);
    }
    .nav a:hover { color: var(--ink); background: var(--sunken); }
    .nav a.activo { color: var(--blue); background: var(--blue-wash); font-weight: 650; }
    .usuario { display: flex; align-items: center; gap: 6px; }
    .quien { display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 10px; border-radius: 999px; text-decoration: none; color: var(--ink); }
    .quien:hover, .quien.activo { background: var(--sunken); }
    .datos { display: grid; justify-items: end; }
    .nombre { font-size: 0.8125rem; font-weight: 650; line-height: 1.25; }
    .rol { font-size: 0.75rem; color: var(--ink-3); }
    .avatar {
      display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
      background: var(--blue-wash); color: var(--blue); font-size: 0.8125rem; font-weight: 700;
    }
    .contenido { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--gap); max-width: 1440px; margin: 0 auto; padding: 24px 28px 64px; outline: none; }
    .tabbar { display: none; }

    @media (max-width: 1100px) {
      .nav { display: none; }
      .barra { justify-content: space-between; height: 58px; padding: 0 16px; }
      .contenido { padding: 16px 16px 104px; gap: 16px; }
      .tabbar {
        position: fixed; inset: auto 0 0 0; z-index: 20;
        display: flex; justify-content: space-around;
        padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
        background: var(--paper); border-top: 1px solid var(--grid); box-shadow: 0 -4px 16px rgba(16, 24, 40, 0.05);
      }
      .tabbar a {
        flex: 1; display: grid; justify-items: center; gap: 3px; padding: 6px 2px; min-width: 0; border-radius: var(--radius-sm);
        font-size: 0.6875rem; font-weight: 550; color: var(--ink-3); text-decoration: none;
      }
      .tabbar a span { white-space: nowrap; }
      .tabbar a.activo { color: var(--blue); background: var(--blue-wash); font-weight: 650; }
    }
    @media (max-width: 480px) {
      .datos { display: none; }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly f = inject(FiltrosService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly entradas = computed(() => ENTRADAS.filter((e) => e.modulos.some((m) => this.auth.modulos().has(m))));
  protected readonly rol = computed(() => titulo(this.auth.usuario()?.rol ?? ''));
  protected readonly iniciales = computed(() =>
    (this.auth.usuario()?.nombre ?? '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join(''),
  );

  protected readonly conFiltros = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r = this.ruta.snapshot;
        while (r.firstChild) r = r.firstChild;
        return r.data['filtros'] === true;
      }),
    ),
    { initialValue: false },
  );

  constructor() {
    this.f.cargar();
  }

  salir(): void {
    this.f.reiniciar();
    this.auth.salir();
  }
}
