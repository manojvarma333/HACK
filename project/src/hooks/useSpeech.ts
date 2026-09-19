import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Text-to-speech via the Web Speech API (browser provider). Matches the
 * backend TTS abstraction: the backend returns text + a BCP-47 lang hint, the
 * browser speaks it. Degrades gracefully when unsupported.
 */
export function useSpeech() {
  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const lastRef = useRef<{ text: string; lang: string } | null>(null);

  const speak = useCallback(
    (text: string, lang = 'en-IN') => {
      if (!isSupported || !text) return;
      lastRef.current = { text, lang };
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 1;
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang === lang) ??
        voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
      if (match) utter.voice = match;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [isSupported],
  );

  const replay = useCallback(() => {
    if (lastRef.current) speak(lastRef.current.text, lastRef.current.lang);
  }, [speak]);

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [isSupported]);

  useEffect(() => cancel, [cancel]);

  return { isSupported, speaking, speak, replay, cancel };
}
