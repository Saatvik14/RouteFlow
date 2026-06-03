/**
 * User API Service
 * Handles all user-related API calls
 */

import { API_ENDPOINTS } from '../../constants/api';
import { apiDelete, apiGet, apiPatch, apiPut } from './client';

/**
 * User profile data
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  avatar?: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  emailNotifications: boolean;
  language: string;
}

/**
 * User Service functions
 */
export const userService = {
  /**
   * Get current user profile
   */
  getProfile: () =>
    apiGet<User>(API_ENDPOINTS.USERS.GET_PROFILE),

  /**
   * Update current user profile
   */
  updateProfile: (data: UpdateProfileRequest) =>
    apiPut<User>(API_ENDPOINTS.USERS.UPDATE_PROFILE, data),

  /**
   * Get user by ID
   */
  getUser: (userId: string) =>
    apiGet<User>(API_ENDPOINTS.USERS.GET_USER(userId)),

  /**
   * Update user by ID (admin only)
   */
  updateUser: (userId: string, data: UpdateProfileRequest) =>
    apiPut<User>(API_ENDPOINTS.USERS.UPDATE_USER(userId), data),

  /**
   * Delete user (admin only)
   */
  deleteUser: (userId: string) =>
    apiDelete(API_ENDPOINTS.USERS.DELETE_USER(userId)),

  /**
   * Get user preferences
   */
  getPreferences: () =>
    apiGet<UserPreferences>(API_ENDPOINTS.USERS.GET_PREFERENCES),

  /**
   * Update user preferences
   */
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    apiPatch<UserPreferences>(API_ENDPOINTS.USERS.UPDATE_PREFERENCES, preferences),
};
