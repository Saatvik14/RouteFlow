import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { ExpoFileSystem } from '../../utils/expoFileSystem';
import {
  APIError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPostMultipart,
  getApiErrorMessage,
  getAuthToken,
} from './client';

export type OrganizationRole = 'owner' | 'admin' | 'dispatcher' | 'driver' | 'viewer';
export type RouteState = 'draft' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type StopState = 'pending' | 'arrived' | 'delivered' | 'failed' | 'skipped' | 'reschedule_required';

export interface DriverPermissions {
  reorderStops: boolean;
  skipStops: boolean;
  addStops: boolean;
  editStopDetails: boolean;
  requestRouteChange: boolean;
}

export interface Invitation {
  invitationId: number;
  name: string;
  email: string;
  role: OrganizationRole;
  status: 'pending' | 'accepted' | 'expired' | 'revoked' | 'resent';
  expiresAt: string;
  acceptedAt?: string | null;
  emailDeliveryStatus: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

export interface DriverProfile {
  driverId: number;
  membershipId: number | null;
  accountUserId: number | null;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  membershipStatus: 'active' | 'inactive' | 'removed';
  permissions: DriverPermissions;
  currentAssignment: null | {
    routeId: number;
    name: string;
    status: RouteState;
    plannedStart: string;
  };
  routeHistoryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  membershipId: number;
  userId: number;
  name: string;
  email: string;
  phone?: string | null;
  role: Exclude<OrganizationRole, 'driver'>;
  status: 'active' | 'inactive' | 'removed';
  joinedAt: string;
}

export interface DashboardRoute {
  routeId: number;
  name: string;
  status: RouteState;
  assignmentVersion: number;
  driver: { id: number; name: string; active: boolean } | null;
  totalStops: number;
  completedStops: number;
  deliveredStops: number;
  failedStops: number;
  remainingStops: number;
  currentStop: { orderId: number; sequence: number; name: string; address: string; status: StopState } | null;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  estimatedCompletion?: string | null;
  delayed: boolean;
  lastLocation: null | {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    deviceRecordedAt: string | null;
    receivedAt: string;
    stale: boolean;
  };
  locationState: 'current' | 'stale' | 'unavailable';
}

export interface DriverAssignment {
  routeId: number;
  name: string;
  status: RouteState;
  assignmentVersion: number;
  plannedStart: string;
  plannedEnd: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  startAddress: string;
  endAddress: string;
  distance: number | null;
  estimatedDurationSeconds: number | null;
  totalStops: number;
  completedStops: number;
  failedStops: number;
  permissions: DriverPermissions & { routePolicy?: Record<string, boolean> };
}

const query = (values: Record<string, string | number | undefined | null>) => {
  const params = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length ? `?${params.join('&')}` : '';
};

const fetchProtectedFile = async (endpoint: string) => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new APIError(response.status, getApiErrorMessage(data, 'Download failed'), data);
  }
  return response;
};

