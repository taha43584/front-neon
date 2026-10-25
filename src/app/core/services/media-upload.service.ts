import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, filter, map, throwError } from 'rxjs';
// Limites partagées avec le serveur (formats et tailles) : importées, pas recopiées
import { MEDIA_LIMITS } from '@shared/productValidation';

export type MediaKind = 'image' | 'video';
export interface UploadedMedia { id: number; url: string; kind: MediaKind; mimeType: string; sizeBytes: number }

/** Évènement d'envoi : progression (0–100 %) puis fichier enregistré par le serveur */
export type UploadEvent = { type: 'progress'; percent: number } | { type: 'done'; media: UploadedMedia };

/**
 * Envoi de photos et vidéos vers la route existante POST /api/uploads (réservée aux vendeurs validés).
 * HttpClient avec reportProgress : on suit la progression de l'envoi, et la requête passe par l'intercepteur.
 */
@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly http = inject(HttpClient);

  /** Vérification avant l'envoi (le serveur revérifie la vraie signature du fichier) */
  check(file: File, kind: MediaKind): string | null {
    const limits = MEDIA_LIMITS[kind];
    if (!(limits.mimeTypes as readonly string[]).includes(file.type)) return `« ${file.name} » : format non accepté (${limits.label}).`;
    if (file.size > limits.maxBytes) return `« ${file.name} » est trop volumineux (${limits.label}).`;
    if (file.size === 0) return `« ${file.name} » est vide.`;
    return null;
  }

  upload(file: File, kind: MediaKind): Observable<UploadEvent> {
    const url = `/api/uploads?kind=${kind}&name=${encodeURIComponent(file.name.slice(0, 120))}`;
    return this.http
      .post<UploadedMedia>(url, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        reportProgress: true, // évènements de progression pendant l'envoi
        observe: 'events',
        withCredentials: true,
      })
      .pipe(
        filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
        map((event): UploadEvent => {
          if (event.type === HttpEventType.UploadProgress) {
            return { type: 'progress', percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0 };
          }
          const media = (event as { body: UploadedMedia | null }).body;
          if (!media?.id || !media.url) throw new Error("Le serveur n'a pas confirmé l'envoi.");
          return { type: 'done', media };
        }),
        // Message d'erreur du serveur (« Format non accepté », « Boutique non validée »…)
        catchError((error: unknown) => {
          const message = error instanceof HttpErrorResponse
            ? (error.error as { error?: string } | null)?.error ?? `Échec de l'envoi (erreur ${error.status}).`
            : error instanceof Error ? error.message : "Échec de l'envoi.";
          return throwError(() => new Error(message));
        }),
      );
  }
}
