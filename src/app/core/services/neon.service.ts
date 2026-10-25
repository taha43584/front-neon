import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, filter, map, throwError } from 'rxjs';
import { NEON_PRODUCT_SLUG, type NeonLineRequest } from '@shared/neon';
import { MEDIA_LIMITS } from '@shared/productValidation';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/** Atelier visible (boutique active + offre néon complète), type déduit du serveur */
export type NeonWorkshop = Awaited<ReturnType<TrpcClient['catalog']['neonOffers']['query']>>[number];
export type NeonQuoteInput = Parameters<TrpcClient['neon']['requestQuote']['mutate']>[0];

/** Envoi du logo : progression (0–100 %) puis identifiant du fichier enregistré */
export type LogoUploadEvent = { type: 'progress'; percent: number } | { type: 'done'; mediaId: number };

/**
 * Néon personnalisé : uniquement des procédures et routes EXISTANTES du serveur (aucune modifiée).
 * Le navigateur calcule une estimation avec la fonction partagée ; le prix qui fait foi vient de catalog.quoteCart.
 */
@Injectable({ providedIn: 'root' })
export class NeonService {
  private readonly trpc = inject(TrpcService).client;
  private readonly http = inject(HttpClient);

  /** Ateliers visibles, dans l'ordre « aléatoire stable du jour » choisi par le serveur */
  workshops() {
    return this.trpc.catalog.neonOffers.query();
  }

  /** Un atelier, ou null (slug inconnu, boutique inactive, offre désactivée ou incomplète) */
  workshop(shopSlug: string) {
    return this.trpc.catalog.neonWorkshop.query({ shopSlug });
  }

  /** Prix d'UNE pièce recalculé par le serveur avec les tarifs actuels de l'atelier (même appel que le panier) */
  async confirmPrice(shopSlug: string, request: NeonLineRequest) {
    const quote = await this.trpc.catalog.quoteCart.query({
      lines: [{ productSlug: NEON_PRODUCT_SLUG, quantity: 1, neon: { shopSlug, ...request } }],
    });
    return quote.lines[0];
  }

  /** Vérification avant l'envoi (le serveur revérifie le vrai format du fichier) — mêmes limites que les photos */
  checkLogo(file: File): string | null {
    const limits = MEDIA_LIMITS.image;
    if (!(limits.mimeTypes as readonly string[]).includes(file.type)) return `Format non accepté (${limits.label}).`;
    if (file.size > limits.maxBytes) return `Image trop volumineuse (${limits.label}).`;
    if (file.size === 0) return 'Le fichier est vide.';
    return null;
  }

  /** POST /api/neon/quote-logo (réservé aux comptes Client) : corps brut = l'image */
  uploadLogo(file: File, shopSlug: string): Observable<LogoUploadEvent> {
    const url = `/api/neon/quote-logo?shop=${encodeURIComponent(shopSlug)}&name=${encodeURIComponent(file.name.slice(0, 120))}`;
    return this.http
      .post<{ id: number }>(url, file, {
        headers: { 'Content-Type': 'application/octet-stream' },
        reportProgress: true,
        observe: 'events',
        withCredentials: true,
      })
      .pipe(
        filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
        map((event): LogoUploadEvent => {
          if (event.type === HttpEventType.UploadProgress) {
            return { type: 'progress', percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0 };
          }
          const id = (event as { body: { id?: number } | null }).body?.id;
          if (!id) throw new Error("Le logo n'a pas pu être envoyé.");
          return { type: 'done', mediaId: id };
        }),
        catchError((error: unknown) => {
          const message = error instanceof HttpErrorResponse
            ? (error.error as { error?: string } | null)?.error ?? "Le logo n'a pas pu être envoyé."
            : error instanceof Error ? error.message : "Le logo n'a pas pu être envoyé.";
          return throwError(() => new Error(message));
        }),
      );
  }

  /** Demande de devis enregistrée (le logo a été envoyé juste avant) */
  requestQuote(input: NeonQuoteInput) {
    return this.trpc.neon.requestQuote.mutate(input);
  }
}
