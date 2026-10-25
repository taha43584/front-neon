import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MessagesPanelComponent } from '../../shared/components/messages-panel/messages-panel.component';

/** /espace-vendeur/messages : la même messagerie que les clients, vue côté boutique (comme React) */
@Component({
  selector: 'app-vendor-messages-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessagesPanelComponent],
  template: `
    <div class="cadre-messages"><app-messages-panel /></div>
  `,
  styleUrls: ['./vendor-pages.css'],
  styles: `.cadre-messages { padding: 0; }`,
})
export class VendorMessagesPage {}
