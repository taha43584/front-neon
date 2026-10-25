import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NeonService, NeonWorkshop } from '../../core/services/neon.service';
import { LoadStateComponent } from '../../shared/components/load-state/load-state.component';
import { NeonWorkshopGridComponent } from '../../shared/components/neon/neon-workshop-card.component';

/** /neon : un atelier = une carte ; le client choisit l'atelier, puis configure son néon chez lui. */
@Component({
  selector: 'app-neon-workshops-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadStateComponent, NeonWorkshopGridComponent],
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="conteneur page"><app-load-state status="loading" /></div>
      }
      @case ('error') {
        <div class="conteneur page"><app-load-state status="error" (retry)="load()" /></div>
      }
      @default {
        @if (!workshops().length) {
          <div class="aucun">
            <h1>Créer mon néon</h1>
            <p>Aucun atelier ne propose encore le néon personnalisé. Revenez bientôt ou découvrez les créations lumineuses du catalogue.</p>
            <a routerLink="/produits" class="bouton">Voir le catalogue</a>
          </div>
        } @else {
          <div class="conteneur page">
            <p class="surtitre">Personnalisé</p>
            <h1>Créer mon néon</h1>
            <p class="intro">Choisissez votre atelier : chacun a ses tailles, ses couleurs et ses prix. Votre néon est fabriqué et expédié par l'atelier choisi.</p>
            <div class="ateliers"><app-neon-workshop-grid [workshops]="workshops()" /></div>
          </div>
        }
      }
    }
  `,
  styles: `
    .page { padding-top: 24px; padding-bottom: 40px; }
    h1 { font-size: 32px; letter-spacing: -0.03em; }
    .intro { max-width: 42rem; margin: 8px 0 0; color: var(--texte-secondaire); font-size: 14px; }
    .ateliers { margin-top: 24px; }
    .aucun { max-width: 36rem; margin: 0 auto; padding: 80px 24px; text-align: center; }
    .aucun h1 { font-size: 36px; }
    .aucun p { margin: 12px 0 24px; color: var(--texte-secondaire); font-size: 14px; }
    @media (min-width: 640px) { h1 { font-size: 48px; } }
    @media (min-width: 1024px) { .page { padding-top: 40px; } }
  `,
})
export class NeonWorkshopsPage {
  private readonly neon = inject(NeonService);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly workshops = signal<NeonWorkshop[]>([]);

  constructor() {
    void this.load();
  }

  async load() {
    this.status.set('loading');
    try {
      this.workshops.set(await this.neon.workshops());
      this.status.set('ok');
    } catch {
      this.status.set('error');
    }
  }
}
