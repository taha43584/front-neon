/**
 * Lien WhatsApp « click to chat » (A-10e) : https://wa.me/<numéro international, chiffres seulement>?text=<message encodé>.
 * Aucune API payante : le lien ouvre simplement WhatsApp sur le téléphone du client.
 * Numéro tunisien à 8 chiffres → indicatif 216 ajouté ; « 00216… » / « +216… » → 216… ; autre numéro international
 * de 10 à 15 chiffres gardé tel quel. Un numéro illisible donne null : l'encadré est caché plutôt qu'un lien faux.
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) return `216${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function whatsappLink(raw: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(raw);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
