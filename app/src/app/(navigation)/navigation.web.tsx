import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

export default function NavigationMap() {
  const destination = {
    latitude: 28.6139,
    longitude: 77.209,
  };

  const openGoogleMaps = async () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;

    await Linking.openURL(url);
  };

  useEffect(() => {
    openGoogleMaps();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Opening Google Maps</Text>

      <Text style={styles.subtitle}>
        Navigation is opened in Google Maps on web.
      </Text>

      <Pressable style={styles.button} onPress={openGoogleMaps}>
        <Text style={styles.buttonText}>Open Google Maps Again</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 500,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
});