import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { normalizeFacebookUrl } from '@shared/shopValidation';

/**
 * Validateur de formulaire construit à partir d'une fonction PARTAGÉE (normalizeFacebookUrl / normalizeInstagramUrl) :
 * mêmes règles et même message que le serveur, qui revérifie.
 *   socialFacebook: new FormControl('', { validators: [socialLinkValidator(normalizeFacebookUrl)] })
 */
export function socialLinkValidator(normalize: typeof normalizeFacebookUrl): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = normalize(String(control.value ?? ''));
    return result.ok ? null : { social: result.error };
  };
}
