import { jwtDecode } from 'jwt-decode';

/**
 * JWT Token Payload Interface
 */
export interface JwtPayload {
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Validates if a JWT token is present and not expired
 * @param token - JWT token string
 * @returns boolean indicating if token is valid
 */
export const isTokenValid = (token: string | null): boolean => {
  if (!token) {
    return false;
  }

  try {
    const decoded: JwtPayload = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (decoded.exp < currentTime) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error decoding token:', error);
    return false;
  }
};

/**
 * Gets the expiration time of a JWT token
 * @param token - JWT token string
 * @returns Expiration timestamp or null if invalid
 */
export const getTokenExpiration = (token: string): number | null => {
  try {
    const decoded: JwtPayload = jwtDecode(token);
    return decoded.exp;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};