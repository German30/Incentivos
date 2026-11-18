import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

export interface LineaPista {
  etiqueta: string;
  valor: string;
  color?: string;
}

export interface ContenidoPista {
  titulo: string;
  lineas: LineaPista[];
}

let nodo: HTMLElement | null = null;

function obtenerNodo(doc: Document): HTMLElement {
  if (nodo && doc.body.contains(nodo)) return nodo;
  nodo = doc.createElement('div');
  nodo.className = 'pista';
  nodo.setAttribute('role', 'tooltip');
  doc.body.appendChild(nodo);
  return nodo;
}

/**
 * Tooltip de gráfica en una capa fija: nunca lo recorta un contenedor con overflow.
 * Se muestra igual con hover que con foco de teclado; el valor también está en la tabla.
 */
@Directive({
  selector: '[appPista]',
  host: {
    '(mouseenter)': 'mostrar()',
    '(mousemove)': 'mover($event)',
    '(mouseleave)': 'ocultar()',
    '(focus)': 'mostrar(true)',
    '(blur)': 'ocultar()',
  },
})
export class Pista implements OnDestroy {
  readonly appPista = input.required<ContenidoPista | null>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private visible = false;

  mostrar(porFoco = false): void {
    const contenido = this.appPista();
    if (!contenido) return;
    const n = obtenerNodo(this.doc);
    n.replaceChildren();
    const t = this.doc.createElement('strong');
    t.textContent = contenido.titulo;
    n.appendChild(t);
    for (const l of contenido.lineas) {
      const fila = this.doc.createElement('span');
      if (l.color) {
        const m = this.doc.createElement('i');
        m.style.background = l.color;
        fila.appendChild(m);
      }
      const e = this.doc.createElement('em');
      e.textContent = l.etiqueta;
      const v = this.doc.createElement('b');
      v.textContent = l.valor;
      fila.append(e, v);
      n.appendChild(fila);
    }
    n.classList.add('pista--visible');
    this.visible = true;
    if (porFoco) {
      const r = this.el.nativeElement.getBoundingClientRect();
      this.colocar(r.left + r.width / 2, r.top);
    }
  }

  mover(evento: MouseEvent): void {
    if (this.visible) this.colocar(evento.clientX, evento.clientY);
  }

  ocultar(): void {
    if (!this.visible) return;
    this.visible = false;
    nodo?.classList.remove('pista--visible');
  }

  ngOnDestroy(): void {
    this.ocultar();
  }

  private colocar(x: number, y: number): void {
    const n = obtenerNodo(this.doc);
    const { width, height } = n.getBoundingClientRect();
    const margen = 12;
    let left = x + 16;
    let top = y - height - 12;
    if (left + width > innerWidth - margen) left = x - width - 16;
    if (top < margen) top = y + 20;
    n.style.transform = `translate(${Math.max(margen, left)}px, ${top}px)`;
  }
}
