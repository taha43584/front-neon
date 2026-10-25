import { Routes } from '@angular/router';

/** Espace NÉON : liste des ateliers et configurateur d'un atelier (/neon/:slug), chargés à la demande */
export const NEON_ROUTES: Routes = [
  { path: 'neon', loadComponent: () => import('./neon-workshops.page').then((m) => m.NeonWorkshopsPage), title: 'Créer mon néon — Elegance Deco' },
  { path: 'neon/:slug', loadComponent: () => import('./neon-configurator.page').then((m) => m.NeonConfiguratorPage), title: 'Créer mon néon — Elegance Deco' },
];
