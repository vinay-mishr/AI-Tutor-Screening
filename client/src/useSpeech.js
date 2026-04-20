import { useRef, useCallback } from 'react';

export function useTTS() {
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Karen') ||
        v.name.includes('Moira')
      );
      if (preferred) u.voice = preferred;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    });
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}

export function useSpeechRecognition({ onTranscriptChange }) {
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  const init = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      transcriptRef.current += final;
      onTranscriptChange((transcriptRef.current + interim).trim());
    };

    r.onerror = (e) => {
      if (e.error !== 'no-speech') console.warn('SR error:', e.error);
    };

    recognitionRef.current = r;
  }, [onTranscriptChange]);

  const start = useCallback(() => {
    init();
    transcriptRef.current = '';
    onTranscriptChange('');
    try { recognitionRef.current?.start(); } catch (_) {}
  }, [init, onTranscriptChange]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch (_) {}
    const result = transcriptRef.current.trim();
    transcriptRef.current = '';
    return result;
  }, []);

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return { start, stop, isSupported };
}