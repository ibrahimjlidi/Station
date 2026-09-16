import { useEffect } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Select, Space, Table, Typography, Upload, message } from 'antd';
import { useAuthStore } from '../../../lib/auth';
import { useCaisses, useEquipes, usePompes, useStockCuves } from '../../carburant/hooks/useCarburant';
import { useCompteur, useCreateCuve, useCreateMasterItem, useCreatePompe, useCreateStation, useParametres, useStations, useUpdateParametres } from '../hooks/useParametres';

const errorMessage = (error: any) => error?.response?.data?.message ?? 'Enregistrement impossible.';
const number = (value: number | null | undefined) => value == null ? '-' : value.toFixed(3);

export function Parametres() {
  const user = useAuthStore((state) => state.user);
  const [stationForm] = Form.useForm();
  const [newStationForm] = Form.useForm();
  const [equipeForm] = Form.useForm();
  const [caisseForm] = Form.useForm();
  const [cuveForm] = Form.useForm();
  const [pompeForm] = Form.useForm();
  const [messageApi, holder] = message.useMessage();
  const { data } = useParametres();
  const { data: compteur } = useCompteur();
  const { data: equipes = [] } = useEquipes();
  const { data: caisses = [] } = useCaisses();
  const { data: cuves = [] } = useStockCuves();
  const { data: pompes = [] } = usePompes();
  const { data: stations = [] } = useStations();
  const update = useUpdateParametres();
  const createEquipe = useCreateMasterItem('equipes');
  const createCaisse = useCreateMasterItem('caisses');
  const createCuve = useCreateCuve();
  const createPompe = useCreatePompe();
  const createStation = useCreateStation();

  useEffect(() => { if (data) stationForm.setFieldsValue(data); }, [data, stationForm]);

  if (user?.role !== 'gerant') return <Alert type="warning" message="Accès réservé au gérant." />;

  const saveStation = async (values: unknown) => {
    try { await update.mutateAsync(values as any); messageApi.success('Paramètres enregistrés.'); }
    catch (error) { messageApi.error(errorMessage(error)); }
  };
  const saveSimple = async (form: ReturnType<typeof Form.useForm>[0], mutation: ReturnType<typeof useCreateMasterItem>) => {
    try { await mutation.mutateAsync(form.getFieldsValue() as { code: string; libelle: string }); form.resetFields(); messageApi.success('Élément ajouté.'); }
    catch (error) { messageApi.error(errorMessage(error)); }
  };
  const saveCuve = async () => {
    try { await createCuve.mutateAsync(cuveForm.getFieldsValue()); cuveForm.resetFields(); messageApi.success('Cuve ajoutée.'); }
    catch (error) { messageApi.error(errorMessage(error)); }
  };
  const savePompe = async () => {
    try { await createPompe.mutateAsync(pompeForm.getFieldsValue()); pompeForm.resetFields(); messageApi.success('Pompe ajoutée.'); }
    catch (error) { messageApi.error(errorMessage(error)); }
  };
  const saveNewStation = async () => {
    try { await createStation.mutateAsync(newStationForm.getFieldsValue()); newStationForm.resetFields(); messageApi.success('Station et magasin créés.'); }
    catch (error) { messageApi.error(errorMessage(error)); }
  };

  return <section className="page-section">
    {holder}
    <div className="page-heading"><div><Typography.Text className="eyebrow">SYSTÈME / CONFIGURATION</Typography.Text><Typography.Title level={2}>Paramètres</Typography.Title></div></div>
    <Card title="Station" className="form-card">
      <Form form={stationForm} layout="vertical" onFinish={saveStation}>
        <Form.Item name="nomStation" label="Nom de la station" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="adresse" label="Adresse"><Input /></Form.Item>
        <Form.Item name="tel" label="Téléphone"><Input /></Form.Item>
        <Form.Item name="mf" label="Matricule fiscal"><Input /></Form.Item>
        <Form.Item name="rc" label="Registre commerce"><Input /></Form.Item>
        <Form.Item name="tauxTVADefaut" label="TVA par défaut"><InputNumber min={0} precision={3} /></Form.Item>
        <Form.Item name="timbre" label="Timbre"><InputNumber min={0} precision={3} /></Form.Item>
        <Form.Item name="devise" label="Devise"><Input /></Form.Item>
        <Form.Item label="Logo"><Upload beforeUpload={(file) => { const reader = new FileReader(); reader.onload = () => stationForm.setFieldValue('logoUrl', reader.result); reader.readAsDataURL(file); return false; }} showUploadList={false}><Button>Choisir un logo</Button></Upload></Form.Item>
        <Button type="primary" htmlType="submit" loading={update.isPending}>Enregistrer</Button>
      </Form>
    </Card>
    <Card title="Stations et magasins" className="table-card">
      <Form form={newStationForm} layout="inline" onFinish={saveNewStation}>
        <Form.Item name="code" rules={[{ required: true, message: 'Code requis' }]}><Input placeholder="Code station" /></Form.Item>
        <Form.Item name="nom" rules={[{ required: true, message: 'Nom requis' }]}><Input placeholder="Nom de la station" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={createStation.isPending}>Ajouter une station</Button>
      </Form>
      <Table size="small" pagination={false} rowKey="id" dataSource={stations} columns={[{ title: 'Code', dataIndex: 'code' }, { title: 'Station', dataIndex: 'nom' }, { title: 'Magasin', dataIndex: ['magasin', 'nom'], render: (value) => value ?? '-' }, { title: 'Code magasin', dataIndex: ['magasin', 'code'], render: (value) => value ?? '-' }]} />
    </Card>

    <Card title="Caisses et équipes" className="table-card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Form form={caisseForm} layout="inline" onFinish={() => saveSimple(caisseForm, createCaisse)}>
          <Form.Item name="code" rules={[{ required: true, message: 'Code requis' }]}><Input placeholder="Code caisse" /></Form.Item>
          <Form.Item name="libelle" rules={[{ required: true, message: 'Libellé requis' }]}><Input placeholder="Nom de la caisse" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createCaisse.isPending}>Ajouter une caisse</Button>
        </Form>
        <Table size="small" pagination={false} rowKey="id" dataSource={caisses} columns={[{ title: 'Code', dataIndex: 'code' }, { title: 'Caisse', dataIndex: 'libelle' }]} />
        <Form form={equipeForm} layout="inline" onFinish={() => saveSimple(equipeForm, createEquipe)}>
          <Form.Item name="code" rules={[{ required: true, message: 'Code requis' }]}><Input placeholder="Code équipe" /></Form.Item>
          <Form.Item name="libelle" rules={[{ required: true, message: 'Libellé requis' }]}><Input placeholder="Nom de l'équipe" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createEquipe.isPending}>Ajouter une équipe</Button>
        </Form>
        <Table size="small" pagination={false} rowKey="id" dataSource={equipes} columns={[{ title: 'Code', dataIndex: 'code' }, { title: 'Équipe', dataIndex: 'libelle' }]} />
      </Space>
    </Card>

    <Card title="Cuves et pompes" className="table-card">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Form form={cuveForm} layout="inline" onFinish={saveCuve} initialValues={{ stockInitial: 0, seuilAlerte: 0 }}>
          <Form.Item name="code" rules={[{ required: true, message: 'Code requis' }]}><Input placeholder="Code cuve" /></Form.Item>
          <Form.Item name="libelle" rules={[{ required: true, message: 'Libellé requis' }]}><Input placeholder="Nom de la cuve" /></Form.Item>
          <Form.Item name="carburant" rules={[{ required: true, message: 'Carburant requis' }]}><Input placeholder="Carburant" /></Form.Item>
          <Form.Item name="volumeTotal" rules={[{ required: true, message: 'Volume requis' }]}><InputNumber min={0} precision={3} placeholder="Volume total" /></Form.Item>
          <Form.Item name="stockInitial"><InputNumber min={0} precision={3} placeholder="Stock initial" /></Form.Item>
          <Form.Item name="seuilAlerte"><InputNumber min={0} precision={3} placeholder="Seuil alerte" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createCuve.isPending}>Ajouter une cuve</Button>
        </Form>
        <Table size="small" pagination={false} rowKey="id" dataSource={cuves} columns={[{ title: 'Code', dataIndex: 'code' }, { title: 'Cuve', dataIndex: 'libelle' }, { title: 'Carburant', dataIndex: 'carburant' }, { title: 'Volume', dataIndex: 'volumeTotal', render: number }, { title: 'Stock', dataIndex: 'stockActuel', render: number }]} />
        <Form form={pompeForm} layout="inline" onFinish={savePompe} initialValues={{ active: true }}>
          <Form.Item name="code" rules={[{ required: true, message: 'Code requis' }]}><Input placeholder="Code pompe" /></Form.Item>
          <Form.Item name="libelle" rules={[{ required: true, message: 'Libellé requis' }]}><Input placeholder="Nom de la pompe" /></Form.Item>
          <Form.Item name="cuveId" rules={[{ required: true, message: 'Cuve requise' }]}><Select placeholder="Cuve" style={{ width: 180 }} options={cuves.map((cuve) => ({ value: cuve.id, label: `${cuve.code} · ${cuve.libelle}` }))} /></Form.Item>
          <Form.Item name="prixVente" rules={[{ required: true, message: 'Prix requis' }]}><InputNumber min={0} precision={3} placeholder="Prix de vente" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createPompe.isPending}>Ajouter une pompe</Button>
        </Form>
        <Table size="small" pagination={false} rowKey="id" dataSource={pompes} columns={[{ title: 'Code', dataIndex: 'code' }, { title: 'Pompe', dataIndex: 'libelle' }, { title: 'Cuve', dataIndex: ['cuve', 'libelle'] }, { title: 'Prix', dataIndex: 'prixVente', render: number }]} />
      </Space>
    </Card>

    <Card title="Compteurs"><Descriptions bordered items={Object.entries(compteur ?? {}).filter(([key]) => key.startsWith('last')).map(([key, value]) => ({ key, label: key, children: String(value) }))} /></Card>
  </section>;
}
