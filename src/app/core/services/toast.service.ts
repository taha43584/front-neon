import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; text: string; tone: 'info' | 'succes' | 'erreur'; link?: { label: string; url: string } }

/**
 * Petites notifications (comme les « toasts » du site React) : 3 au plus, fermées seules après 4 s.
 * Elles sont lues par les lecteurs d'écran (zone aria-live du composant ToastHost).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(text: string, tone: Toast['tone'] = 'info', link?: Toast['link']) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-2), { id, text, tone, link }]);
    setTimeout(() => this.dismiss(id), 4000);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
