import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminService, MarketplaceSettings, SiteCategoryRow } from '../core/services/admin.service';
import { ThemeChoiceComponent } from '../shared/components/theme-choice/theme-choice.component';

const text = () => new FormControl('', { nonNullable: true });
const bool = () => new FormControl(false, { nonNullable: true });

/**
 * Paramètres du marketplace : enregistrés en base et appliqués immédiatement au site (admin.updateSettings).
 * Comme sur le site React, la validation est faite par le serveur (schéma côté serveur) : son message est affiché.
 */
@Component({
  selector: 'app-admin-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ThemeChoiceComponent],
  templateUrl: './admin-settings.page.html',
  styleUrls: ['./admin.css', './admin-settings.page.css'],
})
export class AdminSettingsPage implements OnInit {
  private readonly admin = inject(AdminService);

  readonly form = new FormGroup({
    marketplaceName: text(), tagline: text(),
    contactEmail: text(), contactPhone: text(), whatsapp: text(), contactAddress: text(), socialInstagram: text(), socialFacebook: text(),
    deliveryInfo: text(),
    requireProductApproval: bool(),
    commissionRate: new FormControl('0', { nonNullable: true }),
    neonCategorySlug: text(), neonBannerHidden: bool(),
    termsOfService: text(), salesTerms: text(),
  });

  readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  readonly loadError = signal('');
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly siteCategories = signal<SiteCategoryRow[]>([]);
  private readonly saved = signal<string>('');

  readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  /** « Modifications non enregistrées » : comparaison avec la dernière version enregistrée */
  readonly dirty = computed(() => this.saved() !== '' && JSON.stringify(this.values()) !== this.saved());
  /** La catégorie enregistrée n'existe plus sur le site */
  readonly missingCategory = computed(() => {
    const slug = this.values().neonCategorySlug;
    return !!slug && this.siteCategories().length > 0 && !this.siteCategories().some((c) => c.slug === slug);
  });

  async ngOnInit() {
    this.admin.siteCategories().then((l) => this.siteCategories.set(l)).catch(() => undefined);
    try {
      this.fill(await this.admin.settings());
      this.status.set('ok');
    } catch (e) {
      this.loadError.set(e instanceof Error ? e.message : 'Paramètres indisponibles');
      this.status.set('error');
    }
  }

  private fill(s: MarketplaceSettings) {
    this.form.reset({ ...s, commissionRate: String(s.commissionRate) });
    this.saved.set(JSON.stringify(this.form.getRawValue()));
  }

  async save() {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.admin.updateSettings({ ...v, commissionRate: Number(v.commissionRate.replace(',', '.')) });
      this.fill(result);
      this.message.set('Paramètres enregistrés et appliqués');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      this.saving.set(false);
    }
  }
}
