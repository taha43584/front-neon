import { Pipe, PipeTransform } from '@angular/core';

/**
 * Affiche un prix en dinars tunisiens, au même format que le site React : 1234.5 → « 1234,50 DT ».
 * Utilisation dans un gabarit : {{ produit.priceTnd | prixDt }}
 * (Un pipe ne fait que de l'AFFICHAGE : il ne calcule jamais un prix.)
 */
@Pipe({ name: 'prixDt' })
export class PrixDtPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    const amount = Number(value);
    if (value === null || value === undefined || value === '' || !Number.isFinite(amount)) return '';
    return `${amount.toFixed(2).replace('.', ',')} DT`;
  }
}
