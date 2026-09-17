import { Card, Col, Row, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCaisses, useSessionStatus } from '../hooks/useCarburant';

export function StatusSessions() {
  const navigate = useNavigate(); const { data: caisses = [] } = useCaisses(); const caisseId = caisses[0]?.id; const { data } = useSessionStatus(dayjs().format('YYYY-MM-DD'), caisseId);
  const color = (status: string) => status === 'FERME' ? 'blue' : status === 'OUVERT' ? 'green' : 'default';
  return <section className="page-section"><div className="page-heading"><div><Typography.Text className="eyebrow">CARBURANT / SESSIONS</Typography.Text><Typography.Title level={2}>État des sessions</Typography.Title></div></div><Row gutter={[16, 16]}>{(data?.sessions ?? []).map((session) => <Col xs={24} md={8} key={session.equipeId}><Card hoverable onClick={() => navigate(session.statut === 'OUVERT' ? `/caisse/saisie?equipeId=${session.equipeId}&caisseId=${caisseId}` : session.statut === 'NON_OUVERT' ? '/carburant/ouverture' : '/carburant/fermeture')} title={session.equipeLibelle}><Tag color={color(session.statut)}>{session.statut}</Tag><Typography.Paragraph type="secondary">Ouverture: {session.heureOuverture ? new Date(session.heureOuverture).toLocaleTimeString() : '-'}</Typography.Paragraph><Typography.Paragraph type="secondary">Fermeture: {session.heureFermeture ? new Date(session.heureFermeture).toLocaleTimeString() : '-'}</Typography.Paragraph></Card></Col>)}</Row></section>;
}
