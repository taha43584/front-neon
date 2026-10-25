import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, catchError, debounceTime, distinctUntilChanged, from, map, of, startWith, switchMap } from 'rxjs';
import { normalizeCategoryName } from '@shared/categoryKey';
import { CatalogProduct, CatalogService } from '../services/catalog.service';
import { SearchScreenService } from '../services/search-screen.service';
import { SiteService } from '../services/site.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';

type Suggestions = { status: 'idle' } | { status: 'loading' } | { status: 'ok'; query: string; products: CatalogProduct[] } | { status: 'error' };
const SUGGESTIONS_MAX = 6;

/**
 * Écran de recherche plein écran du téléphone (A-10e), chargé à la demande par l'en-tête (@defer).
 * <dialog> natif en modal : focus automatique sur le champ, Échap ou « retour » = fermer.
 * Suggestions pendant la frappe : 250 ms après la dernière touche (debounceTime), et switchMap annule la
 * requête précédente si une nouvelle lettre arrive (pas de réponse ancienne affichée sur une recherche récente).
 * « Tendances » : aucune donnée réelle côté serveur → section absente (BACK-A-FAIRE.md).
 */
@Component({
  selector: 'app-search-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgOptimizedImage, RouterLink, IconComponent, PrixDtPipe],
  template: `
    <dialog #ecran class="ecran" aria-label="Recherche" (close)="onClosed()" data-testid="search-screen">
      <form class="haut" role="search" (submit)="$event.preventDefault(); submit()">
        <button type="button" class="rond" aria-label="Fermer la recherche" (click)="close()" data-testid="search-back"><app-icon name="arrow-left" [size]="20" /></button>
        <label class="champ-recherche">
          <span class="masque-lecteur">Rechercher une création ou une boutique</span>
          <input #champ type="search" enterkeyhint="search" autocomplete="off" [formControl]="query" placeholder="Miroir, néon, enseigne, boutique…" autofocus data-testid="search-input" />
        </label>
        @if (query.value) {
          <button type="button" class="rond petit" aria-label="Effacer le texte" (click)="query.setValue(''); champ.focus()"><app-icon name="x" [size]="18" /></button>
        }
      </form>

      <div class="corps">
        @if (query.value.trim().length >= 2) {
          <!-- Suggestions -->
          <section aria-labelledby="titre-suggestions" aria-live="polite">
            <h2 id="titre-suggestions" class="titre">Suggestions</h2>
            @switch (suggestions().status) {
              @case ('loading') { <p class="aide">Recherche…</p> }
              @case ('error') { <p class="aide">La recherche n'a pas pu aboutir. Réessayez.</p> }
              @case ('ok') {
                @if (matchingCategories().length) {
                  <ul class="liste-categories">
                    @for (c of matchingCategories(); track c.slug) {
                      <li><a [routerLink]="['/categorie', c.slug]" (click)="leave()"><app-icon name="layout-grid" [size]="16" /> {{ c.name }}</a></li>
                    }
                  </ul>
                }
                @if (productsOf(suggestions()).length) {
                  <ul class="suggestions" data-testid="search-suggestions">
                    @for (p of productsOf(suggestions()); track p.slug) {
                      <li>
                        <a class="suggestion" [routerLink]="['/produit', p.slug]" (click)="leave(true)">
                          <span class="vignette">@if (p.image) { <img [ngSrc]="p.image" alt="" fill sizes="56px" /> }</span>
                          <span class="texte"><span class="nom">{{ p.name }}</span><span class="aide">{{ p.shopName }}</span></span>
                          <strong>{{ p.priceTnd | prixDt }}</strong>
                        </a>
                      </li>
                    }
                  </ul>
                } @else if (!matchingCategories().length) {
                  <p class="aide">Aucune création ne correspond à « {{ query.value.trim() }} ».</p>
                }
                <button type="submit" class="tous">Voir tous les résultats pour « {{ query.value.trim() }} »</button>
              }
            }
          </section>
        } @else {
          @if (screen.recent().length) {
            <section aria-labelledby="titre-recentes">
              <div class="entete-section">
                <h2 id="titre-recentes" class="titre">Recherches récentes</h2>
                <button type="button" class="lien" (click)="screen.clear()" data-testid="search-clear">Effacer</button>
              </div>
              <ul class="recentes" data-testid="search-recent">
                @for (r of screen.recent(); track r) {
                  <li>
                    <button type="button" class="recente" (click)="search(r)"><app-icon name="clock" [size]="16" /> {{ r }}</button>
                    <button type="button" class="rond petit" [attr.aria-label]="'Retirer « ' + r + ' » des recherches récentes'" (click)="screen.forget(r)"><app-icon name="x" [size]="16" /></button>
                  </li>
                }
              </ul>
            </section>
          }
          @if (site.categories().length) {
            <section aria-labelledby="titre-categories-recherche">
              <h2 id="titre-categories-recherche" class="titre">Catégories</h2>
              <ul class="grille" data-testid="search-categories">
                @for (c of site.categories(); track c.slug) {
                  <li>
                    <a class="tuile" [routerLink]="['/categorie', c.slug]" (click)="leave()">
                      <span class="photo">@if (c.image; as image) { <img [ngSrc]="image" alt="" fill sizes="33vw" /> } @else { <app-icon name="layout-grid" [size]="22" /> }</span>
                      <span class="nom-tuile">{{ c.name }}</span>
                    </a>
                  </li>
                }
              </ul>
            </section>
          }
        }
      </div>
    </dialog>
  `,
  styles: `
    .ecran { width: 100%; max-width: 100%; height: 100%; max-height: 100%; margin: 0; padding: 0; border: none; background: var(--fond); color: var(--texte); }
    .ecran[open] { animation: monte .3s var(--ease); }
    @keyframes monte { from { transform: translateY(100%); } }
    .haut { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top)) 12px 10px; border-bottom: 1px solid var(--bordure); background: var(--fond); }
    .champ-recherche { flex: 1; min-width: 0; }
    .champ-recherche input { width: 100%; height: 46px; padding: 0 16px; border: 1px solid var(--bordure); border-radius: 999px; background: var(--carte); color: var(--texte); font: 16px var(--police-texte); }
    .champ-recherche input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    /* Une seule croix : celle de l'écran (nommée pour les lecteurs d'écran), pas celle du navigateur */
    .champ-recherche input::-webkit-search-cancel-button { display: none; -webkit-appearance: none; }
    .rond { display: flex; width: 44px; height: 44px; flex-shrink: 0; align-items: center; justify-content: center; padding: 0; border: none; border-radius: 999px; background: none; color: var(--texte); cursor: pointer; }
    .rond:focus-visible, .lien:focus-visible, .recente:focus-visible, a:focus-visible, .tous:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .corps { padding: 8px 16px calc(24px + env(safe-area-inset-bottom)); }
    section { margin-top: 18px; }
    .titre { margin: 0 0 10px; font-size: 18px; }
    .entete-section { display: flex; align-items: center; justify-content: space-between; }
    .entete-section .titre { margin: 0; }
    .lien { min-height: 44px; padding: 0 4px; border: none; background: none; color: var(--surtitre); font: 600 14px var(--police-texte); cursor: pointer; }
    .aide { margin: 0; color: var(--texte-secondaire); font-size: 13px; }
    ul { margin: 0; padding: 0; list-style: none; }
    .recentes li { display: flex; align-items: center; border-bottom: 1px solid var(--bordure); }
    .recente { display: flex; min-height: 48px; flex: 1; align-items: center; gap: 12px; padding: 0; border: none; background: none; color: var(--texte); font: 15px var(--police-texte); text-align: left; cursor: pointer; }
    .recente app-icon { color: var(--texte-secondaire); }
    .grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 10px; }
    .tuile { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--texte); text-align: center; text-decoration: none; }
    .photo { position: relative; display: flex; width: 100%; aspect-ratio: 1; align-items: center; justify-content: center; overflow: hidden; border-radius: 18px; background: var(--beige); color: var(--accent); }
    .photo img { object-fit: cover; }
    .nom-tuile { display: -webkit-box; overflow: hidden; font-size: 12px; font-weight: 600; line-height: 1.25; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .liste-categories { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .liste-categories a { display: inline-flex; min-height: 44px; align-items: center; gap: 6px; padding: 0 14px; border: 1px solid var(--bordure); border-radius: 999px; background: var(--carte); color: var(--texte); font-size: 14px; text-decoration: none; }
    .suggestion { display: flex; min-height: 64px; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--bordure); color: var(--texte); text-decoration: none; }
    .vignette { position: relative; width: 56px; height: 56px; flex-shrink: 0; overflow: hidden; border-radius: 12px; background: var(--beige); }
    .vignette img { object-fit: cover; }
    .texte { display: flex; min-width: 0; flex: 1; flex-direction: column; }
    .nom { overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .suggestion strong { flex-shrink: 0; font-size: 14px; }
    .tous { width: 100%; min-height: 48px; margin-top: 14px; border: 1px solid var(--texte); border-radius: 999px; background: none; color: var(--texte); font: 600 14px var(--police-texte); cursor: pointer; }
    @media (prefers-reduced-motion: reduce) { .ecran[open] { animation: none; } }
  `,
})
export class SearchScreenComponent {
  readonly screen = inject(SearchScreenService);
  readonly site = inject(SiteService);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('ecran');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('champ');

