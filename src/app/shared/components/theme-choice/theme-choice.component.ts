import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeChoice, ThemeService } from '../../../core/services/theme.service';

/** Choix du thème (A-10e) : Automatique / Clair / Sombre — boutons radio natifs (clavier et lecteurs d'écran inclus). */
@Component({
  selector: 'app-theme-choice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="choix-theme" data-testid="theme-choice">
      <legend>Apparence</legend>
      <div class="options">
        @for (o of options; track o.value) {
          <label class="option" [class.choisie]="theme.choice() === o.value">
            <input type="radio" name="theme-site" [value]="o.value" [checked]="theme.choice() === o.value" (change)="theme.set(o.value)" />
            <span>{{ o.label }}</span>
          </label>
        }
      </div>
      <p class="aide">« Automatique » suit le réglage de votre téléphone ou de votre ordinateur.</p>
    </fieldset>
  `,
  styles: `
    .choix-theme { margin: 0; padding: 0; border: none; }
    legend { margin-bottom: 10px; padding: 0; font-size: 14px; font-weight: 600; }
    .options { display: flex; flex-wrap: wrap; gap: 8px; }
    .option { position: relative; display: inline-flex; min-height: 44px; align-items: center; padding: 0 18px; border: 1px solid var(--bordure); border-radius: 999px; background: var(--carte); color: var(--texte); font-size: 14px; cursor: pointer; transition: background-color .25s, color .25s, border-color .25s; }
    .option.choisie { border-color: var(--texte); background: var(--texte); color: var(--fond); }
    .option input { position: absolute; opacity: 0; pointer-events: none; }
    .option:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
    .aide { margin: 8px 0 0; color: var(--texte-secondaire); font-size: 13px; }
  `,
})
export class ThemeChoiceComponent {
  readonly theme = inject(ThemeService);
  readonly options: { value: ThemeChoice; label: string }[] = [
    { value: 'auto', label: 'Automatique' },
    { value: 'clair', label: 'Clair' },
    { value: 'sombre', label: 'Sombre' },
  ];
}
