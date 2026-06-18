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
  identifier: string;
  password: string;
}

/**
 * Login response with auth token
 */
export interface LoginResponse {
  accessToken: string;
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
 * Send OTP request
 */
export interface SendOtpRequest {
  email: string;
}

/**
 * Verify OTP request
 */
export interface VerifyOtpRequest {
  email: string;
  otp: string;
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
   * Send OTP to email
   */
  sendOtp: (data: SendOtpRequest) =>
    apiPost(API_ENDPOINTS.AUTH.SEND_OTP, data),

  /**
   * Verify OTP for email
   */
  verifyOtp: (data: VerifyOtpRequest) =>
    apiPost(API_ENDPOINTS.AUTH.VERIFY_OTP, data),

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
