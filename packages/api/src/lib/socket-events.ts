export const SOCKET_EVENTS = {
  STOCK_CUVE_UPDATED: 'stock:cuve:updated',
  STOCK_PRODUIT_UPDATED: 'stock:produit:updated',
  SESSION_OPENED: 'session:opened',
  SESSION_CLOSED: 'session:closed',
  CLOTURE_DONE: 'cloture:done',
  RECETTE_ADDED: 'recette:added',
  DEPENSE_ADDED: 'depense:added',
  CREDIT_ADDED: 'credit:added',
  ACHAT_CARBURANT_VALIDATED: 'achat:carburant:validated',
  ACHAT_PRODUIT_VALIDATED: 'achat:produit:validated',
  ALERT_STOCK_BAS: 'alert:stock:bas',
  ALERT_ECART_JAUGEAGE: 'alert:ecart:jaugeage',
  ALERT_IMPAYE: 'alert:impaye',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
