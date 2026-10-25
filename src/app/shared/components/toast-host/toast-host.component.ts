import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

/** Zone des notifications : en bas de l'écran, au-dessus de la barre du bas sur téléphone (comme React). */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="zone" role="status" aria-live="polite" data-testid="toasts">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="t.tone">
          <p>{{ t.text }}@if (t.link) { · <a [routerLink]="t.link.url" (click)="toasts.dismiss(t.id)">{{ t.link.label }}</a> }</p>
          <button type="button" aria-label="Fermer la notification" (click)="toasts.dismiss(t.id)"><app-icon name="x" [size]="16" /></button>
        </div>
      }
    </div>
  `,
  styles: `
    .zone { position: fixed; right: 16px; bottom: calc(72px + env(safe-area-inset-bottom)); left: 16px; z-index: 60; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
    .toast { display: flex; width: 100%; max-width: 360px; align-items: center; gap: 8px; padding: 6px 6px 6px 16px; border: 1px solid var(--bordure); border-radius: 14px; background: var(--carte); box-shadow: 0 12px 30px rgba(42, 36, 32, 0.16); box-shadow: 0 12px 30px color-mix(in srgb, var(--ombre, #2a2420) 16%, transparent); color: var(--texte); font-size: 14px; pointer-events: auto; animation: arrivee .3s cubic-bezier(.23, 1, .32, 1) both; }
    .toast.succes { border-left: 4px solid var(--accent); }
    .toast.erreur { border-left: 4px solid var(--erreur); }
    p { flex: 1; margin: 0; }
    a { color: var(--accent); font-weight: 600; }
    button { display: flex; width: 44px; height: 44px; flex-shrink: 0; align-items: center; justify-content: center; border: none; border-radius: 999px; background: none; color: var(--texte-secondaire); cursor: pointer; }
    button:hover { background: var(--beige-clair); }
    @keyframes arrivee { from { opacity: 0; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: none; } }
    @media (min-width: 768px) { .zone { right: 24px; bottom: 24px; left: auto; align-items: flex-end; } }
  `,
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);
}
