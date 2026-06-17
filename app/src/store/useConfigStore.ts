import { create } from 'zustand';

import type { UserConfig } from './../services/api/config';

interface ConfigStore {
  config: UserConfig | null;
  isConfigLoading: boolean;
  isConfigLoaded: boolean;

  setConfig: (config: UserConfig | null | undefined) => void;
  setConfigLoading: (value: boolean) => void;
  clearConfig: () => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  isConfigLoading: false,
  isConfigLoaded: false,

  setConfig: (config) =>
    set({
      config,
      isConfigLoaded: true,
    }),

  setConfigLoading: (value) =>
    set({
      isConfigLoading: value,
    }),

  clearConfig: () =>
    set({
      config: null,
      isConfigLoaded: false,
      isConfigLoading: false,
    }),
}));