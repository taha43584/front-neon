import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { AuthService } from '../services/auth.service';

/**
 * Intercepteur HTTP : TOUTES les requêtes vers le back passent par ici (tRPC utilise HttpClient).
 * 1. Chargement global : compteur +1 au départ, −1 à l'arrivée (finalize, même en cas d'erreur).
 * 2. Erreur 401 (session expirée) : on oublie l'utilisateur et on renvoie vers la connexion,
 *    avec l'adresse actuelle pour y revenir ensuite (?retour=…).
 *    Exception : auth.login, où 401 veut juste dire « mauvais mot de passe ».
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(LoadingService);
  const router = inject(Router);
  const injector = inject(Injector);

  loading.start();
  return next(request).pipe(
    catchError((error: unknown) => {
      const isLogin = request.url.includes('auth.login');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isLogin) {
        // AuthService est récupéré ici seulement (et pas au démarrage) pour éviter une dépendance circulaire :
        // AuthService → tRPC → HttpClient → intercepteur → AuthService
        injector.get(AuthService).user.set(null);
        const current = router.url;
        if (!current.startsWith('/connexion')) {
          void router.navigate(['/connexion'], { queryParams: { retour: current, session: 'expiree' } });
        }
      }
      return throwError(() => error);
    }),
    finalize(() => loading.stop()),
  );
};
