import { API_BASE_URL } from '../lib/config';

export type AuthUser = {
  id: string;
  email?: string;
  hasProfile: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type AccessLinkFlow = 'access' | 'reset';
export type AccessLinkResponse = {
  flow: AccessLinkFlow;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function resetPassword(email: string) {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Reset failed');
  return res.json();
}

export async function requestAccessLink(email: string): Promise<AccessLinkResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/access-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Could not request access link');
  return res.json() as Promise<AccessLinkResponse>;
}

export async function setPasswordWithToken(token: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Could not set password');
  }
  return res.json();
}

export async function changePassword(token: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Could not update password');
  }
  return res.json();
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}
