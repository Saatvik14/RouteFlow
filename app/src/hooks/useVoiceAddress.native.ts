import { useState, useEffect, useRef } from 'react';

export function useVoiceAddress() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const speechModuleRef = useRef<any>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Load module on mount dynamically to avoid crash if native module is not built/available
  useEffect(() => {
    let active = true;
    async function loadModule() {
      try {
        const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
        if (active) {
          speechModuleRef.current = ExpoSpeechRecognitionModule;
        }
      } catch (err) {
        console.warn('ExpoSpeechRecognition is not available:', err);
      }
    }
    loadModule();
    return () => {
      active = false;
      subscriptionsRef.current.forEach(sub => {
        try {
          sub?.remove?.();
        } catch (e) {
          // ignore
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  const startListening = async () => {
    try {
      setTranscript('');
      setError(null);

      let SpeechModule = speechModuleRef.current;
      if (!SpeechModule) {
        try {
          const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
          SpeechModule = ExpoSpeechRecognitionModule;
          speechModuleRef.current = SpeechModule;
        } catch (err) {
          throw new Error('Speech recognition not available on this build.');
        }
      }

      if (!SpeechModule) {
        throw new Error('Speech recognition module not loaded.');
      }

      const permission = await SpeechModule.requestPermissionsAsync();
      if (!permission?.granted) {
        throw new Error('Microphone permission is required for voice address.');
      }

      // Clean up previous listeners
      subscriptionsRef.current.forEach(sub => {
        try {
          sub?.remove?.();
        } catch (e) {
          // ignore
        }
      });
      subscriptionsRef.current = [];

      setIsListening(true);

      const startSub = SpeechModule.addListener('start', () => {
        setIsListening(true);
      });

      const endSub = SpeechModule.addListener('end', () => {
        setIsListening(false);
        subscriptionsRef.current.forEach(sub => {
          try {
            sub?.remove?.();
          } catch (e) {
            // ignore
          }
        });
        subscriptionsRef.current = [];
      });

      const resultSub = SpeechModule.addListener('result', (event: any) => {
        const text =
          event?.results?.[0]?.transcript ||
          event?.results?.[0]?.alternatives?.[0]?.transcript ||
          event?.transcript ||
          '';
        setTranscript(text);
      });

      const errorSub = SpeechModule.addListener('error', (event: any) => {
        setError(event?.message || event?.error || 'Speech recognition error');
        setIsListening(false);
      });

      subscriptionsRef.current = [startSub, endSub, resultSub, errorSub];

      SpeechModule.start({
        lang: 'en-IN',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to start speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      if (speechModuleRef.current) {
        speechModuleRef.current.stop();
      }
    } catch (e) {
      // ignore
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
}