  readonly query = new FormControl('', { nonNullable: true });
  private readonly typed = toSignal(this.query.valueChanges.pipe(startWith('')), { initialValue: '' });

  readonly suggestions = toSignal(
    this.query.valueChanges.pipe(
      map((q) => q.trim()),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q): Observable<Suggestions> =>
        q.length < 2
          ? of({ status: 'idle' })
          : from(this.catalog.list({ search: q })).pipe(
              map((list): Suggestions => ({ status: 'ok', query: q, products: list.slice(0, SUGGESTIONS_MAX) })),
              catchError(() => of<Suggestions>({ status: 'error' })),
              startWith<Suggestions>({ status: 'loading' }),
            ),
      ),
    ),
    { initialValue: { status: 'idle' } as Suggestions },
  );

  /** Catégories du site dont le nom contient le texte (accents et majuscules ignorés, même normalisation que le serveur) */
  readonly matchingCategories = computed(() => {
    const q = normalizeCategoryName(this.typed());
    return q.length < 2 ? [] : this.site.categories().filter((c) => normalizeCategoryName(c.name).includes(q)).slice(0, 4);
  });

  constructor() {
    // Ouverture demandée par l'en-tête (y compris le tout premier toucher, qui a déclenché le chargement)
    effect(() => {
      const d = this.dialog().nativeElement;
      if (this.screen.isOpen() && !d.open) {
        // Chaque ouverture repart d'un champ vide : recherches récentes et catégories visibles
        this.query.setValue('');
        d.showModal();
        // « autofocus » est ignoré si un élément a déjà le focus (le bouton qui ouvre l'écran) : focus donné ici
        this.input().nativeElement.focus();
      }
      else if (!this.screen.isOpen() && d.open) d.close();
    });
  }

  productsOf(s: Suggestions) {
    return s.status === 'ok' ? s.products : [];
  }

  search(q: string) {
    this.query.setValue(q);
    this.submit();
  }

  submit() {
    const q = this.query.value.trim();
    if (!q) return;
    this.screen.remember(q);
    this.close();
    void this.router.navigate(['/produits'], { queryParams: { q } });
  }

  /** Lien suivi (produit, catégorie) : l'écran se ferme ; une suggestion de produit garde la recherche dans « récentes » */
  leave(rememberQuery = false) {
    if (rememberQuery) this.screen.remember(this.query.value);
    this.close();
  }

  close() {
    this.screen.close();
  }

  onClosed() {
    this.screen.close();
    // Focus rendu à la barre de recherche de l'en-tête
    document.querySelector<HTMLElement>('[data-testid=search-open]')?.focus();
  }
}
