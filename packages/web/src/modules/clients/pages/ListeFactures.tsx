import { Button, Card, Table, Tag, Typography, message } from 'antd';
import { useBonsLivraison, useFacturerBon, useFactures } from '../hooks/useClients';

const money = (value: number) => `${(value ?? 0).toFixed(3)} TND`;

export function ListeFactures() {
  const { data: factures = [], isLoading } = useFactures(); const { data: bons = [] } = useBonsLivraison(); const facturer = useFacturerBon(); const [messageApi, holder] = message.useMessage();
  const submit = async (id: number) => { try { await facturer.mutateAsync(id); messageApi.success('Facture créée.'); } catch (error: any) { messageApi.error(error?.response?.data?.message ?? 'Facturation impossible.'); } };
  return <section className="page-section">{holder}<div className="page-heading"><div><Typography.Text className="eyebrow">CLIENTS / FACTURATION</Typography.Text><Typography.Title level={2}>Factures</Typography.Title></div></div><Card title="Bons à facturer" className="table-card"><Table rowKey="id" pagination={{ pageSize: 5 }} dataSource={bons.filter((bon) => !bon.numFact)} columns={[{ title: 'Date', dataIndex: 'date' }, { title: 'Client', dataIndex: ['client', 'nomClient'] }, { title: 'Total TTC', dataIndex: 'totalTTC', render: money }, { title: 'Action', render: (_, bon) => <Button type="primary" size="small" onClick={() => submit(bon.id)} loading={facturer.isPending}>Facturer</Button> }]} /></Card><Card title="Factures émises"><Table rowKey="id" loading={isLoading} dataSource={factures} columns={[{ title: 'N°', dataIndex: 'id' }, { title: 'Date', dataIndex: 'date' }, { title: 'Client', dataIndex: ['client', 'nomClient'] }, { title: 'Total TTC', dataIndex: 'totalTTC', render: money }, { title: 'Statut', dataIndex: 'statut', render: (value) => <Tag color={value === 'reglee' ? 'green' : value === 'partielle' ? 'orange' : 'red'}>{value}</Tag> }]} /></Card></section>;
}
