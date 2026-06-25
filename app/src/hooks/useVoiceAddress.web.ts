export function useVoiceAddress() {
  const startListening = () => {
    return new Promise<string>((resolve, reject) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        reject(new Error('Speech recognition is not supported on this browser'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript || '';
        resolve(text);
      };

      recognition.onerror = () => {
        reject(new Error('Could not read voice address'));
      };

      recognition.start();
    });
  };

  return { startListening };
}