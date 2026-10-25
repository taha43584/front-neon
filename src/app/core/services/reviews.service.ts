import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { REVIEW_PHOTO_LIMITS, type ReviewFilter, type ReviewSort, type ReviewSubmission } from '@shared/reviewRules';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/** Types déduits du serveur (aucune recopie) */
export type ReviewsOverview = Awaited<ReturnType<TrpcClient['reviews']['overview']['query']>>;
export type ReviewSummary = ReviewsOverview['product'];
export type ReviewsPage = Awaited<ReturnType<TrpcClient['reviews']['page']['query']>>;
export type PublicReview = ReviewsPage['items'][number];
export type CustomerPhoto = Awaited<ReturnType<TrpcClient['reviews']['photos']['query']>>[number];
export type ReviewableLine = Awaited<ReturnType<TrpcClient['reviews']['reviewableLines']['query']>>[number];
export type VendorReview = Awaited<ReturnType<TrpcClient['vendor']['customerReviews']['query']>>[number];
export type AdminReviewDetail = Awaited<ReturnType<TrpcClient['admin']['reviewDetail']['query']>>;
export type AdminReviewReports = Awaited<ReturnType<TrpcClient['admin']['reviewReports']['query']>>;
export type ReviewScope = 'product' | 'shop';

/**
 * Avis clients avec photos (A-10c) : uniquement des procédures du serveur, qui applique toutes les règles
 * (ligne livrée, une fois par ligne, photos, moyennes). Le navigateur ne fait qu'une vérification de confort.
 */
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly trpc = inject(TrpcService).client;
  private readonly http = inject(HttpClient);

  // ----- Fiche produit -----
  overview(productSlug: string) {
    return this.trpc.reviews.overview.query({ productSlug });
  }
  page(scope: ReviewScope, slug: string, options: { filter: ReviewFilter | null; sort: ReviewSort; page: number }) {
    return this.trpc.reviews.page.query({ scope, slug, ...options });
  }
  photos(scope: ReviewScope, slug: string) {
    return this.trpc.reviews.photos.query({ scope, slug });
  }
  toggleHelpful(reviewId: number) {
    return this.trpc.reviews.toggleHelpful.mutate({ reviewId });
  }
  report(reviewId: number, reason: string) {
    return this.trpc.reviews.report.mutate({ reviewId, reason });
  }

  // ----- Client -----
  reviewableLines() {
    return this.trpc.reviews.reviewableLines.query();
  }
  submit(input: ReviewSubmission) {
    return this.trpc.reviews.submitForLine.mutate(input);
  }
  /** Vérification de confort avant l'envoi (le serveur revérifie le vrai format du fichier) */
  checkPhoto(file: File): string | null {
    if (!(REVIEW_PHOTO_LIMITS.mimeTypes as readonly string[]).includes(file.type)) return `Format non accepté (${REVIEW_PHOTO_LIMITS.label}).`;
    if (file.size > REVIEW_PHOTO_LIMITS.maxBytes) return `Photo trop volumineuse (${REVIEW_PHOTO_LIMITS.label}).`;
    if (file.size === 0) return 'Le fichier est vide.';
    return null;
  }
  /** POST /api/review-uploads : corps brut = l'image ; la photo reste privée jusqu'à la publication de l'avis */
  async uploadPhoto(file: File): Promise<{ id: number; url: string }> {
    try {
      return await firstValueFrom(this.http.post<{ id: number; url: string }>('/api/review-uploads', file, {
        headers: { 'Content-Type': 'application/octet-stream' },
        withCredentials: true,
      }));
    } catch (error) {
      const message = error instanceof HttpErrorResponse ? (error.error as { error?: string } | null)?.error : null;
      throw new Error(message ?? "La photo n'a pas pu être envoyée.");
    }
  }

  // ----- Vendeur -----
  vendorReviews() {
    return this.trpc.vendor.customerReviews.query();
  }
  reply(reviewId: number, body: string) {
    return this.trpc.vendor.replyToReview.mutate({ reviewId, body });
  }

  // ----- Admin -----
  adminDetail(reviewId: number) {
    return this.trpc.admin.reviewDetail.query({ reviewId });
  }
  setPhotoHidden(photoId: number, hidden: boolean) {
    return this.trpc.admin.setReviewPhotoHidden.mutate({ photoId, hidden });
  }
  reports(status: 'open' | 'resolved' | 'all') {
    return this.trpc.admin.reviewReports.query({ status });
  }
  resolveReport(reportId: number) {
    return this.trpc.admin.resolveReviewReport.mutate({ reportId });
  }
}
