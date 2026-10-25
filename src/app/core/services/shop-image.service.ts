import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, filter, map, throwError } from 'rxjs';
// Dimensions, formats et poids partagés avec le serveur : importés, pas recopiés
import { SHOP_IMAGE_FORMAT_LABEL, SHOP_IMAGE_MAX_BYTES, SHOP_IMAGE_MIME_TYPES, SHOP_IMAGE_SPECS, type ShopImageSlot } from '@shared/shopValidation';
import type { CropArea } from '../../shared/components/image-cropper/image-cropper.component';

export type ShopImageEvent = { type: 'progress'; percent: number } | { type: 'done'; url: string };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Cette image ne peut pas être lue. Essayez un autre fichier.'));
    img.src = src;
  });

const toBlob = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));

/**
 * Logo (400 × 400) et couverture (1600 × 500) de la boutique : même comportement que le site React.
 * Le navigateur recadre et redimensionne aux dimensions EXACTES ; le serveur revérifie (format, poids, dimensions)
 * et déduit la boutique de la session (aucun identifiant envoyé).
 */
@Injectable({ providedIn: 'root' })
export class ShopImageService {
  private readonly http = inject(HttpClient);

  /** Vérification du fichier choisi, avant le recadrage */
  check(file: File): string | null {
    if (!(SHOP_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) return `Format non accepté : choisissez une image ${SHOP_IMAGE_FORMAT_LABEL}.`;
    if (file.size > SHOP_IMAGE_MAX_BYTES) return `Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} Mo) : 5 Mo maximum.`;
    if (file.size === 0) return 'Le fichier est vide.';
    return null;
  }

  /**
   * Découpe la zone choisie et la redimensionne aux dimensions finales. WEBP si le navigateur sait l'encoder,
   * sinon JPEG. Le réencodage supprime aussi les métadonnées (EXIF, position GPS…).
   */
  async crop(src: string, area: CropArea, slot: ShopImageSlot): Promise<Blob> {
    const { width, height } = SHOP_IMAGE_SPECS[slot];
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Votre navigateur ne permet pas de recadrer l'image.");
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#f4e9e0'; // fond beige sous les zones transparentes (PNG)
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);
    const webp = await toBlob(canvas, 'image/webp');
    const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg');
    if (!blob) throw new Error("L'image n'a pas pu être préparée. Essayez un autre fichier.");
    if (blob.size > SHOP_IMAGE_MAX_BYTES) throw new Error('Fichier trop lourd après recadrage : 5 Mo maximum.');
    return blob;
  }

  /** Envoi vers la route existante POST /api/vendor/shop/:slot, avec progression */
  upload(slot: ShopImageSlot, blob: Blob): Observable<ShopImageEvent> {
    return this.http
      .post<{ url?: string }>(`/api/vendor/shop/${slot}`, blob, {
        headers: { 'Content-Type': blob.type },
        reportProgress: true,
        observe: 'events',
        withCredentials: true,
      })
      .pipe(
        filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
        map((event): ShopImageEvent => {
          if (event.type === HttpEventType.UploadProgress) {
            return { type: 'progress', percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0 };
          }
          const url = (event as { body: { url?: string } | null }).body?.url;
          if (!url) throw new Error("Le serveur n'a pas confirmé l'envoi.");
          return { type: 'done', url };
        }),
        catchError((error: unknown) => {
          const message = error instanceof HttpErrorResponse
            ? (error.error as { error?: string } | null)?.error ?? `Échec de l'envoi (erreur ${error.status}). Réessayez.`
            : error instanceof Error ? error.message : "Échec de l'envoi. Réessayez.";
          return throwError(() => new Error(message));
        }),
      );
  }
}
