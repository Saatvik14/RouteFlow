import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../api/notifications';

const PUSH_TOKEN_STORAGE_KEY = 'expo_push_token';
const getProjectId = (): string => {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    'da6e074b-2c2f-405b-9e3e-3468536d474a'
  );
};

// Configure default notification presentation behavior for foreground alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure Android notification channels for high-priority fleet alerts
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('fleet-routes', {
        name: 'Fleet Route Pool Alerts',
        description: 'Instant alerts when your dispatcher posts a new route to the driver pool',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (chanErr) {
      console.warn('[PushNotifications] Channel setup warning:', chanErr);
    }
  }
}

export interface PushDiagnosticResult {
  isSupported: boolean;
  permissionStatus: string;
  projectId: string;
  pushToken: string | null;
  backendRegistered: boolean;
  error?: string;
}

export async function diagnosePushNotificationsAsync(): Promise<PushDiagnosticResult> {
  if (Platform.OS === 'web') {
    return {
      isSupported: false,
      permissionStatus: 'web_unsupported',
      projectId: '',
      pushToken: null,
      backendRegistered: false,
      error: 'Push notifications are only supported on physical iOS and Android mobile devices, not on web browsers.',
    };
  }

  try {
    await setupNotificationChannels();
    const { status: permStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = permStatus;
    if (permStatus !== 'granted') {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = reqStatus;
    }

    if (finalStatus !== 'granted') {
      return {
        isSupported: true,
        permissionStatus: finalStatus,
        projectId: getProjectId(),
        pushToken: null,
        backendRegistered: false,
        error: `Notification permission is "${finalStatus}". Please enable notifications in your phone Settings -> Apps -> RouteFloww.`,
      };
    }

    const projectId = getProjectId();
    let pushToken: string | null = null;
    let tokenError = '';

    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      pushToken = tokenResponse?.data ?? null;
    } catch (tokenErr: any) {
      tokenError = tokenErr?.message || String(tokenErr);
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenResponse?.data ?? null;
      } catch (fallbackErr: any) {
        tokenError = `${tokenError} | Fallback: ${fallbackErr?.message || String(fallbackErr)}`;
      }
    }

    if (!pushToken) {
      return {
        isSupported: true,
        permissionStatus: finalStatus,
        projectId,
        pushToken: null,
        backendRegistered: false,
        error: `Could not generate push token: ${tokenError || 'Unknown error'}. Ensure Google Play Services are active.`,
      };
    }

    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);

    // Register on backend
    const regResponse = await notificationService.registerPushToken(
      pushToken,
      Platform.OS,
      Device.modelName || Device.deviceName || 'mobile'
    ).catch((apiErr: any) => {
      return { success: false, message: apiErr?.message || 'Network error registering push token on backend' };
    });

    return {
      isSupported: true,
      permissionStatus: finalStatus,
      projectId,
      pushToken,
      backendRegistered: Boolean(regResponse?.success),
      error: regResponse?.success ? undefined : (regResponse?.message || 'Failed to save push token to server database.'),
    };
  } catch (err: any) {
    return {
      isSupported: true,
      permissionStatus: 'error',
      projectId: getProjectId(),
      pushToken: null,
      backendRegistered: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Requests notification permissions and registers the Expo Push Token on the backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const result = await diagnosePushNotificationsAsync();
  return result.pushToken;
}

/**
 * Unregisters the push token on logout
 */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (pushToken) {
      await notificationService.unregisterPushToken(pushToken).catch(() => {});
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.error('[PushNotifications] Error unregistering push token:', error);
  }
}

/**
 * Sets up listeners for incoming notifications and user tap interactions
 */
export function setupNotificationListeners(onNavigate?: (screen: string, params?: Record<string, any>) => void) {
  if (Platform.OS === 'web') {
    return () => {};
  }

  // Listener for notifications received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PushNotifications] Notification received foreground:', notification.request.content.title);
  });

  // Listener for user tapping on a notification (from lock screen, background shade, or banner)
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    console.log('[PushNotifications] User tapped notification with data:', data);

    if (data?.screen === 'marketplace' || data?.type === 'fleet_pool_route') {
      onNavigate?.('/marketplace', { routeId: data?.routeId });
    }
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}
