import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { ANONYMOUS_AUTHOR, MAX_REVIEW_PHOTOS, REVIEW_BODY_MAX, REVIEW_BODY_MIN, REVIEW_CRITERIA, REVIEW_PHOTO_LIMITS, reviewSubmissionSchema } from '@shared/reviewRules';
import { ReviewableLine, ReviewsService } from '../../../core/services/reviews.service';
import { StarInputComponent } from '../../../shared/components/stars/star-input.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface DraftPhoto { key: number; preview: string; id: number | null; error: string | null }
let nextKey = 0;

/**
 * « Donner mon avis » sur UNE ligne de commande livrée (A-10c), dans un <dialog> natif (Échap, focus enfermé).
 * Le nom public est affiché AVANT l'envoi (« Sarra D. · Sousse ») ; « Publier anonymement » le remplace
 * par « Client vérifié », sans gouvernorat. Les photos partent dès leur choix (privées jusqu'à la publication).
 */
@Component({
  selector: 'app-review-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StarInputComponent, IconComponent],
  templateUrl: './review-form-dialog.component.html',
  styleUrl: './review-form-dialog.component.css',
})
export class ReviewFormDialogComponent {
  private readonly reviews = inject(ReviewsService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** Avis envoyé : la page recharge ses listes */
  readonly sent = output<void>();

  readonly criteria = REVIEW_CRITERIA;
  readonly bodyMin = REVIEW_BODY_MIN;
  readonly bodyMax = REVIEW_BODY_MAX;
  readonly maxPhotos = MAX_REVIEW_PHOTOS;
  readonly photoLabel = REVIEW_PHOTO_LIMITS.label;
  readonly acceptTypes = REVIEW_PHOTO_LIMITS.mimeTypes.join(',');

  readonly line = signal<ReviewableLine | null>(null);
  readonly rating = signal(0);
  readonly qualityRating = signal(0);
  readonly conformityRating = signal(0);
  readonly deliveryRating = signal(0);
  readonly body = signal('');
  readonly anonymous = signal(false);
  readonly photos = signal<DraftPhoto[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');

  /** Ce qui sera publié : « Sarra D. · Sousse », ou « Client vérifié » si anonyme */
  readonly publicIdentity = computed(() => {
    const l = this.line();
    if (!l || this.anonymous() || !l.publicName) return ANONYMOUS_AUTHOR;
    return l.publicGovernorate ? `${l.publicName} · ${l.publicGovernorate}` : l.publicName;
  });
  readonly uploading = computed(() => this.photos().some((p) => p.id === null && !p.error));

  open(line: ReviewableLine) {
    this.line.set(line);
    this.rating.set(0);
    this.qualityRating.set(0);
    this.conformityRating.set(0);
    this.deliveryRating.set(0);
    this.body.set('');
    this.anonymous.set(false);
    this.photos().forEach((p) => URL.revokeObjectURL(p.preview));
    this.photos.set([]);
    this.error.set('');
    this.dialog().nativeElement.showModal();
  }
  close() {
    const d = this.dialog().nativeElement;
    if (d.open) d.close();
  }
  onBackdrop(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) this.close();
  }

  ratingOf(key: (typeof REVIEW_CRITERIA)[number]['key']) {
    return { qualityRating: this.qualityRating, conformityRating: this.conformityRating, deliveryRating: this.deliveryRating }[key];
  }

  async addPhotos(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      if (this.photos().length >= MAX_REVIEW_PHOTOS) {
        this.error.set(`${MAX_REVIEW_PHOTOS} photos au maximum.`);
        break;
      }
      const key = nextKey++;
      const problem = this.reviews.checkPhoto(file);
      this.photos.update((list) => [...list, { key, preview: URL.createObjectURL(file), id: null, error: problem }]);
      if (problem) continue;
      try {
        const { id } = await this.reviews.uploadPhoto(file);
        this.photos.update((list) => list.map((p) => (p.key === key ? { ...p, id } : p)));
      } catch (e) {
        this.photos.update((list) => list.map((p) => (p.key === key ? { ...p, error: e instanceof Error ? e.message : "La photo n'a pas pu être envoyée." } : p)));
      }
    }
  }
  removePhoto(key: number) {
    const photo = this.photos().find((p) => p.key === key);
    if (photo) URL.revokeObjectURL(photo.preview);
    this.photos.update((list) => list.filter((p) => p.key !== key));
  }

  async submit() {
    const line = this.line();
    if (!line) return;
    this.error.set('');
    if (this.uploading()) return this.error.set('Patientez : une photo est en cours d\'envoi.');
    if (this.photos().some((p) => p.error)) return this.error.set('Retirez les photos refusées avant d\'envoyer votre avis.');
    // Mêmes règles que le serveur (schéma partagé) ; le serveur revérifie tout
    const parsed = reviewSubmissionSchema.safeParse({
      orderItemId: line.orderItemId, rating: this.rating(), qualityRating: this.qualityRating(), conformityRating: this.conformityRating(),
      deliveryRating: this.deliveryRating(), body: this.body(), photoIds: this.photos().map((p) => p.id!), anonymous: this.anonymous(),
    });
    if (!parsed.success) return this.error.set(parsed.error.issues[0]?.message ?? 'Vérifiez votre avis.');
    this.saving.set(true);
    try {
      await this.reviews.submit(parsed.data);
      this.close();
      this.sent.emit();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "Votre avis n'a pas pu être envoyé.");
    } finally {
      this.saving.set(false);
    }
  }
}
