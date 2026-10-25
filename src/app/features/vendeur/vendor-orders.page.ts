import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VendorSpaceState } from './vendor-space.state';
import { FulfillmentStatus, VendorOrderLine, VendorService } from '../../core/services/vendor.service';
import { ORDER_STATUS_LABELS, orderReference, orderStatusLabel } from '../../core/services/account.service';
import { PrixDtPipe } from '../../shared/pipes/prix-dt.pipe';
import { NeonOrderPreviewComponent, OrderedNeon } from '../../shared/components/neon/neon-order-preview.component';

/** Une commande vue par le vendeur : seulement SES articles (une commande peut concerner plusieurs boutiques) */
interface VendorOrder {
  orderId: number; createdAt: Date; status: string; orderStatus: string;
  shippingName: string; shippingPhone: string; shippingCity: string; shippingAddress: string; shippingNote: string | null;
  items: VendorOrderLine[]; total: number;
}

const FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
] as const;

/**
 * Mes commandes : lignes de commande de la boutique, regroupées par commande, filtre par statut, recherche,
 * et mise à jour du statut de SES articles (jamais ceux des autres boutiques : vérifié par le serveur).
 */
@Component({
  selector: 'app-vendor-orders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, PrixDtPipe, NeonOrderPreviewComponent],
  templateUrl: './vendor-orders.page.html',
  styleUrls: ['./vendor-pages.css', './vendor-orders.page.css'],
})
export class VendorOrdersPage {
  readonly state = inject(VendorSpaceState);
  private readonly vendor = inject(VendorService);

  readonly filters = FILTERS;
  readonly statuses = Object.entries(ORDER_STATUS_LABELS);
  readonly reference = orderReference;
  readonly statusLabel = orderStatusLabel;

  readonly filter = signal<string>('all');
  readonly search = signal('');
  /** Commande dont le statut est en cours d'enregistrement */
  readonly updating = signal<number | null>(null);
  readonly message = signal<{ text: string; error: boolean } | null>(null);

  private readonly lines = computed(() => this.state.dashboard()?.orders ?? []);

  /** Regroupement des lignes par commande, de la plus récente à la plus ancienne */
  readonly orders = computed(() => {
    const groups = new Map<number, VendorOrder>();
    for (const line of this.lines()) {
      const order = groups.get(line.orderId) ?? {
        orderId: line.orderId, createdAt: line.createdAt, status: line.status, orderStatus: line.orderStatus,
        shippingName: line.shippingName, shippingPhone: line.shippingPhone, shippingCity: line.shippingCity,
        shippingAddress: line.shippingAddress, shippingNote: line.shippingNote, items: [], total: 0,
      };
      order.items.push(line);
      order.total += Number(line.unitPriceTnd) * line.quantity;
      groups.set(line.orderId, order);
    }
    return Array.from(groups.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  readonly visibleOrders = computed(() => {
    const filter = this.filter();
    const query = this.search().trim().toLowerCase();
    return this.orders().filter((o) =>
      (filter === 'all' || o.status === filter) &&
      (!query || `${orderReference(o.orderId)} ${o.shippingName} ${o.items.map((i) => i.productName).join(' ')}`.toLowerCase().includes(query)));
  });

  readonly hasOrders = computed(() => this.lines().length > 0);

  neonOf(line: VendorOrderLine): OrderedNeon | null {
    return (line as { neon?: OrderedNeon | null }).neon ?? null;
  }

  lineTotal(line: VendorOrderLine) {
    return Number(line.unitPriceTnd) * line.quantity;
  }

  details(line: VendorOrderLine) {
    return [line.selectedColor && `Couleur : ${line.selectedColor}`, line.personalization].filter(Boolean).join(' · ');
  }

  /** Une commande annulée (par le client, l'admin ou ce vendeur) ne change plus de statut */
  locked(order: VendorOrder) {
    return this.updating() !== null || order.status === 'cancelled' || order.orderStatus === 'cancelled';
  }

  async changeStatus(order: VendorOrder, event: Event) {
    const select = event.target as HTMLSelectElement;
    const status = select.value as FulfillmentStatus;
    this.updating.set(order.orderId);
    this.message.set(null);
    try {
      await this.vendor.updateOrderStatus(order.orderId, status);
      await this.state.reload();
      this.message.set({ text: `Commande ${orderReference(order.orderId)} : statut de vos articles mis à jour`, error: false });
    } catch (error) {
      select.value = order.status; // le serveur a refusé : on revient au statut enregistré
      this.message.set({ text: error instanceof Error ? error.message : 'Mise à jour impossible', error: true });
    } finally {
      this.updating.set(null);
    }
  }
}
