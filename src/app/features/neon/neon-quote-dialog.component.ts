import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, lastValueFrom, map, tap } from 'rxjs';
import { NeonService } from '../../core/services/neon.service';

/**
 * « Envoyer mon logo pour un devis » : 1) l'image est envoyée à la route existante /api/neon/quote-logo
 * (même validation que les photos, revérifiée par le serveur) ; 2) la demande est enregistrée (neon.requestQuote).
 * Fenêtre native <dialog> : Échap et clic sur le fond la ferment, le focus y reste enfermé.
 */
@Component({
  selector: 'app-neon-quote-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- clic sur le fond du <dialog> ; au clavier : Échap (natif) -->
    <dialog #box class="fenetre" aria-labelledby="quote-title" (cancel)="onCancel($event)" (click)="onBackdrop($event)" data-testid="neon-quote-dialog">
      <div class="interieur">
        <div class="entete">
          <div>
            <h2 id="quote-title">Devis pour votre logo</h2>
            <p class="atelier">Atelier : {{ shopName() }}</p>
          </div>
          <button #closeButton type="button" class="fermer" aria-label="Fermer" (click)="close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        @if (!isClient()) {
          <p class="encadre">La demande de devis est réservée aux comptes Client.</p>
        } @else if (done()) {
          <div class="envoye" role="status">
            <svg class="coche" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            <p class="titre-envoye">Demande envoyée à {{ shopName() }}</p>
            <p>L'atelier vous recontactera avec un devis.</p>
            <button type="button" class="bouton" (click)="close()">Fermer</button>
          </div>
        } @else {
          <form class="formulaire" [formGroup]="form" (ngSubmit)="send()">
            <label class="depot">
              @if (preview()) {
                <img [src]="preview()" alt="Aperçu du logo" />
              } @else {
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                Choisir l'image de votre logo (JPEG, PNG ou WEBP)
              }
              <input type="file" class="masque" accept="image/jpeg,image/png,image/webp" (change)="pick($event)" data-testid="neon-quote-file" />
            </label>
            @if (sizes().length) {
              <label class="champ-bloc">Taille souhaitée
                <select class="champ" formControlName="sizeCode">@for (s of sizes(); track s) { <option [value]="s">{{ s }}</option> }</select>
              </label>
            }
            @if (outdoorEnabled()) {
              <label class="case"><input type="checkbox" formControlName="outdoor" /> Usage extérieur</label>
            }
            <label class="champ-bloc"><span>Téléphone <span class="facultatif">(facultatif)</span></span>
              <input class="champ" formControlName="phone" maxlength="64" inputmode="tel" autocomplete="tel" />
            </label>
            <label class="champ-bloc"><span>Message <span class="facultatif">(facultatif)</span></span>
              <textarea class="champ" formControlName="message" maxlength="2000" rows="3" placeholder="Dimensions, couleurs, lieu d'installation…"></textarea>
            </label>
            @if (error()) { <p class="erreur" role="alert">{{ error() }}</p> }
            @if (progress() !== null) {
              <div class="progression" role="progressbar" aria-label="Envoi du logo" [attr.aria-valuenow]="progress()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="progress()"></span></div>
            }
            <button type="submit" class="bouton envoyer" [disabled]="sending()" data-testid="neon-quote-send">
              <span aria-hidden="true">{{ sending() ? '…' : '→' }}</span> Envoyer ma demande
            </button>
          </form>
        }
      </div>
    </dialog>
  `,
  styles: `
    .fenetre { width: 100%; max-width: 512px; max-height: 92vh; margin: auto auto 0; padding: 0; border: none; border-radius: 28px 28px 0 0; background: var(--fond); color: var(--texte); }
    .fenetre::backdrop { background: rgba(42, 36, 32, 0.5); }
    .interieur { padding: 24px 24px calc(24px + env(safe-area-inset-bottom)); }
    .entete { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    h2 { font-size: 24px; }
    .atelier { margin: 4px 0 0; color: var(--texte-secondaire); font-size: 14px; }
    .fermer { display: flex; width: 44px; height: 44px; flex-shrink: 0; align-items: center; justify-content: center; border: none; border-radius: 999px; background: none; color: var(--texte); cursor: pointer; }
    .fermer:hover { background: var(--beige); }
    svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .encadre { margin: 20px 0 0; padding: 16px; border-radius: 16px; background: var(--beige-clair); color: var(--texte-secondaire); font-size: 14px; }
    .envoye { margin-top: 24px; text-align: center; color: var(--texte-secondaire); font-size: 14px; }
    .coche { width: 40px; height: 40px; color: var(--accent); }
    .titre-envoye { margin: 12px 0 4px; color: var(--texte); font-weight: 600; }
    .envoye .bouton { margin-top: 20px; }
    .formulaire { display: grid; gap: 16px; margin-top: 20px; }
    .depot { display: flex; min-height: 96px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px; border: 2px dashed var(--bordure); border-radius: 16px; background: var(--carte); color: var(--texte-secondaire); font-size: 14px; text-align: center; cursor: pointer; }
    .depot:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
    .depot img { max-height: 128px; object-fit: contain; }
    .depot svg { width: 24px; height: 24px; }
    .masque { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .champ-bloc { display: grid; gap: 8px; font-size: 14px; font-weight: 500; }
    .champ-bloc .champ { width: 100%; }
    textarea.champ { height: auto; padding: 12px; resize: vertical; }
    .facultatif { color: var(--texte-secondaire); font-weight: 400; }
    .case { display: flex; min-height: 44px; align-items: center; gap: 12px; font-size: 14px; cursor: pointer; }
    .case input { width: 16px; height: 16px; accent-color: var(--texte); }
    .erreur { margin: 0; color: var(--erreur); font-size: 14px; }
    .progression { height: 6px; overflow: hidden; border-radius: 999px; background: var(--beige); }
    .progression span { display: block; height: 100%; background: var(--accent); transition: width .2s; }
    .envoyer { width: 100%; }
    @media (min-width: 640px) { .fenetre { margin: auto; border-radius: 28px; } }
  `,
})
export class NeonQuoteDialogComponent {
  private readonly neon = inject(NeonService);
  private readonly box = viewChild.required<ElementRef<HTMLDialogElement>>('box');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  readonly shopSlug = input.required<string>();
  readonly shopName = input.required<string>();
  readonly sizes = input<string[]>([]);
  readonly outdoorEnabled = input(false);
  readonly isClient = input(false);
  readonly closed = output<void>();

  readonly form = new FormGroup({
    sizeCode: new FormControl('', { nonNullable: true }),
    outdoor: new FormControl(false, { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(64)] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });
  readonly file = signal<File | null>(null);
  readonly preview = signal<string | null>(null);
  readonly sending = signal(false);
  readonly progress = signal<number | null>(null);
  readonly done = signal(false);
  readonly error = signal('');

  constructor() {
    afterNextRender(() => {
      this.form.controls.sizeCode.setValue(this.sizes()[0] ?? '');
      this.box().nativeElement.showModal();
      this.closeButton().nativeElement.focus();
    });
    // L'adresse temporaire de l'aperçu est libérée à la fermeture
    inject(DestroyRef).onDestroy(() => this.setPreview(null));
  }

  pick(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.error.set('');
    if (file) {
      const problem = this.neon.checkLogo(file);
      if (problem) {
        this.error.set(problem);
        (event.target as HTMLInputElement).value = '';
        return;
      }
    }
    this.file.set(file);
    this.setPreview(file ? URL.createObjectURL(file) : null);
  }

  private setPreview(url: string | null) {
    const old = this.preview();
    if (old) URL.revokeObjectURL(old);
    this.preview.set(url);
  }

  async send() {
    const file = this.file();
    if (!file) return this.error.set("Choisissez l'image de votre logo.");
    this.sending.set(true);
    this.error.set('');
    try {
      // 1) le logo (progression affichée), 2) la demande qui le référence
      const mediaId = await lastValueFrom(this.neon.uploadLogo(file, this.shopSlug()).pipe(
        tap((e) => { if (e.type === 'progress') this.progress.set(e.percent); }),
        filter((e) => e.type === 'done'),
        map((e) => e.mediaId),
      ));
      const v = this.form.getRawValue();
      await this.neon.requestQuote({
        shopSlug: this.shopSlug(), mediaId,
        message: v.message.trim() || undefined, phone: v.phone.trim() || undefined,
        sizeCode: v.sizeCode || undefined, outdoor: this.outdoorEnabled() ? v.outdoor : false,
      });
      this.done.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "La demande n'a pas pu être envoyée.");
    } finally {
      this.sending.set(false);
      this.progress.set(null);
    }
  }

  close() {
    if (this.sending()) return;
    this.box().nativeElement.close();
    this.closed.emit();
  }

  onCancel(event: Event) {
    event.preventDefault();
    this.close();
  }

  onBackdrop(event: MouseEvent) {
    if (event.target === this.box().nativeElement) this.close();
  }
}
