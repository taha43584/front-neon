import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { SiteService } from './core/services/site.service';
import { ViewportService } from './core/services/viewport.service';
import { ThemeService } from './core/services/theme.service';
import { SiteHeaderComponent } from './core/layout/site-header.component';
import { SiteFooterComponent } from './core/layout/site-footer.component';
import { MobileNavComponent } from './core/layout/mobile-nav.component';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';

/** Composant racine : en-tête, page courante, pied de page et barre du bas (téléphone). */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, MobileNavComponent, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  readonly loading = inject(LoadingService);
  private readonly auth = inject(AuthService);
  private readonly site = inject(SiteService);
  private readonly router = inject(Router);

  /** Console d'administration et espace vendeur : applications indépendantes, sans l'en-tête ni le pied du site (comme le site React) */
  readonly adminConsole = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map((e) => /^\/(admin|espace-vendeur)(\/|\?|$)/.test((e as NavigationEnd).urlAfterRedirects))),
    { initialValue: false },
  );

  private readonly viewport = inject(ViewportService);
  /** A-10e : créé au démarrage pour suivre le réglage clair / sombre de l'appareil */
  private readonly theme = inject(ThemeService);
  private readonly url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map((e) => (e as NavigationEnd).urlAfterRedirects)),
    // Valeur de départ : l'adresse du navigateur (router.url vaut encore « / » avant la 1re navigation :
    // l'en-tête serait affiché puis retiré sur une fiche ouverte directement → décalage CLS)
    { initialValue: location.pathname },
  );
  /** A-10d : fiche produit sur téléphone = plein écran « façon application » (photo en haut, barre d'achat en bas) :
   *  ni l'en-tête du site ni la barre de navigation du bas */
  readonly phoneProductPage = computed(() => this.viewport.phone() && this.url().startsWith('/produit/'));

  ngOnInit() {
    // Au démarrage : qui est connecté ? (cookie de session envoyé au back via le proxy)
    void this.auth.loadCurrentUser();
    // Paramètres du marketplace, catégories du menu et du pied de page
    this.site.load();
  }
}
