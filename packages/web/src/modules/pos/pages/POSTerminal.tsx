import { useMemo, useState } from 'react';
import { Button, Card, Col, Input, InputNumber, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useCaisses, useEquipes, useVendeurs } from '../../carburant/hooks/useCarburant';
import { useModesPayment } from '../../caisse/hooks/useCaisse';
import { useProduits, type Produit } from '../../boutique/hooks/useBoutique';
import { useCreatePOSTicket } from '../hooks/usePOS';

interface CartLine { product: Produit; quantity: number; remise: number; }
export function POSTerminal() {
  const { data: products = [] } = useProduits();
  const { data: caisses = [] } = useCaisses();
  const { data: equipes = [] } = useEquipes();
  const { data: vendeurs = [] } = useVendeurs();
  const { data: modes = [] } = useModesPayment();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [caisseId, setCaisseId] = useState<number>();
  const [equipeId, setEquipeId] = useState<number>();
  const [vendeurId, setVendeurId] = useState<number>();
  const [modePaymentId, setModePaymentId] = useState<number>();
  const [paid, setPaid] = useState(0);
  const [remise, setRemise] = useState(0);
  const [messageApi, holder] = message.useMessage();
  const create = useCreatePOSTicket();
  const visible = products.filter((product) => product.libelle.toLowerCase().includes(search.toLowerCase()) || product.code.toLowerCase().includes(search.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, line) => sum + line.quantity * line.product.prixVenteHT * (1 + line.product.tauxTVA / 100) - line.remise, 0) - remise, [cart, remise]);
  const add = (product: Produit) => setCart((current) => { const found = current.find((line) => line.product.id === product.id); if (found) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) } : line); return [...current, { product, quantity: 1, remise: 0 }]; });
  const submit = async () => { if (!caisseId || !equipeId || !vendeurId || !modePaymentId || !cart.length || Math.abs(paid - total) > 0.0001) { messageApi.warning('Complétez la caisse, le vendeur, le panier et le paiement exact.'); return; } try { const result = await create.mutateAsync({ caisseId, equipeId, vendeurId, remise, lignes: cart.map((line) => ({ produitId: line.product.id, quantite: line.quantity, remise: line.remise })), paiements: [{ modePaymentId, montant: paid }] }); window.print(); messageApi.success(`Ticket ${result.data.id} validé.`); setCart([]); setPaid(0); } catch (error: any) { messageApi.error(error.response?.data?.message ?? 'Validation du ticket impossible.'); } };
  return <section className="page-section">{holder}<div className="page-heading"><div><Typography.Text className="eyebrow">POS / VENTE</Typography.Text><Typography.Title level={2}>Terminal boutique</Typography.Title></div><Tag color="blue">CAISSE POS</Tag></div><Row gutter={[16, 16]}><Col xs={24} lg={15}><Card title="Articles"><Input.Search placeholder="Code ou libellé" onChange={(event) => setSearch(event.target.value)} style={{ marginBottom: 16 }} /><Table rowKey="id" dataSource={visible} pagination={{ pageSize: 8 }} columns={[{ title: 'Article', dataIndex: 'libelle' }, { title: 'Prix TTC', render: (_: unknown, row: Produit) => `${(row.prixVenteHT * (1 + row.tauxTVA / 100)).toFixed(3)} TND` }, { title: 'Stock', dataIndex: 'stock', render: (value: number) => <Tag color={value > 0 ? 'green' : 'red'}>{value.toFixed(3)}</Tag> }, { title: 'Action', render: (_: unknown, row: Produit) => <Button disabled={row.stock <= 0} onClick={() => add(row)}>Ajouter</Button> }]} /></Card></Col><Col xs={24} lg={9}><Card title="Panier"><Table rowKey={(row) => String(row.product.id)} pagination={false} dataSource={cart} columns={[{ title: 'Article', render: (_: unknown, row: CartLine) => row.product.libelle }, { title: 'Qté', render: (_: unknown, row: CartLine) => <InputNumber min={1} max={row.product.stock} value={row.quantity} onChange={(value) => setCart((current) => current.map((line) => line.product.id === row.product.id ? { ...line, quantity: value ?? 1 } : line))} /> }, { title: 'Total', render: (_: unknown, row: CartLine) => `${(row.quantity * row.product.prixVenteHT * (1 + row.product.tauxTVA / 100) - row.remise).toFixed(3)}` }]} /><Space direction="vertical" style={{ width: '100%' }}><Select placeholder="Caisse POS" value={caisseId} options={caisses.filter((caisse) => caisse.type === 'POS').map((caisse) => ({ value: caisse.id, label: caisse.libelle }))} onChange={setCaisseId} /><Select placeholder="Équipe" value={equipeId} options={equipes.map((team) => ({ value: team.id, label: team.libelle }))} onChange={setEquipeId} /><Select placeholder="Vendeur" value={vendeurId} options={vendeurs.map((seller) => ({ value: seller.id, label: seller.nom }))} onChange={setVendeurId} /><InputNumber min={0} precision={3} addonBefore="Remise" value={remise} onChange={(value) => setRemise(value ?? 0)} /><Select placeholder="Mode de paiement" value={modePaymentId} options={modes.map((mode) => ({ value: mode.id, label: mode.libelle }))} onChange={setModePaymentId} /><InputNumber min={0} precision={3} addonBefore="Payé" value={paid} onChange={(value) => setPaid(value ?? 0)} /><Typography.Title level={4}>Total: {total.toFixed(3)} TND</Typography.Title><Button type="primary" onClick={submit} loading={create.isPending}>Valider et imprimer</Button></Space></Card></Col></Row></section>;
}
