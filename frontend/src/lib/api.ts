import axios from 'axios';
import { WhatsAppConnectResult, WhatsAppDevice } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export async function getWhatsAppDevices(): Promise<WhatsAppDevice[]> {
  const res = await api.get('/admin/whatsapp/devices');
  return res.data;
}

export async function createWhatsAppDevice(input: { display_name: string; provider?: string }): Promise<WhatsAppDevice> {
  const res = await api.post('/admin/whatsapp/devices', input);
  return res.data;
}

export async function connectWhatsAppDevice(id: number | string): Promise<WhatsAppConnectResult> {
  const res = await api.post(`/admin/whatsapp/devices/${id}/connect`);
  return res.data;
}

export async function disconnectWhatsAppDevice(id: number | string): Promise<WhatsAppConnectResult> {
  const res = await api.post(`/admin/whatsapp/devices/${id}/disconnect`);
  return res.data;
}

export async function restartWhatsAppDevice(id: number | string): Promise<WhatsAppConnectResult> {
  const res = await api.post(`/admin/whatsapp/devices/${id}/restart`);
  return res.data;
}

export async function deleteWhatsAppDevice(id: number | string): Promise<void> {
  await api.delete(`/admin/whatsapp/devices/${id}`);
}
