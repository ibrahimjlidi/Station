import { Navigate } from 'react-router-dom';

export function ClotureCaisse() {
  return <Navigate to="/carburant/releves?mode=close" replace />;
}
