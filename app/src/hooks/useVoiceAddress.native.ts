import { useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

type PromiseHandlers = {
  resolve: (value: string) => void;
  reject: (reason?: any) => void;
};

const SpeechModule = ExpoSpeechRecognitionModule as any;

export function useVoiceAddress() {
  const promiseRef = useRef<PromiseHandlers | null>(null);
  const finalTextRef = useRef('');

  const cleanup = () => {
    promiseRef.current = null;
    finalTextRef.current = '';
  };

  useSpeechRecognitionEvent('result', event => {
    const text = event.results?.[0]?.transcript || '';

    if (text) {
      finalTextRef.current = text;
    }

    if (event.isFinal && promiseRef.current) {
      const finalText = finalTextRef.current.trim();

      if (finalText) {
        promiseRef.current.resolve(finalText);
      } else {
        promiseRef.current.reject(new Error('No voice input detected.'));
      }

      cleanup();
    }
  });

  useSpeechRecognitionEvent('error', event => {
    if (!promiseRef.current) return;

    promiseRef.current.reject(
      new Error(event.message || 'Could not read voice address.')
    );

    cleanup();
  });

  useSpeechRecognitionEvent('end', () => {
    if (!promiseRef.current) return;

    const finalText = finalTextRef.current.trim();

    if (finalText) {
      promiseRef.current.resolve(finalText);
    } else {
      promiseRef.current.reject(new Error('No voice input detected.'));
    }

    cleanup();
  });

  const startListening = async (): Promise<string> => {
    const permission = await SpeechModule.requestPermissionsAsync();

    if (!permission?.granted) {
      throw new Error('Microphone permission is required for voice address.');
    }

    return new Promise((resolve, reject) => {
      promiseRef.current = { resolve, reject };
      finalTextRef.current = '';

      SpeechModule.start({
        lang: 'en-IN',
        interimResults: false,
        continuous: false,
        maxAlternatives: 1,
      });
    });
  };

  return { startListening };
}