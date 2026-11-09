// Statuts d'une commande, partagés par le navigateur et le serveur.
export const ORDER_STATUS = Object.freeze({
  NEW: 'nouvelle',
  PREPARING: 'en_cours',
  READY: 'prete',
  SERVED: 'servie',
  CANCELLED: 'annulee',
});

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

// Une commande servie ou annulée ne change plus.
export const FINAL_STATUSES = [ORDER_STATUS.SERVED, ORDER_STATUS.CANCELLED];
export const isFinal = (status) => FINAL_STATUSES.includes(status);

// Libellés du comptoir (en français) ; le client a les siens dans shared/i18n.
export const STATUS_LABELS = {
  [ORDER_STATUS.NEW]: 'Reçue',
  [ORDER_STATUS.PREPARING]: 'En préparation',
  [ORDER_STATUS.READY]: 'Prête',
  [ORDER_STATUS.SERVED]: 'Servie',
  [ORDER_STATUS.CANCELLED]: 'Annulée',
};

export const MAX_LINE_QTY = 20;
export const MAX_LINES = 50;
export const MAX_NOTE_LENGTH = 200;

export const clampQty = (qty) => Math.max(1, Math.min(MAX_LINE_QTY, parseInt(qty, 10) || 1));
