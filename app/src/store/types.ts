export type LocationConfig = {
  locationId: number;
  name?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type UserConfig = {
  configId: number | null;
  userId: number | null;

  defaultStartAddress: LocationConfig | null;
  defaultEndAddress: LocationConfig | null;

  breakTime: number;

  flags: Record<string, any>;
  details: Record<string, any>;
};

export type AuthUser = {
  userId: number;
  name?: string;
  email?: string;
  phone?: string;
};

export type AppState = {
  user: AuthUser | null;

  config: UserConfig | null;

  isConfigLoaded: boolean;
  isAppLoading: boolean;

  setUser: (user: AuthUser | null) => void;

  setConfig: (config: UserConfig | null) => void;

  setConfigLoaded: (value: boolean) => void;

  setAppLoading: (value: boolean) => void;

  updateConfigField: <K extends keyof UserConfig>(
    key: K,
    value: UserConfig[K]
  ) => void;

  resetAppStore: () => void;
};