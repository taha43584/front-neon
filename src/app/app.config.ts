import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { onRouteTransition } from './core/layout/route-transition';

// Dates en français (« 18 octobre 2026 ») pour le pipe date
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Les paramètres d'URL (/produit/:slug) arrivent directement dans les input() des pages
      withComponentInputBinding(),
      // Nouvelle page : retour en haut
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      // A-10d : glissement de page vers / depuis la fiche produit, sur téléphone seulement (voir route-transition.ts)
      withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: onRouteTransition }),
    ),
    // Tous les appels au back (tRPC) passent par HttpClient, donc par l'intercepteur
    provideHttpClient(withInterceptors([apiInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr' },
  ],
};
