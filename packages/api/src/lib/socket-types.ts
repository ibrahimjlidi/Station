export interface StockCuveUpdatedPayload { cuveId: number; libelle: string; stockActuel: number; volumeTotal: number; pourcentage: number; }
export interface StockProduitUpdatedPayload { produitId: number; libelle: string; stockActuel: number; }
export interface SessionOpenedPayload { sessionId: number; date: string; equipeId: number; caisseId: number; magasinId: number; }
export interface SessionClosedPayload extends SessionOpenedPayload {}
export interface ClotureDonePayload { date: string; equipeId: number; magasinId: number; }
export interface RecetteAddedPayload { magasinId: number; caisseId: number; equipeId: number; montant: number; modePayment: string; total: number; }
export interface DepenseAddedPayload { magasinId: number; caisseId: number; equipeId: number; montant: number; codeDepense: number; total: number; }
export interface CreditAddedPayload { magasinId: number; clientId: number; montant: number; total: number; }
export interface AchatCarburantValidatedPayload { achatId: number; cuves: Array<{ cuveId: number; newStock: number }>; }
export interface AchatProduitValidatedPayload { achatId: number; produits: Array<{ produitId: number; newStock: number }>; }
export interface AlertStockBasPayload { type: 'cuve' | 'produit'; id: number; nom: string; stockActuel: number; pourcentage?: number; }
export interface AlertEcartJaugeagePayload { cuveId: number; libelle: string; stockTheorique: number; stockPhysique: number; ecart: number; date: string; }
export interface AlertImpayePayload { clientId: number; nomClient: string; montant: number; echeance: string | null; }
