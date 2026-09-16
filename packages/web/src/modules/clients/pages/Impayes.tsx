import { useState } from 'react';
import { Card, Select, Table, Tag, Typography } from 'antd';
import { useClients, useImpayes } from '../hooks/useClients';

export function Impayes() {
  const [clientId, setClientId] = useState<number>(); const { data: clients = [] } = useClients(); const { data: impayes = [], isLoading } = useImpayes(clientId);
  return <section className="page-section"><div className="page-heading"><div><Typography.Text className="eyebrow">CLIENTS / RISQUE</Typography.Text><Typography.Title level={2}>Impayés</Typography.Title></div><Select allowClear placeholder="Filtrer par client" style={{ width: 260 }} value={clientId} onChange={setClientId} options={clients.map((client) => ({ value: client.id, label: client.nomClient }))} /></div><Card><Table rowKey="id" loading={isLoading} dataSource={impayes} columns={[{ title: 'Client', dataIndex: ['client', 'nomClient'] }, { title: 'Date règlement', dataIndex: 'dateReg' }, { title: 'Échéance', dataIndex: 'echeance' }, { title: 'Montant', dataIndex: 'montantLigne', render: (value) => `${value.toFixed(3)} TND` }, { title: 'Retard', dataIndex: 'joursRetard', render: (value) => <Tag color="red">{value} jour{value > 1 ? 's' : ''}</Tag> }, { title: 'Banque', dataIndex: 'nomBanque' }]} /></Card></section>;
}
