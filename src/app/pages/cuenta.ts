import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { mensajeError } from '../core/errores';
import { fechaHora, titulo } from '../core/formato';

const MODULOS: Record<string, string> = {
  dispensadores: 'Dispensadores',
  sucursales: 'Sucursales',
  doctores: 'Doctores',
  sincronizacion: 'Sincronización',
  clasificacion: 'Clasificación',
  configuracion: 'Configuración',
  usuarios: 'Usuarios',
};

@Component({
  selector: 'app-cuenta',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecera">
      <h1>Cuenta</h1>
    </header>

    <div class="dos">
      <section class="plancha" aria-labelledby="t-yo">
        <div class="plancha__cabeza"><h2 id="t-yo" class="rotulo">Sesión</h2></div>
        @if (auth.usuario(); as u) {
          <div class="plancha__cuerpo">
            <p class="nombre">{{ u.nombre }}</p>
            <p class="muted">{{ u.usuario }} · {{ titulo(u.rol) }}</p>
            <dl class="libro">
              <div><dt>Último acceso</dt><dd>{{ fechaHora(u.ultimo_acceso) }}</dd></div>
              <div><dt>Cuenta creada</dt><dd>{{ fechaHora(u.creado_en) }}</dd></div>
            </dl>
            <p class="rotulo rotulo--tinta mods-t">Puede ver</p>
            <ul class="mods">
              @for (m of modulos(); track m) { <li>{{ m }}</li> }
            </ul>
          </div>
        }
      </section>

      <form class="plancha" (ngSubmit)="cambiar()" aria-labelledby="t-pass">
        <div class="plancha__cabeza"><h2 id="t-pass" class="rotulo">Cambiar contraseña</h2></div>
        <div class="plancha__cuerpo campos">
          <label class="campo">
            <span>Contraseña actual</span>
            <input class="entrada" type="password" name="actual" autocomplete="current-password" required [(ngModel)]="actual" />
          </label>
          <label class="campo">
            <span>Contraseña nueva</span>
            <input class="entrada" type="password" name="nueva" autocomplete="new-password" required minlength="8" [(ngModel)]="nueva"
                   aria-describedby="ayuda-pass" />
          </label>
          <label class="campo">
            <span>Repita la contraseña nueva</span>
            <input class="entrada" type="password" name="repetir" autocomplete="new-password" required [(ngModel)]="repetir"
                   [attr.aria-invalid]="repetir && repetir !== nueva" />
          </label>
          <p id="ayuda-pass" class="muted chica">Mínimo 8 caracteres.</p>
          @if (error(); as e) { <p class="aviso" role="alert">{{ e }}</p> }
          @if (listo()) { <p class="aviso aviso--info" role="status">Contraseña actualizada. Úsela la próxima vez que entre.</p> }
          <button type="submit" class="btn btn--primario" [disabled]="enviando()">{{ enviando() ? 'Guardando…' : 'Cambiar contraseña' }}</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    :host { display: grid; gap: 24px; }
    h1 { font-size: 1.625rem; }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    .nombre { font-size: 1.75rem; font-weight: 600; line-height: 1.1; }
    .libro { display: grid; grid-template-columns: 1fr 1fr; margin: 20px 0 0; border-top: 1px solid var(--grid); }
    .libro > div { padding: 14px 16px 0 0; }
    .libro > div + div { padding-left: 16px; border-left: 1px solid var(--grid); }
    dt { font-size: 0.6875rem; font-weight: 600;  color: var(--ink-2); }
    dd { margin: 6px 0 0; }
    .mods-t { margin-top: 24px; }
    .mods { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; padding: 0; list-style: none; }
    .mods li { padding: 4px 12px; border-radius: 999px; background: var(--blue-wash); color: var(--blue); font-size: 0.75rem; font-weight: 600; }
    .campos { display: grid; gap: 16px; }
    .chica { font-size: 0.8125rem; margin-top: -8px; }
    button[type='submit'] { justify-self: start; }
    @media (max-width: 860px) {
      .dos { grid-template-columns: 1fr; }
      h1 { font-size: 1.375rem; }
    }
  `,
})
export class Cuenta {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  protected readonly titulo = titulo;
  protected readonly fechaHora = fechaHora;
  protected readonly modulos = computed(() => [...this.auth.modulos()].map((m) => MODULOS[m]).filter(Boolean));

  protected actual = '';
  protected nueva = '';
  protected repetir = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listo = signal(false);

  cambiar(): void {
    this.listo.set(false);
    if (!this.actual) return this.error.set('Escriba su contraseña actual.');
    if (this.nueva.length < 8) return this.error.set('La contraseña nueva debe tener al menos 8 caracteres.');
    if (this.nueva !== this.repetir) return this.error.set('Las contraseñas nuevas no coinciden.');
    this.enviando.set(true);
    this.error.set(null);
    this.api.cambiarPassword({ password_actual: this.actual, password_nueva: this.nueva }).subscribe({
      next: () => {
        this.actual = this.nueva = this.repetir = '';
        this.enviando.set(false);
        this.listo.set(true); },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.enviando.set(false); },
    }); }
}
