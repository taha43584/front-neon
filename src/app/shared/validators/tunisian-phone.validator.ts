import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Numéro tunisien → ses 8 chiffres, ou null s'il n'est pas valide.
 * Formats acceptés : « 20123456 », « 20 123 456 », « +216 20 123 456 », « 00216 20 123 456 »,
 * avec espaces, points, tirets ou parenthèses. Les numéros tunisiens commencent par 2, 3, 4, 5, 7 ou 9.
 */
export function normalizeTunisianPhone(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim();
  if (!text || /[^0-9+\s.\-()]/.test(text)) return null;
  let digits = text.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('00216')) digits = digits.slice(5); // 00216 XX XXX XXX
  else if (digits.length === 11 && digits.startsWith('216')) digits = digits.slice(3); // +216 XX XXX XXX
  return /^[234579]\d{7}$/.test(digits) ? digits : null;
}

/**
 * Validateur de formulaire : numéro tunisien (voir normalizeTunisianPhone).
 * Le numéro est ensuite NORMALISÉ en 8 chiffres avant l'envoi ; le serveur le vérifie de nouveau.
 */
export const tunisianPhoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!String(control.value ?? '').trim()) return null; // le champ vide est géré par Validators.required
  return normalizeTunisianPhone(control.value) ? null : { tunisianPhone: true };
};

/** Gouvernorats et lecture « ville, gouvernorat » : partagés avec le serveur (avis clients), importés et non copiés */
export { GOVERNORATES, sameName, splitCity } from '@shared/tunisia';
