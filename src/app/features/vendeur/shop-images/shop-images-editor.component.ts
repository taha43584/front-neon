import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { SHOP_IMAGE_SPECS, shopInitials, type ShopImageSlot } from '@shared/shopValidation';
import { CropArea, ImageCropperComponent } from '../../../shared/components/image-cropper/image-cropper.component';
import { ShopImageService } from '../../../core/services/shop-image.service';
import { VendorService } from '../../../core/services/vendor.service';

const TEXT = {
  logo: { change: 'Changer la photo de profil', saved: 'Photo de profil mise à jour', removed: 'Photo de profil supprimée', title: 'Recadrer la photo de profil', hint: "Déplacez l'image et ajustez le zoom : seule la partie dans le cercle sera visible." },
  cover: { change: 'Modifier la couverture', saved: 'Photo de couverture mise à jour', removed: 'Photo de couverture supprimée', title: 'Recadrer la photo de couverture', hint: "Déplacez l'image et ajustez le zoom pour choisir la partie visible de la bannière." },
} as const;

/**
 * Photo de profil (logo rond) et photo de couverture de la boutique, façon Facebook / Instagram (comme le site React) :
 * menu « Importer / Supprimer », recadrage dans une fenêtre (<dialog>), envoi de l'image recadrée aux dimensions finales.
 */
@Component({
  selector: 'app-shop-images-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImageCropperComponent],
  templateUrl: './shop-images-editor.component.html',
  styleUrl: './shop-images-editor.component.css',
})
export class ShopImagesEditorComponent {
  private readonly images = inject(ShopImageService);
  private readonly vendor = inject(VendorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly shop = input.required<{ name: string; logoUrl: string | null; coverUrl: string | null }>();
  /** Boutique pas encore approuvée : les images restent privées jusqu'à l'approbation */
  readonly pending = input(false);
  /** Une image a changé : le parent recharge les données de la boutique */
  readonly changed = output<void>();

  readonly text = TEXT;
  readonly initials = shopInitials;
  // Affichage immédiat de la nouvelle image, sans recharger la page
  readonly logoUrl = signal<string | null>(null);
  readonly coverUrl = signal<string | null>(null);
  readonly menu = signal<ShopImageSlot | null>(null);
  readonly message = signal<{ text: string; error: boolean } | null>(null);

  // Fenêtre de recadrage
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('cropBox');
  private readonly logoInput = viewChild.required<ElementRef<HTMLInputElement>>('logoInput');
  private readonly coverInput = viewChild.required<ElementRef<HTMLInputElement>>('coverInput');
  readonly cropping = signal<{ slot: ShopImageSlot; src: string } | null>(null);
  readonly zoom = signal(1);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  readonly progress = signal<number | null>(null);
  readonly cropError = signal<string | null>(null);
  private area: CropArea | null = null;
  private sending: Subscription | null = null;

  constructor() {
    // Les images suivent les données de la boutique (après un rechargement)
    effect(() => {
      this.logoUrl.set(this.shop().logoUrl);
      this.coverUrl.set(this.shop().coverUrl);
    });
    this.destroyRef.onDestroy(() => this.releaseSource());
  }

  aspect(slot: ShopImageSlot) {
    return SHOP_IMAGE_SPECS[slot].width / SHOP_IMAGE_SPECS[slot].height;
  }

  toggleMenu(slot: ShopImageSlot) {
    this.menu.set(this.menu() === slot ? null : slot);
  }

  /** Clic en dehors du menu ou touche Échap : le menu se ferme */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.menu() && !(event.target as HTMLElement).closest('.menu-image')) this.menu.set(null);
  }

  @HostListener('keydown.escape')
  onEscape() {
    const slot = this.menu();
    if (slot) {
      this.menu.set(null);
      this.focusMenuButton(slot);
    }
  }

  /** Le focus revient sur le bouton de la photo (le menu qui l'avait disparaît) */
  private focusMenuButton(slot: ShopImageSlot) {
    this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-menu-button="${slot}"]`)?.focus();
  }

  pick(slot: ShopImageSlot) {
    this.menu.set(null);
    (slot === 'logo' ? this.logoInput() : this.coverInput()).nativeElement.click();
  }

  onFile(slot: ShopImageSlot, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    inputElement.value = '';
    if (!file) return;
    const problem = this.images.check(file);
    if (problem) return this.message.set({ text: problem, error: true });
    this.message.set(null);
    this.releaseSource();
    this.zoom.set(1);
    this.area = null;
    this.cropError.set(null);
    this.progress.set(null);
    this.cropping.set({ slot, src: URL.createObjectURL(file) });
    this.dialog().nativeElement.showModal();
  }

  onArea(area: CropArea) {
    this.area = area;
  }

  changeZoom(value: number) {
    this.zoom.set(Math.min(3, Math.max(1, Math.round(value * 100) / 100)));
  }

  /** Échap pendant l'envoi : la fenêtre reste ouverte */
  onDialogCancel(event: Event) {
    if (this.progress() !== null) event.preventDefault();
    else this.closeCrop();
  }

  closeCrop() {
    this.sending?.unsubscribe();
    this.dialog().nativeElement.close();
    this.releaseSource();
    this.cropping.set(null);
    this.progress.set(null);
  }

  async save() {
    const crop = this.cropping();
    if (!crop || !this.area) return;
    this.cropError.set(null);
    this.progress.set(0);
    try {
      const blob = await this.images.crop(crop.src, this.area, crop.slot);
      this.sending = this.images
        .upload(crop.slot, blob)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event) => {
            if (event.type === 'progress') this.progress.set(event.percent);
            else this.saved(crop.slot, event.url);
          },
          error: (error: Error) => this.failed(error.message),
        });
    } catch (error) {
      this.failed(error instanceof Error ? error.message : "Échec de l'envoi. Réessayez.");
    }
  }

  async remove(slot: ShopImageSlot) {
    this.menu.set(null);
    try {
      await this.vendor.removeShopImage(slot);
      (slot === 'logo' ? this.logoUrl : this.coverUrl).set(null);
      this.message.set({ text: TEXT[slot].removed, error: false });
      this.focusMenuButton(slot);
      this.changed.emit();
    } catch (error) {
      this.message.set({ text: error instanceof Error ? error.message : 'Suppression impossible', error: true });
    }
  }

  private saved(slot: ShopImageSlot, url: string) {
    (slot === 'logo' ? this.logoUrl : this.coverUrl).set(url);
    this.message.set({ text: TEXT[slot].saved, error: false });
    this.closeCrop();
    this.focusMenuButton(slot);
    this.changed.emit();
  }

  private failed(message: string) {
    this.cropError.set(message);
    this.progress.set(null);
  }

  private releaseSource() {
    const current = this.cropping();
    if (current) URL.revokeObjectURL(current.src);
  }
}
