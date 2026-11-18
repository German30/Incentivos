import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Rol, Usuario, UsuarioActualizar } from '../core/api.models';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/errores';
import { fechaHora, hace, titulo } from '../core/formato';
import { recurso } from '../core/recurso';
import { Estado } from '../shared/estado';
import { Falla, Vacio } from '../shared/estados';
import { Icono } from '../shared/icono';

interface Forma {
  id: number | null;
  usuario: string;
  nombre: string;
  rol: Rol;
  password: string; }

const ROLES: { valor: Rol; texto: string; detalle: string }[] = [
  { valor: 'ADMINISTRADOR', texto: 'Administrador', detalle: 'Todo: reportes, sincronización, configuración y usuarios' },
  { valor: 'DISPENSADOR', texto: 'Dispensador', detalle: 'Reportes de dispensadores y de sucursales' },
  { valor: 'DOCTOR', texto: 'Doctor', detalle: 'Reportes de doctores' },
];

@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, Estado, Falla, Vacio, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <h1>Usuarios</h1>
      @if (lista.valor(); as l) {
        <p class="muted conteo">
          @for (r of conteo(); track r.valor) {
            <span><strong class="cifra">{{ r.n }}</strong> {{ r.texto }}</span>
          }
        </p>
      }
      @if (!forma()) {
        <button type="button" class="btn btn--primario nuevo" (click)="nuevo()">Nuevo usuario</button>
      }
    </header>

    @if (forma(); as f) {
      <form class="plancha" (ngSubmit)="guardar()" aria-labelledby="t-forma">
        <div class="plancha__cabeza">
          <h2 id="t-forma" class="rotulo">{{ f.id ? 'Editar ' + f.usuario : 'Nuevo usuario' }}</h2>
          <button type="button" class="icono-btn" (click)="forma.set(null)" aria-label="Cerrar"><app-icono nombre="cerrar" /></button>
        </div>
        <div class="plancha__cuerpo campos">
          <label class="campo">
            <span>Usuario</span>
            <input class="entrada" name="usuario" [(ngModel)]="f.usuario" [disabled]="!!f.id" required minlength="3" maxlength="50"
                   pattern="[A-Za-z0-9._\\-]+" autocomplete="off" placeholder="jperez" />
          </label>
          <label class="campo">
            <span>Nombre</span>
            <input class="entrada" name="nombre" [(ngModel)]="f.nombre" required maxlength="150" placeholder="Juan Pérez" />
          </label>
          <label class="campo">
            <span>{{ f.id ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</span>
            <input class="entrada" name="password" type="password" [(ngModel)]="f.password" [required]="!f.id" minlength="8"
                   autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
          </label>
          <fieldset class="roles" [disabled]="esYo(f.id)">
            <legend>Rol</legend>
            @for (r of roles; track r.valor) {
              <label class="rol" [class.rol--activo]="f.rol === r.valor">
                <input type="radio" name="rol" [value]="r.valor" [(ngModel)]="f.rol" />
                <span><strong>{{ r.texto }}</strong><span class="muted">{{ r.detalle }}</span></span>
              </label>
            }
            @if (esYo(f.id)) { <p class="muted chica">No puede cambiar su propio rol.</p> }
          </fieldset>
        </div>
        @if (errorForma(); as e) { <p class="aviso margen" role="alert">{{ e }}</p> }
        <div class="pie">
          <button type="button" class="btn btn--fantasma" (click)="forma.set(null)">Cancelar</button>
          <button type="submit" class="btn btn--primario" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : (f.id ? 'Guardar cambios' : 'Crear usuario') }}</button>
        </div>
      </form>
    }

    @if (aviso(); as a) { <p class="aviso aviso--info" role="status">{{ a }}</p> }
    @if (errorLista(); as e) { <p class="aviso" role="alert">{{ e }}</p> }

    <section class="plancha" aria-labelledby="t-lista">
      <div class="plancha__cabeza">
        <h2 id="t-lista" class="rotulo">Cuentas</h2>
        <label class="buscar">
          <app-icono nombre="buscar" [tam]="18" />
          <span class="sr-only">Buscar usuario</span>
          <input class="entrada" type="search" placeholder="Buscar" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
        </label>
      </div>
      @if (lista.error(); as e) {
        <div class="plancha__cuerpo"><app-falla [mensaje]="e" (reintentar)="lista.recargar()" /></div>
      } @else if (lista.inicial()) {
        <div class="esqueleto" style="height: 280px"></div>
      } @else if (!filas().length) {
        <app-vacio titulo="Ningún usuario coincide" texto="Pruebe con otro nombre o limpie la búsqueda." />
      } @else {
        <div class="tabla-marco">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Último acceso</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of filas(); track u.id) {
                <tr [class.inactivo]="!u.activo">
                  <th scope="row" class="quien">
                    <span class="nombre">{{ u.nombre }} @if (esYo(u.id)) { <span class="yo">Usted</span> }</span>
                    <span class="muted chica">{{ u.usuario }}</span>
                  </th>
                  <td><span class="etiqueta">{{ titulo(u.rol) }}</span></td>
                  <td><app-estado [cumple]="u.activo ? true : null" si="Activo" nulo="Inactivo" /></td>
                  <td><span class="muted" [title]="fechaHora(u.ultimo_acceso)">{{ u.ultimo_acceso ? hace(u.ultimo_acceso) : 'Nunca' }}</span></td>
                  <td class="acciones">
                    @if (confirmar() === u.id) {
                      <span class="confirmar" role="group" aria-label="Confirmar eliminación">
                        ¿Eliminar a {{ u.usuario }}?
                        <button type="button" class="btn btn--chico btn--peligro" (click)="eliminar(u)" [disabled]="guardando()">Eliminar</button>
                        <button type="button" class="btn btn--chico btn--fantasma" (click)="confirmar.set(null)">No</button>
                      </span>
                    } @else {
                      @if (!esYo(u.id)) {
                        <button type="button" class="btn btn--chico btn--fantasma" (click)="alternar(u)" [disabled]="guardando()">
                          {{ u.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                      }
                      <button type="button" class="icono-btn" (click)="editar(u)" [attr.aria-label]="'Editar ' + u.usuario"><app-icono nombre="editar" /></button>
                      @if (!esYo(u.id)) {
                        <button type="button" class="icono-btn icono-btn--peligro" (click)="confirmar.set(u.id)" [attr.aria-label]="'Eliminar ' + u.usuario"><app-icono nombre="borrar" /></button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    .cabecera { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; }
    h1 { font-size: 1.625rem; }
    .conteo { display: flex; flex-wrap: wrap; gap: 16px; }
    .conteo strong { color: var(--ink); font-size: 1.125rem; }
    .nuevo { margin-left: auto; }
    .chica { font-size: 0.8125rem; }
    .campos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .roles { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 0; border: 0; }
    .roles legend { margin-bottom: 6px; font-size: 0.75rem; font-weight: 600;  color: var(--ink-2); }
    .roles:disabled { opacity: 0.6; }
    .rol { display: flex; gap: 10px; padding: 12px; border: 1px solid var(--rule); border-radius: 12px; cursor: pointer; transition: border-color 160ms var(--ease), background-color 160ms var(--ease); }
    .rol:hover { border-color: var(--blue); }
    .rol--activo { border-color: var(--blue); background: var(--blue-wash); }
    .rol input { margin-top: 3px; accent-color: var(--blue); }
    .rol > span { display: grid; gap: 2px; font-size: 0.875rem; }
    .rol .muted { font-size: 0.8125rem; }
    .pie { display: flex; justify-content: flex-end; gap: 12px; padding: 0 20px 20px; }
    .margen { margin: 0 20px 16px; }
    .buscar { position: relative; width: 16rem; }
    .buscar app-icono { position: absolute; left: 12px; top: 11px; color: var(--ink-3); }
    .buscar input { padding-left: 38px; }
    .quien { display: grid; text-align: left; font-weight: 400; }
    .nombre { font-weight: 600; }
    .yo { margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: var(--blue-wash); color: var(--blue); font-size: 0.6875rem; font-weight: 600;  vertical-align: 2px; }
    .etiqueta { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--sunken); font-size: 0.6875rem; font-weight: 600; }
    tr.inactivo .nombre, tr.inactivo .etiqueta { color: var(--ink-3); }
    .acciones { text-align: right; white-space: nowrap; width: 1%; }
    .confirmar { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--alert); }
    @media (max-width: 860px) {
      .campos, .roles { grid-template-columns: 1fr; }
      .nuevo { margin-left: 0; }
      .buscar { width: 100%; }
      .plancha__cabeza { flex-wrap: wrap; }
      h1 { font-size: 1.375rem; }
    }
  `,
})
export class Usuarios {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  protected readonly roles = ROLES;
  protected readonly titulo = titulo;
  protected readonly fechaHora = fechaHora;
  protected readonly hace = (v: string) => hace(v);

  protected readonly forma = signal<Forma | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForma = signal<string | null>(null);
  protected readonly errorLista = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly confirmar = signal<number | null>(null);
  protected readonly busqueda = signal('');

  protected readonly lista = recurso(() => true, () => this.api.usuarios());

  protected readonly filas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const l = [...(this.lista.valor() ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.usuario.localeCompare(b.usuario));
    return q ? l.filter((u) => u.usuario.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q)) : l; });

  protected readonly conteo = computed(() =>
    ROLES.map((r) => ({ ...r, n: (this.lista.valor() ?? []).filter((u) => u.rol === r.valor && u.activo).length })).map((r) => ({
      ...r,
      texto: r.texto.toLowerCase() + (r.n === 1 ? '' : 'es'),
    })),
  );

  esYo(id: number | null): boolean {
    return id !== null && id === this.auth.usuario()?.id; }

  nuevo(): void {
    this.errorForma.set(null);
    this.forma.set({ id: null, usuario: '', nombre: '', rol: 'DISPENSADOR', password: '' }); }

  editar(u: Usuario): void {
    this.errorForma.set(null);
    this.forma.set({ id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, password: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' }); }

  guardar(): void {
    const f = this.forma();
    if (!f) return;
    if (!f.id && !/^[A-Za-z0-9._-]{3,50}$/.test(f.usuario)) {
      return this.errorForma.set('El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion o guion bajo.'); }
    if (!f.nombre.trim()) return this.errorForma.set('Escriba el nombre.');
    if ((!f.id || f.password) && f.password.length < 8) return this.errorForma.set('La contraseña debe tener al menos 8 caracteres.');

    this.guardando.set(true);
    this.errorForma.set(null);
    const peticion = f.id
      ? this.api.actualizarUsuario(f.id, {
          nombre: f.nombre.trim(),
          ...(this.esYo(f.id) ? {} : { rol: f.rol }),
          ...(f.password ? { password: f.password } : {}),
        })
      : this.api.crearUsuario({ usuario: f.usuario.trim(), nombre: f.nombre.trim(), password: f.password, rol: f.rol });
    peticion.subscribe({
      next: (u) => {
        this.lista.ajustar((l) => [...(l ?? []).filter((x) => x.id !== u.id), u]);
        this.guardando.set(false);
        this.forma.set(null);
        this.mostrarAviso(f.id ? `Se guardaron los cambios de ${u.usuario}.` : `Usuario ${u.usuario} creado. Compártale su contraseña por un medio seguro.`); },
      error: (e) => {
        this.errorForma.set(mensajeError(e));
        this.guardando.set(false); },
    }); }

  alternar(u: Usuario): void {
    this.actualizar(u, { activo: !u.activo }, u.activo ? `${u.usuario} ya no puede iniciar sesión.` : `${u.usuario} puede volver a iniciar sesión.`); }

  eliminar(u: Usuario): void {
    this.guardando.set(true);
    this.errorLista.set(null);
    this.api.eliminarUsuario(u.id).subscribe({
      next: () => {
        this.lista.ajustar((l) => (l ?? []).filter((x) => x.id !== u.id));
        this.confirmar.set(null);
        this.guardando.set(false);
        this.mostrarAviso(`Usuario ${u.usuario} eliminado.`); },
      error: (e) => {
        this.errorLista.set(mensajeError(e));
        this.guardando.set(false); },
    }); }

  private actualizar(u: Usuario, datos: UsuarioActualizar, texto: string): void {
    this.guardando.set(true);
    this.errorLista.set(null);
    this.api.actualizarUsuario(u.id, datos).subscribe({
      next: (nuevo) => {
        this.lista.ajustar((l) => (l ?? []).map((x) => (x.id === nuevo.id ? nuevo : x)));
        this.guardando.set(false);
        this.mostrarAviso(texto); },
      error: (e) => {
        this.errorLista.set(mensajeError(e));
        this.guardando.set(false); },
    }); }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    setTimeout(() => this.aviso() === texto && this.aviso.set(null), 5000); }
}
