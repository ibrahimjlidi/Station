import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { socket } from '../../../lib/socket';

export function LiveIndicator() {
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, []);
  return <div className="live-indicator"><span className={`live-dot${connected ? ' live-dot-connected' : ''}`} />{connected ? <span>En ligne</span> : <><span>Hors ligne</span><Button type="link" size="small" onClick={() => socket.connect()}>Reconnecter</Button></>}</div>;
}
