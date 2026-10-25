import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../../../core/guards/auth.guards';
import { AuthService } from '../../../core/services/auth.service';

/** Longueur d'un token de réinitialisation (nanoid(48) côté serveur : lettres, chiffres, « - » et « _ ») */
export const RESET_TOKEN_LENGTH = 48;

/**
 * Nettoie un token collé : espaces, apostrophes ou guillemets autour, « resetToken: » devant, ou toute la ligne
 * « CODE À COPIER (…) : xxx » du fichier privé du site local. Le serveur reste seul juge du token.
 */
export function cleanResetToken(raw: string): string {
  let token = raw.trim();
  if (/CODE À COPIER/i.test(token)) token = token.slice(token.lastIndexOf(' : ') + 3);
  token = token.replace(/^.*resetToken:\s*/i, '');
  return token.replace(/^['"`«\s]+|['"`»,;\s]+$/g, '');
}

/**
 * Page « Connexion » : formulaire réactif + appel au vrai back (auth.login) via AuthService.
 * Après la connexion, on revient sur la page demandée (?retour=…, posé par authGuard ou l'intercepteur).
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Page à rouvrir après la connexion (jamais une adresse extérieure au site) */
  readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('retour'));
  readonly sessionExpired = this.route.snapshot.queryParamMap.get('session') === 'expiree';

  /** Le formulaire est décrit en TypeScript, avec ses règles de validation. */
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly sending = signal(false);
  readonly errorMessage = signal('');

  // ----- Mot de passe oublié / nouveau mot de passe (procédures auth.forgotPassword et auth.resetPassword) -----
  readonly mode = signal<'login' | 'forgot' | 'reset'>('login');
  readonly forgotSent = signal(false);
  readonly resetDone = signal(false);
  readonly forgotForm = new FormGroup({ email: new FormControl('', { nonNullable: true }) });
  readonly resetForm = new FormGroup({
    token: new FormControl('', { nonNullable: true }),
    newPassword: new FormControl('', { nonNullable: true }),
    confirm: new FormControl('', { nonNullable: true }),
  });

  setMode(mode: 'login' | 'forgot' | 'reset') {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.forgotSent.set(false);
    this.resetDone.set(false);
  }

  async sendForgot() {
    const email = this.forgotForm.controls.email.value.trim();
    if (!email) return this.errorMessage.set('Veuillez saisir votre adresse email.');
    await this.run(async () => {
      await this.auth.forgotPassword(email);
      this.forgotSent.set(true);
    });
  }

  readonly tokenLength = RESET_TOKEN_LENGTH;

  /**
   * Mêmes contrôles que la fenêtre React ; le serveur vérifie le token (valable 1 heure, une seule fois).
   * Le token est d'abord nettoyé (apostrophes, « resetToken: »… collés par erreur), puis sa longueur est vérifiée.
   */
  async sendReset() {
    const { token: brut, newPassword, confirm } = this.resetForm.getRawValue();
    const token = cleanResetToken(brut);
    if (!token) return this.errorMessage.set('Veuillez renseigner le token de réinitialisation.');
    if (token.length !== RESET_TOKEN_LENGTH) {
      return this.errorMessage.set(`Le token doit contenir ${RESET_TOKEN_LENGTH} caractères (vous en avez collé ${token.length}). Copiez uniquement le code, sans apostrophes.`);
    }
    if (newPassword.length < 8) return this.errorMessage.set('Le nouveau mot de passe doit comporter au moins 8 caractères.');
    if (newPassword !== confirm) return this.errorMessage.set('Les mots de passe ne correspondent pas.');
    this.resetForm.controls.token.setValue(token);
    await this.run(async () => {
      await this.auth.resetPassword(token, newPassword);
      this.resetDone.set(true);
    });
  }

  private async run(action: () => Promise<void>) {
    this.sending.set(true);
    this.errorMessage.set('');
    try {
      await action();
    } catch (e) {
      this.errorMessage.set(e instanceof Error ? e.message : 'La demande a échoué.');
    } finally {
      this.sending.set(false);
    }
  }

  async submit() {
    // Affiche les erreurs de tous les champs si l'utilisateur valide trop tôt
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.errorMessage.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      // Message renvoyé par le serveur, ex. « Email ou mot de passe incorrect »
      this.errorMessage.set(error instanceof Error ? error.message : 'La connexion a échoué.');
    } finally {
      this.sending.set(false);
    }
  }
}
