// Arrondi au centime, pour éviter les 0,30000000000000004 dans les totaux.
export const roundMoney = (n) => Math.round(n * 100) / 100;
