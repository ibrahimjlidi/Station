import { Button, Card, Space, Typography } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { FermetureSession } from './FermetureSession';
import { OuvertureSession } from './OuvertureSession';
import { StatusSessions } from './StatusSessions';

export function RelevePompes() {
  const [params] = useSearchParams();
  if (params.get('mode') === 'open') return <OuvertureSession />;
  if (params.get('mode') === 'close') return <FermetureSession />;
  if (params.get('mode') === 'status') return <StatusSessions />;
  return <section className="page-section"><div className="page-heading"><div><Typography.Text className="eyebrow">CARBURANT / EXPLOITATION</Typography.Text><Typography.Title level={2}>Sessions d’équipe</Typography.Title></div></div><Card title="Choisir une opération"><Space wrap><Button type="primary"><Link to="/carburant/releves?mode=open">Ouvrir une session</Link></Button><Button><Link to="/carburant/releves?mode=close">Fermer une session</Link></Button><Button><Link to="/carburant/releves?mode=status">État des sessions</Link></Button></Space></Card></section>;
}
