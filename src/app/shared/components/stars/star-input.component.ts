import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextId = 0;

/**
 * Saisie d'une note de 1 à 5 : de VRAIS boutons radio (flèches du clavier, lecteur d'écran) habillés en étoiles.
 * Chaque étoile est une cible de 44 px.
 */
@Component({
  selector: 'app-star-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="note">
      <legend [class.masque-lecteur]="hideLegend()">{{ label() }}</legend>
      <div class="etoiles">
        @for (n of [1, 2, 3, 4, 5]; track n) {
          <label class="etoile" [class.allumee]="n <= value()">
            <input type="radio" class="masque-lecteur" [name]="name" [value]="n" [checked]="value() === n" (change)="value.set(n)" />
            <span aria-hidden="true">★</span>
            <span class="masque-lecteur">{{ n }} étoile{{ n > 1 ? 's' : '' }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .note { margin: 0; padding: 0; border: none; }
    legend { padding: 0; font-size: 14px; font-weight: 600; }
    .etoiles { display: flex; }
    .etoile { display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; color: var(--ligne-31, #e2d6cb); font-size: 28px; cursor: pointer; }
    .etoile.allumee { color: var(--cuivre-10, #c0873f); }
    .etoile:focus-within { border-radius: 8px; outline: 2px solid var(--accent); }
  `,
})
export class StarInputComponent {
  readonly label = input.required<string>();
  readonly hideLegend = input(false);
  readonly value = model(0);
  readonly name = `note-${nextId++}`;
}
