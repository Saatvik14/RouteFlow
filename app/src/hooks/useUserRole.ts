import { useEffect, useState } from 'react';
import { restoreAuthToken } from '../services/api';
import { jwtDecode } from 'jwt-decode';

export type UserRole = 'INDEPENDENT_DRIVER' | 'FLEET_DRIVER' | 'BUSINESS_OWNER';

type JwtPayload = {
  role?: string;
  user?: {
    role?: string;
  };
};

export const normalizeRole = (rawRole?: string): UserRole => {
  const norm = String(rawRole || '').toUpperCase().trim();
  if (norm === 'FLEET_DRIVER') return 'FLEET_DRIVER';
  if (norm === 'BUSINESS_OWNER') return 'BUSINESS_OWNER';
  return 'INDEPENDENT_DRIVER'; // Default for legacy users or INDEPENDENT_DRIVER
};

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('INDEPENDENT_DRIVER');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadRole = async () => {
      try {
        const token = await restoreAuthToken();
        if (token) {
          const decoded = jwtDecode<JwtPayload>(token);
          const rawRole = decoded?.role || decoded?.user?.role;
          if (isMounted) {
            setRole(normalizeRole(rawRole));
          }
        }
      } catch (err) {
        console.log('Error decoding user role from token:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRole();
  }, []);

  const isIndependentDriver = role === 'INDEPENDENT_DRIVER';
  const isFleetDriver = role === 'FLEET_DRIVER';
  const isBusinessOwner = role === 'BUSINESS_OWNER';

  return {
    role,
    isLoading,
    isIndependentDriver,
    isFleetDriver,
    isBusinessOwner,

    // Feature Flags & Permissions
    canCreateRoute: isIndependentDriver || isBusinessOwner,
    canAddDriver: isBusinessOwner,
    canViewDriverRoutes: isBusinessOwner,
    canNavigateRoute: isIndependentDriver || isFleetDriver,
    canUpdateDeliveryStatus: isIndependentDriver || isFleetDriver,
  };
}
