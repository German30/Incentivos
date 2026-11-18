import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { FiltroReporte, Rango } from './api.models';
import { ApiService } from './api.service';
import { MESES, diasDelMes, iso, partes } from './formato';

const CLAVE = 'incentivos.filtros';

export type ModoPeriodo = 'mes' | 'rango';

export interface OpcionMes {
  valor: string; // YYYY-MM
  etiqueta: string;
}

interface Guardado {
  modo: ModoPeriodo;
  mes: string | null;
  inicio: string | null;
  fin: string | null;
  sucursal: string | null;
}

function leer(): Partial<Guardado> {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}') as Partial<Guardado>;
  } catch {
    return {};
  }
}

/** Filtro único (periodo y sucursal) que comparten todos los reportes. */
@Injectable({ providedIn: 'root' })
export class FiltrosService {
  private readonly api = inject(ApiService);
  private readonly guardado = leer();

  readonly rango = signal<Rango | null>(null);
  readonly sucursales = signal<string[]>([]);
  readonly errorCatalogo = signal(false);

  readonly modo = signal<ModoPeriodo>(this.guardado.modo ?? 'mes');
  readonly mes = signal<string | null>(this.guardado.mes ?? null);
  readonly inicio = signal<string | null>(this.guardado.inicio ?? null);
  readonly fin = signal<string | null>(this.guardado.fin ?? null);
  readonly sucursal = signal<string | null>(this.guardado.sucursal ?? null);

  private cargado = false;

  /** Meses con datos, del más reciente al más antiguo. */
  readonly meses = computed<OpcionMes[]>(() => {
    const r = this.rango();
    if (!r?.primera_venta || !r.ultima_venta) return [];
    const [a0, m0] = partes(r.primera_venta);
    let [a, m] = partes(r.ultima_venta);
    const lista: OpcionMes[] = [];
    while (a > a0 || (a === a0 && m >= m0)) {
      lista.push({ valor: `${a}-${String(m).padStart(2, '0')}`, etiqueta: `${MESES[m - 1]} ${a}` });
      m -= 1;
      if (m === 0) {
        m = 12;
        a -= 1;
      }
    }
    return lista;
  });

  /** Parámetros listos para la API; `undefined` mientras el catálogo no carga. */
  readonly filtro = computed<FiltroReporte | undefined>(() => {
    if (!this.rango()) return undefined;
    const sucursal = this.sucursal();
    if (this.modo() === 'rango' && this.inicio() && this.fin()) {
      return { fecha_inicio: this.inicio()!, fecha_fin: this.fin()!, sucursal };
    }
    const mes = this.mes();
    if (!mes) return { sucursal };
    const [a, m] = mes.split('-').map(Number);
    return { fecha_inicio: iso(a, m, 1), fecha_fin: iso(a, m, diasDelMes(a, m)), sucursal };
  });

  constructor() {
    effect(() => {
      const valor: Guardado = {
        modo: this.modo(),
        mes: this.mes(),
        inicio: this.inicio(),
        fin: this.fin(),
        sucursal: this.sucursal(),
      };
      try {
        sessionStorage.setItem(CLAVE, JSON.stringify(valor));
      } catch {
        // Sin almacenamiento: el filtro vive solo en la pestaña.
      }
    });
  }

  cargar(): void {
    if (this.cargado) return;
    this.cargado = true;
    this.api.rango().subscribe({
      next: (r) => {
        const defecto = r.periodo_por_defecto;
        if (!this.mes()) this.mes.set(defecto.fecha_inicio.slice(0, 7));
        if (!this.inicio()) this.inicio.set(defecto.fecha_inicio);
        if (!this.fin()) this.fin.set(defecto.fecha_fin);
        this.rango.set(r);
      },
      error: () => {
        this.cargado = false;
        this.errorCatalogo.set(true);
      },
    });
    this.api.sucursales().subscribe({ next: (s) => this.sucursales.set(s), error: () => this.sucursales.set([]) });
  }

  reintentar(): void {
    this.errorCatalogo.set(false);
    this.cargar();
  }

  reiniciar(): void {
    this.cargado = false;
    this.rango.set(null);
    this.sucursales.set([]);
    this.modo.set('mes');
    this.mes.set(null);
    this.inicio.set(null);
    this.fin.set(null);
    this.sucursal.set(null);
  }

  /** Mueve el mes un paso (−1 anterior, +1 siguiente) dentro de los meses con datos. */
  mover(paso: -1 | 1): void {
    const lista = this.meses();
    const i = lista.findIndex((o) => o.valor === this.mes());
    const siguiente = lista[i - paso];
    if (siguiente) this.mes.set(siguiente.valor);
  }
}
