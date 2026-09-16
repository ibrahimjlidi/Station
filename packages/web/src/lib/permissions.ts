import type { Role } from './auth';

export type PermissionKey =
  | 'dashboard'
  | 'carburant.releves'
  | 'carburant.stock'
  | 'carburant.retours'
  | 'carburant.inventaires'
  | 'carburant.jaugeages'
  | 'boutique.produits'
  | 'boutique.achats'
  | 'boutique.inventaire'
  | 'boutique.ventes'
  | 'caisse.saisie'
  | 'caisse.cloture'
  | 'clients.liste'
  | 'clients.bl'
  | 'clients.factures'
  | 'clients.impayes'
  | 'fournisseurs.liste'
  | 'fournisseurs.reglements'
  | 'fournisseurs.retenues'
  | 'fournisseurs.avoirs'
  | 'banque.mouvements'
  | 'banque.position'
  | 'cartes.gestion'
  | 'cartes.import'
  | 'entretien.liste'
  | 'entretien.carwash'
  | 'entretien.vehicules'
  | 'entretien.services'
  | 'rapports.journalier'
  | 'rapports.mensuel'
  | 'rapports.clients'
  | 'rapports.fournisseurs'
  | 'systeme'
  | 'referentiels'
  | 'utilisateurs'
  | 'mon-compte';

const allRoles: Role[] = ['gerant', 'caissier', 'vendeur'];
const cashierRoles: Role[] = ['gerant', 'caissier'];
const managerRoles: Role[] = ['gerant'];

export const permissionRoles: Record<PermissionKey, Role[]> = {
  dashboard: allRoles,
  'carburant.releves': cashierRoles,
  'carburant.stock': allRoles,
  'carburant.retours': cashierRoles,
  'carburant.inventaires': managerRoles,
  'carburant.jaugeages': cashierRoles,
  'boutique.produits': allRoles,
  'boutique.achats': cashierRoles,
  'boutique.inventaire': managerRoles,
  'boutique.ventes': allRoles,
  'caisse.saisie': cashierRoles,
  'caisse.cloture': cashierRoles,
  'clients.liste': cashierRoles,
  'clients.bl': cashierRoles,
  'clients.factures': cashierRoles,
  'clients.impayes': cashierRoles,
  'fournisseurs.liste': cashierRoles,
  'fournisseurs.reglements': cashierRoles,
  'fournisseurs.retenues': managerRoles,
  'fournisseurs.avoirs': managerRoles,
  'banque.mouvements': cashierRoles,
  'banque.position': cashierRoles,
  'cartes.gestion': cashierRoles,
  'cartes.import': cashierRoles,
  'entretien.liste': cashierRoles,
  'entretien.carwash': cashierRoles,
  'entretien.vehicules': cashierRoles,
  'entretien.services': managerRoles,
  'rapports.journalier': allRoles,
  'rapports.mensuel': allRoles,
  'rapports.clients': allRoles,
  'rapports.fournisseurs': allRoles,
  systeme: managerRoles,
  referentiels: managerRoles,
  utilisateurs: managerRoles,
  'mon-compte': allRoles,
};

export function canAccess(role: Role | undefined, permission: PermissionKey) {
  return Boolean(role && permissionRoles[permission].includes(role));
}

const routePermissions: Array<{ prefix: string; permission: PermissionKey }> = [
  { prefix: '/carburant/releves', permission: 'carburant.releves' },
  { prefix: '/carburant/stock', permission: 'carburant.stock' },
  { prefix: '/carburant/retours', permission: 'carburant.retours' },
  { prefix: '/carburant/inventaires', permission: 'carburant.inventaires' },
  { prefix: '/carburant/jaugeages', permission: 'carburant.jaugeages' },
  { prefix: '/boutique/produits', permission: 'boutique.produits' },
  { prefix: '/boutique/achats', permission: 'boutique.achats' },
  { prefix: '/boutique/inventaire', permission: 'boutique.inventaire' },
  { prefix: '/boutique/ventes', permission: 'boutique.ventes' },
  { prefix: '/caisse/saisie', permission: 'caisse.saisie' },
  { prefix: '/caisse/cloture', permission: 'caisse.cloture' },
  { prefix: '/clients/bl', permission: 'clients.bl' },
  { prefix: '/clients/factures', permission: 'clients.factures' },
  { prefix: '/clients/impayes', permission: 'clients.impayes' },
  { prefix: '/clients', permission: 'clients.liste' },
  { prefix: '/fournisseurs/reglements', permission: 'fournisseurs.reglements' },
  { prefix: '/fournisseurs/retenues', permission: 'fournisseurs.retenues' },
  { prefix: '/fournisseurs/avoirs', permission: 'fournisseurs.avoirs' },
  { prefix: '/fournisseurs', permission: 'fournisseurs.liste' },
  { prefix: '/banque/mouvements', permission: 'banque.mouvements' },
  { prefix: '/banque/position', permission: 'banque.position' },
  { prefix: '/cartes/import', permission: 'cartes.import' },
  { prefix: '/cartes', permission: 'cartes.gestion' },
  { prefix: '/entretien/services', permission: 'entretien.services' },
  { prefix: '/entretien/carwash', permission: 'entretien.carwash' },
  { prefix: '/entretien/vehicules', permission: 'entretien.vehicules' },
  { prefix: '/entretien', permission: 'entretien.liste' },
  { prefix: '/rapports/journalier', permission: 'rapports.journalier' },
  { prefix: '/rapports/mensuel', permission: 'rapports.mensuel' },
  { prefix: '/rapports/clients', permission: 'rapports.clients' },
  { prefix: '/rapports/fournisseurs', permission: 'rapports.fournisseurs' },
  { prefix: '/systeme', permission: 'systeme' },
  { prefix: '/referentiels', permission: 'referentiels' },
  { prefix: '/utilisateurs', permission: 'utilisateurs' },
  { prefix: '/mon-compte', permission: 'mon-compte' },
];

export function permissionForPath(pathname: string): PermissionKey {
  return routePermissions.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.permission ?? 'dashboard';
}
