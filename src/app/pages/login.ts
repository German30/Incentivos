import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/errores';
import { FiltrosService } from '../core/filtros.service';
import { Icono } from '../shared/icono';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hoja">
      <section class="marca" aria-label="Incentivos">
        <svg class="ondas" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true">
          @for (o of ondas; track $index) { <path [attr.d]="o" /> }
        </svg>
        <p class="logo"><span class="logo-m" aria-hidden="true"><app-icono nombre="venta" [tam]="18" /></span>Incentivos</p>
        <div class="lema">
          <h2>Cada venta, leída contra su meta.</h2>
          <ul>
            <li><app-icono nombre="ok" [tam]="18" />Avance de dispensadores en 18 SKUs, 5 SKUs y SOLURAL</li>
            <li><app-icono nombre="ok" [tam]="18" />Proyección al cierre y bono por sucursal</li>
            <li><app-icono nombre="ok" [tam]="18" />Comisiones de doctores por categoría</li>
          </ul>
        </div>
      </section>

      <section class="panel">
        <form class="plancha forma" (ngSubmit)="entrar()" #forma="ngForm" novalidate>
          <div class="cuerpo">
            <div>
              <h1>Iniciar sesión</h1>
              <p class="muted sub">Ventas, metas, incentivos y comisiones del periodo, según su rol.</p>
            </div>

            @if (expirada()) {
              <p class="aviso aviso--info" role="status">Su sesión expiró. Vuelva a entrar para continuar.</p>
            }

            <label class="campo">
              <span>Usuario</span>
              <input class="entrada" name="usuario" autocomplete="username" required [(ngModel)]="usuario"
                     [attr.aria-invalid]="!!error()" autofocus />
            </label>
            <label class="campo">
              <span>Contraseña</span>
              <span class="con-boton">
                <input class="entrada" name="password" [type]="ver() ? 'text' : 'password'" autocomplete="current-password"
                       required [(ngModel)]="password" [attr.aria-invalid]="!!error()" />
                <button type="button" class="ver" (click)="ver.set(!ver())" [attr.aria-pressed]="ver()">
                  {{ ver() ? 'Ocultar' : 'Mostrar' }}
                </button>
              </span>
            </label>

            @if (error(); as e) {
              <p class="aviso" role="alert"><app-icono nombre="alerta" />{{ e }}</p>
            }

            <button type="submit" class="btn btn--primario enviar" [disabled]="enviando() || !usuario || !password"
                    [attr.aria-busy]="enviando()">
              {{ enviando() ? 'Entrando…' : 'Entrar' }}
            </button>
            <p class="nota muted">¿Olvidó su contraseña? Pida al administrador que la restablezca desde Usuarios.</p>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; }
    .hoja { display: grid; grid-template-columns: minmax(0, 1fr) minmax(400px, 1fr); min-height: 100dvh; }
    .marca {
      position: relative; overflow: hidden; display: grid; grid-template-rows: auto 1fr; padding: 40px 48px;
      color: #fff; background: linear-gradient(150deg, #2a5ea6 0%, var(--blue) 40%, var(--navy-deep) 100%);
    }
    .ondas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .ondas path { fill: none; stroke: rgba(255, 255, 255, 0.08); stroke-width: 1.2; }
    .logo { position: relative; display: inline-flex; align-items: center; gap: 10px; font-size: 1.125rem; font-weight: 700; }
    .logo-m { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #fff; color: var(--blue); }
    .lema { position: relative; align-self: end; display: grid; gap: 24px; max-width: 30rem; }
    .lema h2 { font-size: clamp(2rem, 3.4vw, 2.75rem); font-weight: 700; line-height: 1.1; letter-spacing: -0.025em; }
    .lema ul { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; color: rgba(255, 255, 255, 0.86); }
    .lema li { display: flex; align-items: center; gap: 10px; }
    .lema li app-icono { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255, 255, 255, 0.14); }
    .panel { display: grid; place-items: center; padding: 48px 32px; }
    .forma { width: 100%; max-width: 26rem; }
    .cuerpo { display: grid; gap: 18px; padding: 32px; }
    h1 { font-size: 1.5rem; }
    .sub { margin-top: 6px; font-size: 0.875rem; }
    .con-boton { position: relative; display: block; }
    .con-boton .entrada { padding-right: 88px; }
    .ver {
      position: absolute; right: 4px; top: 4px; bottom: 4px; padding: 0 12px; border: 0; border-radius: 8px;
      background: transparent; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: var(--blue);
    }
    .ver:hover { background: var(--blue-wash); }
    .aviso app-icono { margin-top: 1px; }
    .enviar { width: 100%; min-height: 46px; }
    .nota { font-size: 0.8125rem; text-align: center; }
    @media (max-width: 860px) {
      .hoja { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .marca { padding: 24px 20px 28px; gap: 28px; }
      .lema ul { display: none; }
      .lema h2 { font-size: 1.625rem; }
      .panel { place-items: start center; padding: 0 16px 32px; margin-top: -16px; }
      .cuerpo { padding: 24px 20px; }
    }
  `,
})
export class Login {
  protected readonly ondas = Array.from({ length: 22 }, (_, i) => {
    const y = 120 + i * 26;
    return `M-20 ${y} C 160 ${y - 120}, 320 ${y + 140}, 620 ${y - 60}`;
  });

  private readonly auth = inject(AuthService);
  private readonly filtros = inject(FiltrosService);
  private readonly router = inject(Router);

  protected usuario = '';
  protected password = '';
  protected readonly ver = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expirada = signal(inject(ActivatedRoute).snapshot.queryParamMap.has('expirada'));

  entrar(): void {
    if (!this.usuario || !this.password || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    this.auth.login(this.usuario.trim(), this.password).subscribe({
      next: () => {
        this.filtros.reiniciar();
        void this.router.navigateByUrl(this.auth.inicio());
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }
}
