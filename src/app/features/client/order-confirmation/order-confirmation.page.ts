import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountService, OrderDetail, orderStatusLabel } from '../../../core/services/account.service';
import { PrixDtPipe } from '../../../shared/pipes/prix-dt.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Confirmation de commande (/commande/:id, page protégée).
 * Le récapitulatif est RELU sur le serveur (account.order) : ce sont les prix figés dans la commande.
 */
@Component({
  selector: 'app-order-confirmation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PrixDtPipe, IconComponent],
  templateUrl: './order-confirmation.page.html',
  styleUrl: './order-confirmation.page.css',
})
export class OrderConfirmationPage {
  private readonly account = inject(AccountService);

  /** Paramètre de route :id (numéro de la commande) */
  readonly id = input.required<string>();
  readonly order = signal<OrderDetail | null>(null);
  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly statusLabel = orderStatusLabel;

  constructor() {
    effect(() => void this.load(Number(this.id())));
  }

  async load(orderId: number) {
    this.status.set('loading');
    try {
      const order = Number.isInteger(orderId) && orderId > 0 ? await this.account.order(orderId) : null;
      this.order.set(order ?? null);
      this.status.set(order ? 'ok' : 'error');
    } catch {
      this.status.set('error');
    }
  }
}
