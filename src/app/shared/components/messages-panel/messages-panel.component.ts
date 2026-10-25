import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ContactTarget, Conversation, ConversationThread, MessagesService } from '../../../core/services/messages.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Messagerie privée RÉUTILISABLE (client sur /messages, vendeur dans son espace), comme MessagesPanel en React :
 * liste des conversations, fil de la conversation choisie, réponse ; avec `initialShopSlug`, premier message à une boutique.
 * Mes messages sont à droite (en React, c'était toujours ceux du client, même vus par le vendeur).
 */
@Component({
  selector: 'app-messages-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, IconComponent],
  templateUrl: './messages-panel.component.html',
  styleUrl: './messages-panel.component.css',
})
export class MessagesPanelComponent {
  private readonly messages = inject(MessagesService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  /** /messages/:shopSlug : boutique à contacter */
  readonly initialShopSlug = input<string | undefined>(undefined);

  readonly listStatus = signal<'loading' | 'ok' | 'error'>('loading');
  readonly conversations = signal<Conversation[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly thread = signal<ConversationThread | null>(null);
  readonly target = signal<ContactTarget | null | undefined>(undefined);
  readonly sending = signal(false);

  readonly draft = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(4000)] });
  readonly firstMessage = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(4000)] });

  readonly selected = computed(() => this.conversations().find((c) => c.id === this.selectedId()) ?? null);
  /** Nouveau message à une boutique avec qui il n'y a pas encore de conversation */
  readonly composingFirst = computed(() => !!this.initialShopSlug() && !this.selected());
  readonly myId = computed(() => this.auth.user()?.id ?? null);

  constructor() {
    effect(() => {
      const slug = this.initialShopSlug();
      untracked(() => {
        void this.loadList(slug);
        if (slug) this.messages.contactTarget(slug).then((t) => this.target.set(t ?? null)).catch(() => this.target.set(null));
      });
    });
  }

  async loadList(slug = this.initialShopSlug()) {
    try {
      const list = await this.messages.list();
      this.conversations.set(list);
      this.listStatus.set('ok');
      // Conversation à ouvrir : celle de la boutique demandée, sinon la plus récente
      if (this.selectedId() === null && list.length) {
        const matching = slug ? list.find((c) => c.shopSlug === slug) : list[0];
        if (matching) void this.open(matching.id);
      }
    } catch {
      this.listStatus.set('error');
    }
  }

  async open(id: number) {
    this.selectedId.set(id);
    try {
      this.thread.set(await this.messages.get(id));
      // La lecture marque les messages comme lus : la pastille « non lus » disparaît
      this.conversations.update((list) => list.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : 'Conversation indisponible', 'erreur');
    }
  }

  async startConversation() {
    const slug = this.initialShopSlug();
    const body = this.firstMessage.value.trim();
    if (!slug || !body) return;
    this.sending.set(true);
    try {
      const r = await this.messages.start(slug, body, `Projet avec ${this.target()?.name ?? 'la boutique'}`);
      this.firstMessage.reset('');
      this.toast.show('Votre message a été envoyé', 'succes');
      this.selectedId.set(null);
      await this.loadList();
      await this.open(r.conversationId);
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : "Le message n'a pas pu être envoyé", 'erreur');
    } finally {
      this.sending.set(false);
    }
  }

  async reply() {
    const id = this.selectedId();
    const body = this.draft.value.trim();
    if (id === null || !body) return;
    this.sending.set(true);
    try {
      await this.messages.send(id, body);
      this.draft.reset('');
      await this.open(id);
      void this.loadList();
    } catch (e) {
      this.toast.show(e instanceof Error ? e.message : "Le message n'a pas pu être envoyé", 'erreur');
    } finally {
      this.sending.set(false);
    }
  }
}
