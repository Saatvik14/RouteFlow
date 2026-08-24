// The installed Expo package publishes platform source files whose web shim omits
// native File methods. Keep the runtime import static for Metro while describing
// only the cross-platform surface used by RouteFloww.
type ExpoFileInstance = {
  uri: string;
  write(content: string | Uint8Array): void;
};

type ExpoFileSystemSurface = {
  File: new (...uris: any[]) => ExpoFileInstance;
  Paths: {
    cache: any;
    document: any;
  };
};

export const ExpoFileSystem = require('expo-file-system') as ExpoFileSystemSurface;
