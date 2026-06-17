/**
 * Configuration API Service
 * Handles fetching user-specific configurations from the backend.
 */

import { API_ENDPOINTS } from '../../constants/api';
import { apiGet } from './client';
import { useConfigStore } from './../../store/useConfigStore';

/**
 * Interface for user configuration data.
 * Adjust this interface based on the actual structure of your backend's config response.
 */
/**
 * Configuration API Service
 * Handles fetching user-specific configurations from the backend.
 */


export interface LocationConfig {
  locationId: number;
  name?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UserConfig {
  configId: number;
  userId: number;

  defaultStartAddress: LocationConfig | null;
  defaultEndAddress: LocationConfig | null;

  breakTime: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface FetchConfigResponse {
  success: boolean;
  message: string;
  data: UserConfig;
}

/**
 * Configuration Service functions
 */
export const configService = {
  fetchConfig: () => apiGet<UserConfig>(API_ENDPOINTS.CONFIG.FETCH_CONFIG),
};




export const fetchAndStoreConfig = async () => {
  const { setConfig, setConfigLoading } = useConfigStore.getState();

  try {
    setConfigLoading(true);

    const response = await configService.fetchConfig();

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch config');
    }

    setConfig(response.data);

    return response.data;
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  } finally {
    setConfigLoading(false);
  }
};