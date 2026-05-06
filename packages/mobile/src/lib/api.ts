import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from './env';

const API_BASE = API_URL;

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = trimTrailingSlash(API_BASE.replace(/\/api\/v1\/?$/, ''));
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
