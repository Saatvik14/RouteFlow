import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Platform } from 'react-native';
import { routesService } from '../services/api/routes';

type CameraScannerProps = {
  onTextRecognized: (text: string) => void;
  onClose: () => void;
};

export function CameraScanner({ onTextRecognized, onClose }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [recognizedText, setRecognizedText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F76F6" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#121214' }]}>
        <Text style={styles.errorTitle}>Camera Permission Required</Text>
        <Text style={styles.errorSubtitle}>We need your permission to access the camera and scan address labels.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onClose}>
          <Text style={styles.secondaryButtonText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const handleCaptureAndScan = async () => {
    if (!cameraRef.current || isScanning) return;

    try {
      setIsScanning(true);
      setError(null);
      setRecognizedText('');

      await new Promise(resolve => setTimeout(resolve, 600));

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
        exif: false,
        shutterSound: false,
        });

      if (!photo?.uri) {
        throw new Error('Failed to capture image');
      }

      // Create FormData
      const formData = new FormData();
      const name = 'address-scan.jpg';
      const type = 'image/jpeg';

      if (Platform.OS === 'web') {
        const blob = await fetch(photo.uri).then((response) => response.blob());
        formData.append('image', new File([blob], name, { type }));
      } else {
        formData.append('image', {
          uri: photo.uri,
          name,
          type,
        } as any);
      }

      // Call API
      const result = await routesService.scanAddressImage(formData);
      
      // Extract address candidates
      const detectedText = result?.candidates?.[0] || result?.ocrText || '';
      
      if (!detectedText || detectedText.trim().length === 0) {
        setError('No address text detected. Please ensure the label is clear and try again.');
      } else {
        setRecognizedText(detectedText);
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err?.message || 'Failed to analyze address. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const useRecognizedText = () => {
    if (recognizedText) {
      onTextRecognized(recognizedText);
      onClose();
    }
  };

  const handleReset = () => {
    setRecognizedText('');
    setError(null);
  };

  return (
    <View style={styles.container}>
      <CameraView
      style={styles.camera}
      facing="back"
      ref={cameraRef}
      autofocus="on"
      >
        {/* Header Overlay */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan Address Label</Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Viewfinder Overlay */}
        {!recognizedText && !isScanning && !error && (
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinderGuide}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.helperText}>Align address inside the frame</Text>
          </View>
        )}

        {/* Loading Overlay */}
        {isScanning && (
          <View style={styles.statusOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#2F76F6" />
              <Text style={styles.statusText}>Analyzing address with OCR...</Text>
            </View>
          </View>
        )}

        {/* Error Overlay */}
        {error && !isScanning && (
          <View style={styles.statusOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorCardTitle}>Scanning Failed</Text>
              <Text style={styles.errorCardText}>{error}</Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.cardSecondaryButton} onPress={handleReset}>
                  <Text style={styles.cardSecondaryButtonText}>Retry</Text>
                </Pressable>
                <Pressable style={styles.cardPrimaryButton} onPress={onClose}>
                  <Text style={styles.cardPrimaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Result Overlay */}
        {recognizedText && !isScanning && (
          <View style={styles.statusOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Recognized Address</Text>
              <Text style={styles.resultText} numberOfLines={4}>
                {recognizedText}
              </Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.cardSecondaryButton} onPress={handleReset}>
                  <Text style={styles.cardSecondaryButtonText}>Scan Again</Text>
                </Pressable>
                <Pressable style={styles.cardPrimaryButton} onPress={useRecognizedText}>
                  <Text style={styles.cardPrimaryButtonText}>Use Address</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Control Bar */}
        {!recognizedText && !isScanning && !error && (
          <View style={styles.bottomBar}>
            <Pressable 
              style={({ pressed }) => [
                styles.captureButtonContainer,
                pressed && { opacity: 0.8 }
              ]} 
              onPress={handleCaptureAndScan}
            >
              <View style={styles.captureButtonOuter}>
                <View style={styles.captureButtonInner} />
              </View>
            </Pressable>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#121214',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 16,
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#2F76F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  viewfinderGuide: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxWidth: 450,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#2F76F6',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 8,
  },
  helperText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    fontWeight: '500',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: '#1E1E22',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F76F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statusText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#1E1E22',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorCardTitle: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorCardText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#1E1E22',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#2F76F6',
  },
  resultLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  resultText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardPrimaryButton: {
    flex: 1,
    backgroundColor: '#2F76F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardPrimaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardSecondaryButtonText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  captureButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2F76F6',
  },
});