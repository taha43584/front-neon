import { Injectable, signal } from '@angular/core';

const RECENT_KEY = 'elegance-recherches';
const RECENT_MAX = 10;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/**
 * Écran de recherche du téléphone (A-10e) : état ouvert / fermé partagé entre l'en-tête (qui l'ouvre) et l'écran
 * (chargé à la demande), et « Recherches récentes » (10 au plus, gardées sur CET appareil dans localStorage).
 */
@Injectable({ providedIn: 'root' })
export class SearchScreenService {
  readonly isOpen = signal(false);
  readonly recent = signal<string[]>(readRecent());

  open() {
    this.isOpen.set(true);
  }
  close() {
    this.isOpen.set(false);
  }

  /** Recherche faite : en tête de liste, sans doublon (casse ignorée) */
  remember(query: string) {
    const q = query.trim();
    if (!q) return;
    this.save([q, ...this.recent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX));
  }
  forget(query: string) {
    this.save(this.recent().filter((r) => r !== query));
  }
  clear() {
    this.save([]);
  }

  private save(list: string[]) {
    this.recent.set(list);
    try {
      if (list.length) localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      else localStorage.removeItem(RECENT_KEY);
    } catch {
      /* stockage bloqué : la liste vaut pour cette visite seulement */
    }
  }
}
