import { Alert, Linking } from 'react-native';

export const openExternalUrl = async (url: string): Promise<void> => {
  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        'Unable to open link',
        'This link could not be opened on your device.',
      );
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open external URL:', error);

    Alert.alert(
      'Something went wrong',
      'Please try opening the link again.',
    );
  }
};