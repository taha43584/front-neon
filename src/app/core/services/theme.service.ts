import { Injectable, signal } from '@angular/core';

export type ThemeChoice = 'auto' | 'clair' | 'sombre';
const KEY = 'elegance-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'clair' || v === 'sombre' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Thème du site (A-10e) : « Automatique » suit le réglage du téléphone / de l'ordinateur (prefers-color-scheme),
 * « Clair » et « Sombre » l'imposent. Le choix est gardé dans localStorage.
 * Le premier thème est posé par le script de index.html AVANT l'affichage (pas de flash blanc) ;
 * ce service applique ensuite les changements (choix dans « Compte », ou réglage de l'appareil qui change).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly choice = signal<ThemeChoice>(readChoice());
  private readonly media = typeof matchMedia === 'function' ? matchMedia(DARK_QUERY) : null;

  constructor() {
    this.media?.addEventListener('change', () => this.apply());
  }

  set(choice: ThemeChoice) {
    this.choice.set(choice);
    try {
      if (choice === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* stockage bloqué : le choix vaut pour cette visite seulement */
    }
    this.apply();
  }

  private apply() {
    const choice = this.choice();
    const dark = choice === 'sombre' || (choice === 'auto' && !!this.media?.matches);
    const set = () => {
      document.documentElement.setAttribute('data-theme', dark ? 'sombre' : 'clair');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c1714' : '#faf8f4');
    };
    // Les couleurs sombres (theme-sombre.css) ne sont téléchargées qu'au premier passage en sombre :
    // on change de thème une fois le fichier arrivé (sinon la page passerait un instant par des couleurs mélangées)
    if (dark && !document.getElementById('theme-sombre')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'theme-sombre.css';
      link.id = 'theme-sombre';
      link.onload = set;
      link.onerror = set;
      document.head.appendChild(link);
    } else {
      set();
    }
  }
}