export const enterpriseService = {
  getContext: () => apiGet<any>(API_ENDPOINTS.ENTERPRISE.CONTEXT),
  getDashboard: (filters: { date?: string; driverId?: number; status?: string; search?: string } = {}) =>
    apiGet<{ summary: any; alerts: any[]; routes: DashboardRoute[]; generatedAt: string }>(
      `${API_ENDPOINTS.ENTERPRISE.DASHBOARD}${query(filters)}`,
    ),
  getTeam: (filters: { search?: string; status?: string } = {}) =>
    apiGet<{ drivers: DriverProfile[]; members: TeamMember[] }>(`${API_ENDPOINTS.ENTERPRISE.TEAM}${query(filters)}`),
  getInvitations: () => apiGet<{ invitations: Invitation[] }>(API_ENDPOINTS.ENTERPRISE.INVITATIONS),
  invite: (data: { name: string; email: string; role: OrganizationRole }) =>
    apiPost<{ invitation: Invitation }>(API_ENDPOINTS.ENTERPRISE.INVITATIONS, data),
  resendInvitation: (id: number) => apiPost(API_ENDPOINTS.ENTERPRISE.INVITATION_RESEND(id)),
  revokeInvitation: (id: number) => apiPost(API_ENDPOINTS.ENTERPRISE.INVITATION_REVOKE(id)),
  previewInvitation: (token: string) => apiGet<any>(API_ENDPOINTS.ENTERPRISE.INVITATION_PREVIEW(token)),
  acceptInvitationNew: (token: string, data: { password: string; phone?: string }) =>
    apiPost<any>(API_ENDPOINTS.ENTERPRISE.INVITATION_ACCEPT_NEW(token), data),
  acceptInvitationExisting: (token: string) => apiPost<any>(API_ENDPOINTS.ENTERPRISE.INVITATION_ACCEPT_EXISTING(token)),
  updateDriver: (id: number, data: { active?: boolean; name?: string; phone?: string; permissions?: Partial<DriverPermissions> }) =>
    apiPatch<{ driver: DriverProfile }>(API_ENDPOINTS.ENTERPRISE.DRIVER(id), data),
  removeDriver: (id: number) => apiDelete(API_ENDPOINTS.ENTERPRISE.DRIVER(id)),
  getDriverHistory: (id: number) => apiGet<any>(API_ENDPOINTS.ENTERPRISE.DRIVER_HISTORY(id)),
  getMyAssignments: () => apiGet<{ routes: DriverAssignment[] }>(API_ENDPOINTS.ENTERPRISE.MY_ASSIGNMENTS),
  assignRoute: (routeId: number, driverId: number, expectedVersion?: number) =>
    apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_ASSIGN(routeId), { driverId, expectedVersion }),
  acceptRoute: (routeId: number) => apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_ACCEPT(routeId)),
  rejectRoute: (routeId: number, reason?: string) => apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_REJECT(routeId), { reason }),
  startRoute: (routeId: number) => apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_START(routeId)),
  completeRoute: (routeId: number) => apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_COMPLETE(routeId)),
  cancelRoute: (routeId: number, reason?: string) => apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_CANCEL(routeId), { reason }),
  getRouteDetail: (routeId: number) => apiGet<any>(API_ENDPOINTS.ENTERPRISE.ROUTE_DETAIL(routeId)),
  getRouteProgress: (routeId: number) => apiGet<any>(API_ENDPOINTS.ENTERPRISE.ROUTE_PROGRESS(routeId)),
  arriveAtStop: (stopId: number) => apiPost(API_ENDPOINTS.ENTERPRISE.STOP_ARRIVE(stopId)),
  completeStop: (stopId: number, form: FormData) => apiPostMultipart<any>(API_ENDPOINTS.ENTERPRISE.STOP_COMPLETE(stopId), form),
  updateLocation: (routeId: number, location: any) => apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_LOCATION(routeId), location),
  requestRouteChange: (routeId: number, data: { requestType: string; details: string }) =>
    apiPost(API_ENDPOINTS.ENTERPRISE.ROUTE_CHANGE_REQUEST(routeId), data),
  getReport: (filters: { from?: string; to?: string; driverId?: number; routeId?: number }) =>
    apiGet<any>(`${API_ENDPOINTS.ENTERPRISE.REPORT}${query(filters)}`),
  proofUrl: (proofId: number) => `${API_BASE_URL}${API_ENDPOINTS.ENTERPRISE.PROOF_CONTENT(proofId)}`,
  downloadReport: async (filters: { from?: string; to?: string; driverId?: number; routeId?: number }) => {
    const endpoint = `${API_ENDPOINTS.ENTERPRISE.REPORT_CSV}${query(filters)}`;
    const response = await fetchProtectedFile(endpoint);
    const filename = `routefloww-report-${filters.from || 'today'}-to-${filters.to || filters.from || 'today'}.csv`;
    if (Platform.OS === 'web') {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    const text = await response.text();
    const file = new ExpoFileSystem.File(ExpoFileSystem.Paths.cache, filename);
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export delivery report' });
  },
};
