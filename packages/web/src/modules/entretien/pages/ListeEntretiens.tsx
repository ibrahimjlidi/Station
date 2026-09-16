import { useState } from 'react';
import { Button, Card, DatePicker, Drawer, Form, InputNumber, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { useCreateEntretien, useEntretien, useEntretiens } from '../hooks/useEntretien';

export function ListeEntretiens() {
  const [selected, setSelected] = useState<number>();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, holder] = message.useMessage();
  const { data: rows = [] } = useEntretiens();
  const { data: detail } = useEntretien(selected);
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicules'], queryFn: async () => (await api.get('/entretien/vehicules')).data });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/entretien/services')).data });
  const create = useCreateEntretien();
  const submit = async (values: any) => {
    try {
      const vehicle = vehicles.find((item: any) => item.id === values.vehiculeId);
      await create.mutateAsync({ dateEnt: values.dateEnt.format('YYYY-MM-DD'), matricule: vehicle.matricule, clientId: vehicle.client.id, vehiculeId: vehicle.id, indexKm: values.indexKm, prochainIndex: values.prochainIndex, lignes: values.lignes.map((line: any) => ({ serviceId: line.serviceId })) });
      setOpen(false); form.resetFields(); messageApi.success('Fiche entretien créée.');
    } catch { messageApi.error('Création impossible.'); }
  };
  return <section className="page-section">{holder}
    <div className="page-heading"><div><Typography.Text className="eyebrow">ENTRETIEN / VÉHICULES</Typography.Text><Typography.Title level={2}>Entretiens</Typography.Title></div><Button type="primary" onClick={() => setOpen(true)}>Nouvelle fiche</Button></div>
    <Card><Table rowKey="id" dataSource={rows} onRow={(row) => ({ onClick: () => setSelected(row.id) })} columns={[{ title: 'Client', dataIndex: ['client', 'nomClient'] }, { title: 'Matricule', dataIndex: 'matricule' }, { title: 'Date', dataIndex: 'dateEnt' }, { title: 'Total TTC', dataIndex: 'totEntTTC' }, { title: 'Index km', dataIndex: 'indexKm' }, { title: 'Prochain index', dataIndex: 'prochainIndex' }]} /></Card>
    <Drawer title="Détail entretien" open={Boolean(selected)} onClose={() => setSelected(undefined)}><Table rowKey="id" dataSource={detail?.details ?? []} columns={[{ title: 'Service', render: (_: unknown, line: any) => line.serviceCatalog?.libelle ?? line.service?.libelle ?? 'Service' }, { title: 'HT', dataIndex: 'prixHT' }, { title: 'TTC', dataIndex: 'prixTTC' }]} /></Drawer>
    <Drawer title="Nouvelle fiche" open={open} onClose={() => setOpen(false)} width={520}><Form form={form} layout="vertical" initialValues={{ dateEnt: dayjs(), lignes: [{}] }} onFinish={submit}>
      <Form.Item name="dateEnt" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="vehiculeId" label="Véhicule" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={vehicles.map((vehicle: any) => ({ value: vehicle.id, label: `${vehicle.matricule} · ${vehicle.client?.nomClient ?? ''}` }))} /></Form.Item>
      <Space><Form.Item name="indexKm" label="Index km" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item><Form.Item name="prochainIndex" label="Prochain index" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item></Space>
      <Form.List name="lignes">{(fields, { add, remove }) => <>{fields.map((field) => <Space key={field.key} align="baseline"><Form.Item {...field} name={[field.name, 'serviceId']} rules={[{ required: true }]}><Select placeholder="Service" style={{ width: 280 }} options={services.map((service: any) => ({ value: service.id, label: `${service.libelle} · ${service.prixTTC} TTC` }))} /></Form.Item><Button onClick={() => remove(field.name)}>Supprimer</Button></Space>)}<Button type="dashed" onClick={() => add()}>Ajouter un service</Button></>}</Form.List>
      <Button type="primary" htmlType="submit" loading={create.isPending} style={{ marginTop: 16 }}>Enregistrer</Button>
    </Form></Drawer>
  </section>;
}
