import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
// On importe UNIQUEMENT le TYPE du routeur du serveur (aucun code serveur n'arrive dans le navigateur).
// Grâce à lui, chaque appel est vérifié par TypeScript : nom de la procédure, paramètres et réponse.
import type { AppRouter } from '../../../../../back/server/routers';

/**
 * tRPC envoie ses requêtes avec `fetch`. On lui donne à la place une fonction qui passe par
 * le HttpClient d'Angular : ainsi TOUS les appels au back traversent les intercepteurs
 * (indicateur de chargement global, session expirée → reconnexion).
 */
function fetchWithHttpClient(http: HttpClient) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const headers = new HttpHeaders((init?.headers ?? {}) as Record<string, string>);
    try {
      const response: HttpResponse<string> = await firstValueFrom(
        http.request(init?.method ?? 'GET', url, {
          body: init?.body ?? null,
          headers,
          observe: 'response',
          responseType: 'text',
          withCredentials: true, // envoie le cookie de session du back
        }),
      );
      return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json' } });
    } catch (error) {
      // Réponse d'erreur du serveur (400, 401, 404…) : on la rend à tRPC, qui lit le message d'erreur
      if (error instanceof HttpErrorResponse && error.status > 0) {
        const body = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        return new Response(body, { status: error.status, headers: { 'content-type': 'application/json' } });
      }
      throw error; // réseau coupé : tRPC signale l'erreur
    }
  };
}

/**
 * Client tRPC « vanilla » : il appelle les procédures existantes du back (port 3000).
 * L'adresse est relative (/api/trpc) : en développement, le proxy d'Angular la transmet au serveur,
 * donc le cookie de session fonctionne sans modifier le serveur.
 */
@Injectable({ providedIn: 'root' })
export class TrpcService {
  readonly client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson, // même format que le serveur (dates, etc.)
        fetch: fetchWithHttpClient(inject(HttpClient)),
      }),
    ],
  });
}

/** Type du client, pour déduire les types des réponses : TrpcClient['catalog']['home']['query'] */
export type TrpcClient = TrpcService['client'];
