/** Günlük ciro primi. 220-dən aşağı 0, yuxarı pillə 8 AZN-dən keçmir. */
export const CIRO_BONUS_TIERS = [
  { min: 220, max: 249.99, bonus: 2 },
  { min: 250, max: 299.99, bonus: 4 },
  { min: 300, max: 349.99, bonus: 6 },
  { min: 350, max: null, bonus: 8 },
];

export function ciroBonus(total) {
  const amount = Number(total) || 0;
  if (amount >= 350) return 8;
  if (amount >= 300) return 6;
  if (amount >= 250) return 4;
  if (amount >= 220) return 2;
  return 0;
}
