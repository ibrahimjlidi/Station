import { useState } from 'react';
import { AppstoreOutlined, BankOutlined, CreditCardOutlined, DashboardOutlined, DollarOutlined, FileTextOutlined, InboxOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined, ShopOutlined, ToolOutlined, BarChartOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, Tag, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth';

const { Header, Sider, Content } = Layout;
const items = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'carburant-section', icon: <DollarOutlined />, label: 'Carburant', children: [{ key: '/carburant/releves', label: 'Relevés pompes' }, { key: '/carburant/stock', label: 'Stock cuves' }, { key: '/carburant/retours', label: 'Retours cuve' }, { key: '/carburant/inventaires', label: 'Inventaires carburant' }, { key: '/carburant/jaugeages', label: 'Jaugeages' }] },
  { key: '/boutique', icon: <ShopOutlined />, label: 'Boutique', children: [{ key: '/boutique/produits', label: 'Produits' }, { key: '/boutique/achats', label: 'Achats produits' }, { key: '/boutique/inventaire', label: 'Inventaire' }, { key: '/boutique/ventes', label: 'Résumé des ventes' }] },
  { key: '/caisse', icon: <InboxOutlined />, label: 'Caisse', children: [{ key: '/caisse/saisie', label: 'Saisie de caisse' }, { key: '/caisse/cloture', label: 'Clôture de caisse' }] },
  { key: 'clients-section', icon: <FileTextOutlined />, label: 'Clients & facturation', children: [{ key: '/clients', label: 'Liste des clients' }, { key: '/clients/bl', label: 'Nouveau bon de livraison' }, { key: '/clients/factures', label: 'Factures' }, { key: '/clients/impayes', label: 'Impayés' }] },
  { key: 'fournisseurs-section', icon: <AppstoreOutlined />, label: 'Fournisseurs', children: [{ key: '/fournisseurs', label: 'Liste fournisseurs' }, { key: '/fournisseurs/reglements', label: 'Règlements' }, { key: '/fournisseurs/retenues', label: 'Retenues à la source' }, { key: '/fournisseurs/avoirs', label: 'Avoirs fournisseurs' }] },
  { key: '/banque', icon: <BankOutlined />, label: 'Banque', children: [{ key: '/banque/mouvements', label: 'Mouvements bancaires' }, { key: '/banque/position', label: 'Position bancaire' }] },
  { key: 'cartes-section', icon: <CreditCardOutlined />, label: 'Cartes & bons', children: [{ key: '/cartes', label: 'Gestion des cartes' }, { key: '/cartes/import', label: 'Import CN' }] },
  { key: 'entretien-section', icon: <ToolOutlined />, label: 'Entretien', children: [{ key: '/entretien', label: 'Entretiens' }, { key: '/entretien/carwash', label: 'Car Wash' }, { key: '/entretien/vehicules', label: 'Véhicules' }, { key: '/entretien/services', label: 'Services' }] },
  { key: '/rapports', icon: <BarChartOutlined />, label: 'Rapports', children: [{ key: '/rapports/journalier', label: 'Rapport journalier' }, { key: '/rapports/mensuel', label: 'Rapport mensuel' }, { key: '/rapports/clients', label: 'Soldes clients' }, { key: '/rapports/fournisseurs', label: 'Soldes fournisseurs' }] },
  { key: '/systeme', icon: <SettingOutlined />, label: 'Paramètres' },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const visibleItems = items.filter((item) => user?.role !== 'vendeur' || item.key !== '/caisse').map((item) => item.key === 'entretien-section' && user?.role !== 'gerant' ? { ...item, children: item.children?.filter((child) => child.key !== '/entretien/services') } : item);
  const menuItems = user?.role === 'gerant' ? [...visibleItems, { key: '/referentiels', icon: <SettingOutlined />, label: 'Référentiels' }, { key: '/utilisateurs', icon: <SettingOutlined />, label: 'Utilisateurs' }] : visibleItems;
  return <Layout className="app-shell">
    <Sider collapsible collapsed={collapsed} trigger={null} className="app-sider">
      <div className="brand"><span className="brand-mark">S</span>{!collapsed && <span>STATION<span className="brand-accent">/</span>OS</span>}</div>
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname === '/' ? '/' : location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      <div className="sidebar-account"><Button type="text" onClick={() => navigate('/mon-compte')}><Typography.Text strong>{user?.prenom} {user?.nom}</Typography.Text><Tag color={user?.role === 'gerant' ? 'gold' : user?.role === 'caissier' ? 'blue' : 'default'}>{user?.role}</Tag></Button></div>
    </Sider>
    <Layout>
      <Header className="topbar">
        <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
        <div className="user-area"><Button type="text" onClick={() => navigate('/mon-compte')}>{user?.prenom} {user?.nom}</Button><Button type="text" icon={<LogoutOutlined />} onClick={logout}>Déconnexion</Button></div>
      </Header>
      <Content className="page-content"><Outlet /></Content>
    </Layout>
  </Layout>;
}
