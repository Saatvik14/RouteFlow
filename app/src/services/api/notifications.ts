import { API_ENDPOINTS } from '../../constants/api';
import { apiGet, apiPatch, apiPost, makeRequest } from './client';

export interface InAppNotification {
  notificationId: number;
  title: string;
  message: string;
  type: string;
  data?: {
    routeId?: number;
    routeName?: string;
    optInDeadline?: string;
    startAddress?: string;
    endAddress?: string;
    plannedStart?: string;
    plannedEnd?: string;
    organizationName?: string;
  };
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  unreadCount: number;
  notifications: InAppNotification[];
}

export const notificationService = {
  getNotifications: () => apiGet<NotificationListResponse>(API_ENDPOINTS.NOTIFICATIONS.LIST),
  markAsRead: (notificationId: number) =>
    apiPatch<{ success: boolean; message: string }>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId)),
  markAllAsRead: () =>
    apiPost<{ success: boolean; message: string }>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),
  registerPushToken: (pushToken: string, platform?: string, deviceId?: string) =>
    apiPost<{ success: boolean; message: string }>(API_ENDPOINTS.NOTIFICATIONS.REGISTER_PUSH_TOKEN, {
      pushToken,
      platform,
      deviceId,
    }),
  unregisterPushToken: (pushToken: string) =>
    makeRequest<{ success: boolean; message: string }>(API_ENDPOINTS.NOTIFICATIONS.UNREGISTER_PUSH_TOKEN, {
      method: 'DELETE',
      body: { pushToken },
    }),
};
