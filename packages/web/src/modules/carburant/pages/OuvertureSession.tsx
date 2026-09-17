import { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Alert, Button, Card, Checkbox, DatePicker, Form, InputNumber, Select, Space, Steps, Table, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/axios';
import { useCaisses, useEquipes, useOuvrirSession, useVendeurs, type SessionSuggestion } from '../hooks/useCarburant';

interface Identification { date: Dayjs; equipeId: number; caisseId: number; vendeurId: number; }

export function OuvertureSession() {
  const [step, setStep] = useState(0);
  const [identification, setIdentification] = useState<Identification>();
  const [suggestion, setSuggestion] = useState<SessionSuggestion>();
  const [selectedPompes, setSelectedPompes] = useState<number[]>([]);
  const [indexes, setIndexes] = useState<Record<number, number>>({});
  const [levels, setLevels] = useState<Record<number, number>>({});
  const [fund, setFund] = useState(200);
  const [messageApi, holder] = message.useMessage();
  const navigate = useNavigate();
  const [form] = Form.useForm<Identification>();
  const { data: equipes = [] } = useEquipes();
  const { data: caisses = [] } = useCaisses();
  const { data: vendeurs = [] } = useVendeurs();
  const opening = useOuvrirSession();

  const options = (items: Array<{ id: number; code?: string; libelle?: string; nom?: string }>) => items.map((item) => ({ value: item.id, label: item.nom ?? `${item.code ?? ''}${item.code ? ' · ' : ''}${item.libelle ?? ''}` }));
  const selectedSuggestions = suggestion?.pompes.filter((pump) => selectedPompes.includes(pump.pompeId)) ?? [];

  const next = async () => {
    if (step === 0) {
      const values = await form.validateFields();
      setIdentification(values);
      const caisse = caisses.find((item) => item.id === values.caisseId);
      if (caisse?.type !== 'PISTE') { messageApi.error('Sélectionnez une caisse PISTE.'); return; }
      const result = await api.get<SessionSuggestion>('/carburant/session/suggested-opening', { params: { date: values.date.format('YYYY-MM-DD'), equipeId: values.equipeId, caisseId: values.caisseId } });
      setSuggestion(result.data);
      if (result.data.hasOpenSession) return;
      setSelectedPompes(result.data.pompes.map((pump) => pump.pompeId));
      setIndexes(Object.fromEntries(result.data.pompes.map((pump) => [pump.pompeId, pump.indexOuvertureSuggere])));
      setLevels(Object.fromEntries(result.data.cuves.map((tank) => [tank.cuveId, tank.stockTheorique])));
      setFund(result.data.soldePrecedent || 200);
      setStep(1);
      return;
    }
    if (step === 1 && selectedPompes.length === 0) { messageApi.warning('Sélectionnez au moins une pompe active pour cette session.'); return; }
    if (step === 1 && selectedPompes.some((pumpId) => indexes[pumpId] == null || indexes[pumpId] < 0)) { messageApi.warning('Saisissez tous les index des pompes actives.'); return; }
    if (step === 2 && Object.values(levels).some((value) => value == null || value < 0)) { messageApi.warning('Saisissez tous les jaugeages d’ouverture.'); return; }
    setStep((value) => Math.min(4, value + 1));
  };

  const submit = async () => {
    if (!identification || !suggestion) return;
    try {
      const selectedTankIds = new Set(selectedSuggestions.map((pump) => pump.cuveId));
      const selectedTanks = suggestion.cuves.filter((tank) => selectedTankIds.has(tank.cuveId));
      const result = await opening.mutateAsync({ date: identification.date.format('YYYY-MM-DD'), equipeId: identification.equipeId, caisseId: identification.caisseId, vendeurId: identification.vendeurId, fondsCaisseOuverture: fund, pompes: selectedSuggestions.map((pump) => ({ pompeId: pump.pompeId, indexOuverture: indexes[pump.pompeId] })), jaugeagesOuverture: selectedTanks.map((tank) => ({ cuveId: tank.cuveId, stockPhysique: levels[tank.cuveId] })) });
      if (result.data.warningsJaugeage?.length) messageApi.warning('Session ouverte avec des avertissements de jaugeage.');
      navigate(`/caisse/saisie?date=${identification.date.format('YYYY-MM-DD')}&equipeId=${identification.equipeId}&caisseId=${identification.caisseId}`);
    } catch (error: any) { messageApi.error(error.response?.data?.message ?? 'Impossible d’ouvrir la session.'); }
  };

  return <section className="page-section">{holder}<div className="page-heading"><div><Typography.Text className="eyebrow">CARBURANT / SESSION</Typography.Text><Typography.Title level={2}>Ouverture de session</Typography.Title></div><Typography.Text type="secondary">Les valeurs précédentes restent à confirmer par le caissier.</Typography.Text></div><Steps current={step} items={[{ title: 'Identification' }, { title: 'Pompes actives' }, { title: 'Jaugeages' }, { title: 'Fonds de caisse' }, { title: 'Confirmation' }]} />{step === 0 && <Card className="form-card" title="Identifier la session"><Form form={form} layout="vertical" initialValues={{ date: dayjs() }}><Form.Item label="Date" name="date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item label="Équipe" name="equipeId" rules={[{ required: true }]}><Select options={options(equipes)} /></Form.Item><Form.Item label="Caisse" name="caisseId" rules={[{ required: true }]}><Select options={options(caisses)} /></Form.Item><Form.Item label="Vendeur" name="vendeurId" rules={[{ required: true }]}><Select options={options(vendeurs)} /></Form.Item></Form>{suggestion?.hasOpenSession && <Alert type="error" showIcon message={`La session ${suggestion.openSessionEquipe} est encore ouverte. Contactez le gérant.`} />}</Card>}{step === 1 && suggestion && <Card title="Pompes actives dans cette session"><Typography.Paragraph type="secondary">Décochez une pompe si elle est arrêtée ou indisponible. Elle ne sera pas calculée à la fermeture.</Typography.Paragraph><Table rowKey="pompeId" pagination={false} dataSource={suggestion.pompes} columns={[{ title: 'Active', render: (_: unknown, pump: SessionSuggestion['pompes'][number]) => <Checkbox checked={selectedPompes.includes(pump.pompeId)} onChange={(event) => setSelectedPompes((current) => event.target.checked ? [...current, pump.pompeId] : current.filter((id) => id !== pump.pompeId))} /> }, { title: 'Pompe', dataIndex: 'libelle' }, { title: 'Cuve', dataIndex: 'cuveLibelle' }, { title: 'Suggestion', dataIndex: 'indexOuvertureSuggere', render: (value: number) => `${value.toFixed(3)} L` }, { title: 'Index confirmé', render: (_: unknown, pump: SessionSuggestion['pompes'][number]) => <InputNumber disabled={!selectedPompes.includes(pump.pompeId)} min={0} precision={3} value={indexes[pump.pompeId]} onChange={(value) => setIndexes((current) => ({ ...current, [pump.pompeId]: value ?? 0 }))} /> }]} /></Card>}{step === 2 && suggestion && <Card title="Jaugeages d’ouverture">{suggestion.cuves.map((tank) => { const gap = (levels[tank.cuveId] ?? 0) - tank.stockTheorique; return <Card type="inner" key={tank.cuveId} title={<Space>{tank.libelle}<Tag>{tank.stockTheorique.toFixed(3)} L théorique</Tag></Space>}><InputNumber min={0} precision={3} value={levels[tank.cuveId]} onChange={(value) => setLevels((current) => ({ ...current, [tank.cuveId]: value ?? 0 }))} /> <Typography.Text type={Math.abs(gap) > 500 ? 'danger' : Math.abs(gap) > 100 ? 'warning' : 'success'}> Écart: {gap.toFixed(3)} L</Typography.Text></Card>; })}</Card>}{step === 3 && <Card title="Fonds de caisse"><Typography.Paragraph>Solde laissé par l’équipe précédente: {suggestion?.soldePrecedent.toFixed(3) ?? '0.000'} TND</Typography.Paragraph><InputNumber min={0} precision={3} value={fund} onChange={(value) => setFund(value ?? 0)} addonAfter="TND" /></Card>}{step === 4 && <Card title="Confirmation"><Table pagination={false} dataSource={selectedSuggestions.map((pump) => ({ key: pump.pompeId, label: pump.libelle, value: `${indexes[pump.pompeId].toFixed(3)} L` }))} columns={[{ title: 'Pompe active', dataIndex: 'label' }, { title: 'Index', dataIndex: 'value' }]} /></Card>}<Space className="session-actions"><Button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Précédent</Button>{step < 4 ? <Button type="primary" onClick={() => void next()}>Suivant</Button> : <Button type="primary" onClick={() => void submit()} loading={opening.isPending}>Ouvrir la session</Button>}</Space></section>;
}
