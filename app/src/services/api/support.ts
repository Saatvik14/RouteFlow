import { apiPost } from './client';
import { API_ENDPOINTS } from '../../constants/api';

export const supportService = {
  submit: (payload: { message: string; subject?: string; userEmail?: string; userName?: string }) =>
    apiPost(API_ENDPOINTS.SUPPORT.SUBMIT, payload),
};

export type SupportPayload = { message: string; subject?: string; userEmail?: string; userName?: string };
