import { useState } from 'react';
import axios from 'axios';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../lib/auth';

export function Login() {
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const submit = async (values: { username: string; password: string }) => { try { setError(''); await login(values.username, values.password); navigate((location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/', { replace: true }); } catch (error) { setError(axios.isAxiosError(error) && !error.response ? 'API indisponible. Vérifiez que le serveur écoute sur le port 4000.' : 'Nom utilisateur ou mot de passe incorrect.'); } };
  return <main className="login-page"><Card className="login-card" bordered={false}><div className="login-kicker">STATION / OS</div><Typography.Title level={1}>Bon retour.</Typography.Title><Typography.Paragraph type="secondary">Connectez-vous pour piloter votre station.</Typography.Paragraph>{error && <Alert message={error} type="error" showIcon /> }<Form layout="vertical" onFinish={submit} className="login-form"><Form.Item label="Nom utilisateur" name="username" rules={[{ required: true, message: 'Saisissez votre nom utilisateur.' }]}><Input prefix={<UserOutlined />} size="large" /></Form.Item><Form.Item label="Mot de passe" name="password" rules={[{ required: true, message: 'Saisissez votre mot de passe.' }]}><Input.Password prefix={<LockOutlined />} size="large" /></Form.Item><Button type="primary" htmlType="submit" size="large" block>Ouvrir la session</Button></Form></Card></main>;
}
