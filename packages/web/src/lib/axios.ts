import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000' });

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('station-auth');
  if (stored) {
    const token = JSON.parse(stored).state?.token as string | undefined;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
