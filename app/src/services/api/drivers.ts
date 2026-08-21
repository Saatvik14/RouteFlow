import { API_ENDPOINTS } from '../../constants/api';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

export interface Driver {
  driver_id: number;
  user_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDriverRequest {
  name: string;
  phone?: string;
  email?: string;
}

export interface EditDriverRequest {
  driver_id: number;
  name?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}

export const driversService = {
  /**
   * Get all active drivers for logged-in user
   */
  getDrivers: () =>
    apiGet<Driver[]>(API_ENDPOINTS.DRIVERS.FETCH_ALL),

  /**
   * Create a new driver
   */
  createDriver: (data: CreateDriverRequest) =>
    apiPost<Driver>(API_ENDPOINTS.DRIVERS.CREATE, data),

  /**
   * Edit an existing driver
   */
  editDriver: (data: EditDriverRequest) =>
    apiPut<Driver>(API_ENDPOINTS.DRIVERS.EDIT, data),

  /**
   * Delete a driver
   */
  deleteDriver: (driverId: string | number) =>
    apiDelete(API_ENDPOINTS.DRIVERS.DELETE(String(driverId))),
};
