import { API_BASE_URL } from '../lib/config';

export async function fetchProfileMe(token: string) {
  const res = await fetch(`${API_BASE_URL}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateProfile(token: string, body: any) {
  const res = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

export async function fetchProfile(userId: string) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/profile`);
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateProfileById(userId: string, body: any) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// aliases for clarity
export const updateProfileMe = updateProfile;
