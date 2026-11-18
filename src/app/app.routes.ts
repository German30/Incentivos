import { Routes } from '@angular/router';

import { autenticadoGuard, inicioGuard, invitadoGuard, moduloGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión · Incentivos',
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [autenticadoGuard],
    children: [
      {
        path: 'dispensadores',
        canActivate: [moduloGuard('dispensadores')],
        title: 'Dispensadores · Incentivos',
        data: { filtros: true },
        loadComponent: () => import('./pages/dispensadores').then((m) => m.Dispensadores),
      },
      {
        path: 'sucursales',
        canActivate: [moduloGuard('sucursales', 'sincronizacion')],
        title: 'Sucursales · Incentivos',
        data: { filtros: true },
        loadComponent: () => import('./pages/sucursales').then((m) => m.Sucursales),
      },
      {
        path: 'doctores',
        canActivate: [moduloGuard('doctores')],
        title: 'Doctores · Incentivos',
        data: { filtros: true },
        loadComponent: () => import('./pages/doctores').then((m) => m.Doctores),
      },
      {
        path: 'configuracion',
        canActivate: [moduloGuard('configuracion', 'clasificacion')],
        title: 'Configuración · Incentivos',
        data: { filtros: true },
        loadComponent: () => import('./pages/configuracion').then((m) => m.Configuracion),
      },
      {
        path: 'usuarios',
        canActivate: [moduloGuard('usuarios')],
        title: 'Usuarios · Incentivos',
        loadComponent: () => import('./pages/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'cuenta',
        title: 'Cuenta · Incentivos',
        loadComponent: () => import('./pages/cuenta').then((m) => m.Cuenta),
      },
      { path: '', pathMatch: 'full', canActivate: [inicioGuard], children: [] },
    ],
  },
  { path: '**', canActivate: [inicioGuard], children: [] },
];
