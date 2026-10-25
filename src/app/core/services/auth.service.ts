import { Injectable, computed, inject, signal } from '@angular/core';
import { TrpcClient, TrpcService } from '../api/trpc-client';

/** Utilisateur connecté tel que renvoyé par le serveur (type déduit de la procédure auth.me). */
export type CurrentUser = NonNullable<Awaited<ReturnType<TrpcClient['auth']['me']['query']>>>;

/**
 * Service d'authentification : un seul exemplaire pour toute l'application (providedIn: 'root').
 * Il garde l'utilisateur connecté dans un signal ; les composants qui l'affichent se mettent à jour seuls.
 * La session est un cookie httpOnly posé par le serveur : Angular ne voit jamais le jeton.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly trpc = inject(TrpcService).client;
  private firstLoad: Promise<void> | null = null;

  /** null = personne n'est connecté */
  readonly user = signal<CurrentUser | null>(null);
  /** true tant qu'on ne sait pas encore si quelqu'un est connecté (au démarrage) */
  readonly loading = signal(true);
  readonly isLoggedIn = computed(() => this.user() !== null);
  /** Seuls les comptes Client peuvent commander (règle du serveur) */
  readonly isCustomer = computed(() => this.user()?.role === 'user');

  /** Au démarrage : demande au serveur qui est connecté (grâce au cookie de session). Un seul appel. */
  loadCurrentUser() {
    this.firstLoad ??= this.refresh();
    return this.firstLoad;
  }

  /** Relit l'utilisateur sur le serveur (après une modification du profil, par exemple). */
  async refresh() {
    try {
      this.user.set(await this.trpc.auth.me.query());
    } catch {
      this.user.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  /** Connexion avec la procédure existante auth.login ; en cas d'erreur, le message du serveur est relancé. */
  async login(email: string, password: string) {
    const result = await this.trpc.auth.login.mutate({ email, password });
    this.user.set(result.user);
    return result.user;
  }

  /** Inscription d'un client (auth.registerCustomer) : le serveur ouvre aussitôt la session */
  async registerCustomer(input: Parameters<TrpcClient['auth']['registerCustomer']['mutate']>[0]) {
    const result = await this.trpc.auth.registerCustomer.mutate(input);
    await this.refresh();
    return result;
  }

  /** Inscription d'un vendeur (auth.registerVendor) : boutique créée « en attente de validation » */
  async registerVendor(input: Parameters<TrpcClient['auth']['registerVendor']['mutate']>[0]) {
    const result = await this.trpc.auth.registerVendor.mutate(input);
    await this.refresh();
    return result;
  }

  /** Mot de passe oublié : réponse identique qu'un compte existe ou non (règle du serveur) */
  forgotPassword(email: string) {
    return this.trpc.auth.forgotPassword.mutate({ email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.trpc.auth.resetPassword.mutate({ token, newPassword });
  }

  async logout() {
    await this.trpc.auth.logout.mutate();
    this.user.set(null);
  }
}
