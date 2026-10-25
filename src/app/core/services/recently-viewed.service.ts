import { Injectable, signal } from '@angular/core';

/** Ce qui est gardé : les identifiants seulement (jamais le nom, la photo ni le prix, toujours relus sur le serveur) */
export interface ViewedRef { id: number; slug: string }
const KEY = 'elegance-vus-recemment';
const MAX = 10;

function read(): ViewedRef[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x?.id) && typeof x?.slug === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/**
 * « Vus récemment » (A-10e) : les 10 dernières fiches ouvertes sur CET appareil (localStorage).
 * Le slug accompagne l'id parce que la fiche publique se lit par son slug (vendor.publicProduct) ;
 * l'id permet de vérifier que c'est bien le même produit. Un produit supprimé ou masqué est retiré de la liste.
 */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  readonly items = signal<ViewedRef[]>(read());

  add(id: number, slug: string) {
    this.save([{ id, slug }, ...this.items().filter((x) => x.id !== id)].slice(0, MAX));
  }
  remove(ids: number[]) {
    if (ids.length) this.save(this.items().filter((x) => !ids.includes(x.id)));
  }
  clear() {
    this.save([]);
  }

  private save(list: ViewedRef[]) {
    this.items.set(list);
    try {
      if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
      else localStorage.removeItem(KEY);
    } catch {
      /* stockage bloqué : la liste vaut pour cette visite seulement */
    }
  }
}
