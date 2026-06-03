/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import { API_ENDPOINTS } from '../../constants/api';
import { apiPost } from './client';

/**
 * Login credentials
 */
export interface LoginRequest {
  phone_no: string;
  password: string;
}

/**
 * Login response with auth token
 */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

/**
 * Signup data
 */
export interface SignupRequest {
  phone_no: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Auth Service functions
 */
export const authService = {
  /**
   * Login user
   */
  login: (credentials: LoginRequest) =>
    apiPost<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials),

  /**
   * Sign up new user
   */
  signup: (data: SignupRequest) =>
    apiPost<LoginResponse>(API_ENDPOINTS.AUTH.SIGNUP, data),

  /**
   * Logout user
   */
  logout: () =>
    apiPost(API_ENDPOINTS.AUTH.LOGOUT),

  /**
   * Refresh authentication token
   */
  refreshToken: (refreshToken: string) =>
    apiPost<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken }),

  /**
   * Request password reset
   */
  forgotPassword: (data: PasswordResetRequest) =>
    apiPost(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data),

  /**
   * Confirm password reset
   */
  resetPassword: (data: PasswordResetConfirm) =>
    apiPost(API_ENDPOINTS.AUTH.RESET_PASSWORD, data),

  /**
   * Verify email address
   */
  verifyEmail: (token: string) =>
    apiPost(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token }),
};
