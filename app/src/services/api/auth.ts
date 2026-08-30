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
  password?: string;
  accessCode?: string;
}

export type AuthMethod = 'password' | 'access_code';

export interface IdentifyAccountResponse {
  authMethod: AuthMethod;
  role: 'INDEPENDENT_DRIVER' | 'BUSINESS_OWNER' | 'FLEET_DRIVER' | 'PLATFORM_ADMIN';
  roleLabel: string;
}

/**
 * Login response with auth token
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string | null;
    name: string;
    role: string;
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
  company_name?: string;
  address?: string;
  vehicle_type?: 'car' | 'van' | 'truck' | 'motorbike';
  email_verification_token: string;
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

export interface VerifyOtpResponse {
  message: string;
  verificationToken: string;
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
  email: string;
  otp?: string;
  verificationToken?: string;
  newPassword?: string;
  password?: string;
}

/**
 * Auth Service functions
 */
export const authService = {
  /** Resolve the account role and credential type before asking for a secret. */
  identify: (identifier: string) =>
    apiPost<IdentifyAccountResponse>(API_ENDPOINTS.AUTH.IDENTIFY, { identifier }),

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
    apiPost<VerifyOtpResponse>(API_ENDPOINTS.AUTH.VERIFY_OTP, data),

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
