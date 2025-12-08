import { apiClient } from './client';

export function explainChat(payload: { message: string; context?: string }) {
  return apiClient.post<{ reply: string }>('/agents/explain', payload);
}
