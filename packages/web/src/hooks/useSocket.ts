import { useEffect } from 'react';
import { notification } from 'antd';
import { useAuthStore } from '../lib/auth';
import { connectSocket, disconnectSocket, socket } from '../lib/socket';
import { SOCKET_EVENTS } from '../lib/socket-events';

export function useSocket() {
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    if (token) connectSocket(token);
    else disconnectSocket();
    return () => disconnectSocket();
  }, [token]);

  useEffect(() => {
    const onLowStock = (payload: { type: string; nom: string; stockActuel: number; pourcentage?: number }) => {
      notification.warning({ message: `Stock bas: ${payload.nom}`, description: `${payload.stockActuel} ${payload.pourcentage == null ? '' : `(${payload.pourcentage.toFixed(1)}%)`}`, placement: 'topRight', duration: 8 });
    };
    const onGaugeGap = (payload: { libelle: string; stockTheorique: number; stockPhysique: number; ecart: number }) => {
      notification.error({ message: `Ecart de jaugeage: ${payload.libelle}`, description: `Theorique ${payload.stockTheorique} L, physique ${payload.stockPhysique} L, ecart ${payload.ecart} L`, placement: 'topRight', duration: 8 });
    };
    const onUnpaid = (payload: { nomClient: string; montant: number; echeance: string | null }) => {
      notification.warning({ message: `Impayé: ${payload.nomClient}`, description: `${payload.montant.toFixed(3)} TND${payload.echeance ? `, échéance ${payload.echeance}` : ''}`, placement: 'topRight', duration: 8 });
    };
    socket.on(SOCKET_EVENTS.ALERT_STOCK_BAS, onLowStock);
    socket.on(SOCKET_EVENTS.ALERT_ECART_JAUGEAGE, onGaugeGap);
    socket.on(SOCKET_EVENTS.ALERT_IMPAYE, onUnpaid);
    return () => {
      socket.off(SOCKET_EVENTS.ALERT_STOCK_BAS, onLowStock);
      socket.off(SOCKET_EVENTS.ALERT_ECART_JAUGEAGE, onGaugeGap);
      socket.off(SOCKET_EVENTS.ALERT_IMPAYE, onUnpaid);
    };
  }, []);
}
