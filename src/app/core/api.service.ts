import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CambioPassword,
  CategoriaClasificada,
  ComisionesDoctores,
  Dispensador,
  FiltroReporte,
  IncentivosDispensadores,
  MetaDispensador,
  MetasSucursal,
  MetasSucursalIn,
  Parametro,
  Rango,
  ReglaClasificacion,
  ReglaClasificacionIn,
  ReglaComision,
  ReglaComisionIn,
  ResumenDispensadores,
  ResumenDoctores,
  ResumenSucursales,
  Sesion,
  Sincronizacion,
  TipoClasificacion,
  Token,
  Usuario,
  UsuarioActualizar,
  UsuarioCrear,
  VentasDispensadores,
} from './api.models';

export const API = '/api/v1';

function parametros(valores: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

/** Cliente de todos los endpoints de Incentivos-Back. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // --- Auth -----------------------------------------------------------------

  login(usuario: string, password: string): Observable<Token> {
    const cuerpo = new HttpParams().set('username', usuario).set('password', password);
    return this.http.post<Token>(`${API}/auth/login`, cuerpo.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  yo(): Observable<Sesion> {
    return this.http.get<Sesion>(`${API}/auth/me`);
  }

  cambiarPassword(datos: CambioPassword): Observable<void> {
    return this.http.put<void>(`${API}/auth/password`, datos);
  }

  // --- Usuarios -------------------------------------------------------------

  usuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${API}/usuarios`);
  }

  crearUsuario(datos: UsuarioCrear): Observable<Usuario> {
    return this.http.post<Usuario>(`${API}/usuarios`, datos);
  }

  actualizarUsuario(id: number, datos: UsuarioActualizar): Observable<Usuario> {
    return this.http.put<Usuario>(`${API}/usuarios/${id}`, datos);
  }

  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/usuarios/${id}`);
  }

  // --- Catálogos ------------------------------------------------------------

  rango(): Observable<Rango> {
    return this.http.get<Rango>(`${API}/catalogos/rango`);
  }

  sucursales(): Observable<string[]> {
    return this.http.get<string[]>(`${API}/catalogos/sucursales`);
  }

  dispensadores(sucursal?: string | null): Observable<Dispensador[]> {
    return this.http.get<Dispensador[]>(`${API}/catalogos/dispensadores`, { params: parametros({ sucursal }) });
  }

  categorias(filtro: FiltroReporte): Observable<CategoriaClasificada[]> {
    return this.http.get<CategoriaClasificada[]>(`${API}/catalogos/categorias`, { params: parametros({ ...filtro }) });
  }

  // --- Dispensadores --------------------------------------------------------

  resumenDispensadores(filtro: FiltroReporte): Observable<ResumenDispensadores> {
    return this.http.get<ResumenDispensadores>(`${API}/dispensadores/resumen`, { params: parametros({ ...filtro }) });
  }

  ventasDispensadores(filtro: FiltroReporte): Observable<VentasDispensadores> {
    return this.http.get<VentasDispensadores>(`${API}/dispensadores/ventas`, { params: parametros({ ...filtro }) });
  }

  incentivosDispensadores(filtro: FiltroReporte): Observable<IncentivosDispensadores> {
    return this.http.get<IncentivosDispensadores>(`${API}/dispensadores/incentivos`, {
      params: parametros({ ...filtro }),
    });
  }

  // --- Sucursales -----------------------------------------------------------

  resumenSucursales(filtro: FiltroReporte): Observable<ResumenSucursales> {
    return this.http.get<ResumenSucursales>(`${API}/sucursales/resumen`, { params: parametros({ ...filtro }) });
  }

  sincronizacion(): Observable<Sincronizacion[]> {
    return this.http.get<Sincronizacion[]>(`${API}/sucursales/sincronizacion`);
  }

  // --- Doctores -------------------------------------------------------------

  comisionesDoctores(
    filtro: FiltroReporte & { categoria?: string | null; incluir_publico_general?: boolean },
  ): Observable<ComisionesDoctores> {
    return this.http.get<ComisionesDoctores>(`${API}/doctores/comisiones`, { params: parametros({ ...filtro }) });
  }

  resumenDoctores(filtro: FiltroReporte & { incluir_publico_general?: boolean }): Observable<ResumenDoctores> {
    return this.http.get<ResumenDoctores>(`${API}/doctores/resumen`, { params: parametros({ ...filtro }) });
  }

  // --- Metas ----------------------------------------------------------------

  metasSucursales(): Observable<MetasSucursal[]> {
    return this.http.get<MetasSucursal[]>(`${API}/metas/sucursales`);
  }

  actualizarMetasSucursal(sucursal: string, datos: MetasSucursalIn): Observable<MetasSucursal> {
    return this.http.put<MetasSucursal>(`${API}/metas/sucursales/${encodeURIComponent(sucursal)}`, datos);
  }

  metasDispensador(): Observable<MetaDispensador[]> {
    return this.http.get<MetaDispensador[]>(`${API}/metas/dispensador`);
  }

  actualizarMetaDispensador(indicador: string, meta: number): Observable<MetaDispensador> {
    return this.http.put<MetaDispensador>(`${API}/metas/dispensador/${encodeURIComponent(indicador)}`, { meta });
  }

  // --- Reglas ---------------------------------------------------------------

  reglasClasificacion(tipo?: TipoClasificacion | null): Observable<ReglaClasificacion[]> {
    return this.http.get<ReglaClasificacion[]>(`${API}/reglas/clasificacion`, { params: parametros({ tipo }) });
  }

  crearReglaClasificacion(datos: ReglaClasificacionIn): Observable<ReglaClasificacion> {
    return this.http.post<ReglaClasificacion>(`${API}/reglas/clasificacion`, datos);
  }

  actualizarReglaClasificacion(id: number, datos: ReglaClasificacionIn): Observable<ReglaClasificacion> {
    return this.http.put<ReglaClasificacion>(`${API}/reglas/clasificacion/${id}`, datos);
  }

  eliminarReglaClasificacion(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/reglas/clasificacion/${id}`);
  }

  reglasComision(): Observable<ReglaComision[]> {
    return this.http.get<ReglaComision[]>(`${API}/reglas/comision`);
  }

  crearReglaComision(datos: ReglaComisionIn): Observable<ReglaComision> {
    return this.http.post<ReglaComision>(`${API}/reglas/comision`, datos);
  }

  actualizarReglaComision(id: number, datos: ReglaComisionIn): Observable<ReglaComision> {
    return this.http.put<ReglaComision>(`${API}/reglas/comision/${id}`, datos);
  }

  eliminarReglaComision(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/reglas/comision/${id}`);
  }

  // --- Parámetros -----------------------------------------------------------

  parametros(): Observable<Parametro[]> {
    return this.http.get<Parametro[]>(`${API}/parametros`);
  }

  actualizarParametro(clave: string, valor: number): Observable<Parametro> {
    return this.http.put<Parametro>(`${API}/parametros/${encodeURIComponent(clave)}`, { valor });
  }
}
