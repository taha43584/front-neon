import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TrpcService } from '../../../core/api/trpc-client';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface Message { role: 'system' | 'user' | 'assistant'; content: string }

const STYLES = ['Contemporain', 'Minimaliste', 'Art déco', 'Chaleureux', 'Professionnel'];
const BUDGETS = ['Moins de 100 TND', '100 à 300 TND', '300 à 700 TND', 'Plus de 700 TND'];
const INITIAL: Message[] = [
  { role: 'system', content: 'Assistant Déco IA Elegance Deco' },
  { role: 'assistant', content: 'Bonjour, je suis votre assistant Déco IA. Décrivez-moi votre pièce, votre style ou votre budget, et je vous aiderai à clarifier votre projet sans vous faire perdre de temps.' },
];

/**
 * /assistant et /assistant-deco : discussion avec l'assistant (procédure existante ai.chat), comme le site React.
 * Le serveur ne cite que des produits réellement en vente ; il reçoit au plus les 12 derniers messages.
 */
@Component({
  selector: 'app-assistant-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './assistant.page.html',
  styleUrl: './assistant.page.css',
})
export class AssistantPage {
  private readonly trpc = inject(TrpcService).client;
  private readonly scrollArea = viewChild<ElementRef<HTMLElement>>('zone');

  readonly styles = STYLES;
  readonly budgets = BUDGETS;
  readonly messages = signal<Message[]>(INITIAL);
  readonly loading = signal(false);
  readonly style = new FormControl('Contemporain', { nonNullable: true });
  readonly budget = new FormControl('100 à 300 TND', { nonNullable: true });
  readonly input = new FormControl('', { nonNullable: true });

  async send() {
    const content = this.input.value.trim();
    if (!content || this.loading()) return;
    const next: Message[] = [...this.messages(), { role: 'user', content }];
    this.messages.set(next);
    this.input.reset('');
    this.loading.set(true);
    this.scrollToEnd();
    try {
      // 12 messages au plus (limite du serveur) : le message système puis les plus récents
      const recent = [next[0], ...next.slice(1).slice(-11)];
      const answer = await this.trpc.ai.chat.mutate({ messages: recent, style: this.style.value, budget: this.budget.value });
      this.messages.update((list) => [...list, { role: 'assistant', content: answer }]);
    } catch {
      this.messages.update((list) => [...list, { role: 'assistant', content: 'Je rencontre un souci temporaire. Vous pouvez préciser votre pièce, ses dimensions et le style recherché, puis réessayer.' }]);
    } finally {
      this.loading.set(false);
      this.scrollToEnd();
    }
  }

  /** Entrée envoie, Maj + Entrée va à la ligne (comme la boîte de discussion React) */
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  private scrollToEnd() {
    setTimeout(() => {
      const el = this.scrollArea()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
