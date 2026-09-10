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

/**
 * Requests notification permissions and registers the Expo Push Token on the backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted for push notifications (status=' + finalStatus + ').');
      return null;
    }

    const projectId = getProjectId();
    let pushToken: string | null = null;

    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      pushToken = tokenResponse?.data ?? null;
    } catch (tokenErr: any) {
      console.warn('[PushNotifications] getExpoPushTokenAsync with projectId failed:', tokenErr?.message || tokenErr);
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenResponse?.data ?? null;
      } catch (fallbackErr: any) {
        console.error('[PushNotifications] Fallback token retrieval failed:', fallbackErr?.message || fallbackErr);
      }
    }

    if (pushToken) {
      console.log('[PushNotifications] Successfully obtained Expo Push Token:', pushToken);
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);

      // Register with the backend
      const regResponse = await notificationService.registerPushToken(
        pushToken,
        Platform.OS,
        Device.modelName || Device.deviceName || 'mobile'
      ).catch((apiErr) => {
        console.error('[PushNotifications] Failed registering push token on backend:', apiErr);
        return null;
      });

      if (regResponse?.success) {
        console.log('[PushNotifications] Push token registered on backend successfully.');
      }
    } else {
      console.warn('[PushNotifications] No push token generated.');
    }

    return pushToken;
  } catch (error: any) {
    console.error('[PushNotifications] Error registering for push notifications:', error?.message || error);
    return null;
  }
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
