import { User } from '../types';

const TOKEN_KEY = 'pcea_sunday_school_token';

export function getStoredUserId(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredUserId(id: string | null) {
  if (id) {
    localStorage.setItem(TOKEN_KEY, id);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const userId = getStoredUserId();
  const headers = new Headers(options.headers || {});
  
  if (userId) {
    headers.set('Authorization', `Bearer ${userId}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, data: any) => request<T>(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' })
};
