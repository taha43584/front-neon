import { Injectable, inject } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

export type Conversation = Awaited<ReturnType<TrpcClient['messages']['list']['query']>>[number];
export type ConversationThread = Awaited<ReturnType<TrpcClient['messages']['get']['query']>>;
export type ContactTarget = Awaited<ReturnType<TrpcClient['vendor']['contactTarget']['query']>>;

/**
 * Messagerie privée client ↔ boutique : procédures existantes messages.* et vendor.contactTarget.
 * Le serveur vérifie que l'utilisateur participe à la conversation ; lire une conversation marque ses messages comme lus.
 */
@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly trpc = inject(TrpcService).client;

  list() {
    return this.trpc.messages.list.query();
  }

  get(conversationId: number) {
    return this.trpc.messages.get.query({ conversationId });
  }

  /** Boutique joignable par la messagerie (null si la boutique n'existe pas ou n'est pas active) */
  contactTarget(shopSlug: string) {
    return this.trpc.vendor.contactTarget.query({ shopSlug });
  }

  start(shopSlug: string, body: string, subject: string) {
    return this.trpc.messages.start.mutate({ shopSlug, body, subject });
  }

  send(conversationId: number, body: string) {
    return this.trpc.messages.send.mutate({ conversationId, body });
  }
}
