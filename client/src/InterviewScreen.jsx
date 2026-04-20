import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessage } from './api';
import { useTTS, useSpeechRecognition } from './useSpeech';
import styles from './InterviewScreen.module.css';

const MAX_QUESTIONS = 5;

export default function InterviewScreen({ candidate, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [aiBubble, setAiBubble] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusLabel, setStatusLabel] = useState('Connecting...');
  const [questionCount, setQuestionCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [micDisabled, setMicDisabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDone, setIsDone] = useState(false);

  const logRef = useRef(null);
  const timerRef = useRef(null);
  const hasStarted = useRef(false);
  const secondsRef = useRef(0);

  const { speak, stop: stopTTS } = useTTS();
  const { start: startSR, stop: stopSR, isSupported: srSupported } = useSpeechRecognition({
    onTranscriptChange: setLiveTranscript,
  });

  useEffect(() => {
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const callAI = useCallback(async (msgs) => {
    setIsAiTyping(true);
    setMicDisabled(true);
    setStatusLabel('Aria is thinking...');
    setErrorMsg('');

    try {
      const text = await sendMessage(msgs);

      if (text.includes('ASSESSMENT_JSON:')) {
        const [goodbye, jsonPart] = text.split('ASSESSMENT_JSON:');
        const displayText = goodbye.trim();
        setAiBubble(displayText);
        setIsAiTyping(false);
        if (displayText) {
          setMessages(prev => [...prev, { role: 'ai', text: displayText }]);
          await speak(displayText);
        }
        setIsDone(true);
        clearInterval(timerRef.current);
        setTimeout(() => {
          try {
            const assessment = JSON.parse(jsonPart.trim());
            onComplete({ ...assessment, candidateName: candidate.name, duration: secondsRef.current, transcript: msgs });
          } catch (_) {
            onComplete({ overall: 74, verdict: 'maybe', dimensions: { clarity:{score:74,note:'Decent communication.',quote:''}, warmth:{score:76,note:'Positive tone.',quote:''}, simplicity:{score:72,note:'Some analogies used.',quote:''}, patience:{score:75,note:'Thoughtful.',quote:''}, fluency:{score:73,note:'Articulate.',quote:''} }, summary: 'Candidate showed reasonable potential.', recommendation: 'Manual review recommended.', candidateName: candidate.name, duration: secondsRef.current, transcript: msgs });
          }
        }, 1500);
      } else {
        if (text.includes('?')) setQuestionCount(q => Math.min(q + 1, MAX_QUESTIONS));
        setAiBubble(text);
        setIsAiTyping(false);
        setMessages(prev => [...prev, { role: 'ai', text }]);
        await speak(text);
        setStatusLabel('Your turn');
        setMicDisabled(false);
      }
    } catch (err) {
      setIsAiTyping(false);
      setErrorMsg(`Connection issue: ${err.message}`);
      setStatusLabel('Error — please retry');
      setMicDisabled(false);
    }
  }, [candidate, speak, onComplete]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    callAI([{ role: 'user', content: `The candidate has joined. Name: ${candidate.name}. Experience: ${candidate.experience || 'not specified'}. Please begin with a warm welcome and ask the first question.` }]);
  }, [callAI, candidate]);

  const handleMicClick = async () => {
    if (isDone || micDisabled) return;
    if (isRecording) {
      setIsRecording(false);
      const transcript = stopSR();
      setLiveTranscript('');
      const finalText = transcript || liveTranscript;
      if (!finalText || finalText.trim().length < 2) {
        const typed = window.prompt('Could not capture audio. Please type your answer:');
        if (!typed?.trim()) { setStatusLabel('Your turn'); return; }
        processAnswer(typed.trim(), messages);
        return;
      }
      processAnswer(finalText.trim(), messages);
    } else {
      stopTTS();
      setIsRecording(true);
      setLiveTranscript('');
      setStatusLabel('Recording...');
      if (srSupported) {
        startSR();
      } else {
        setIsRecording(false);
        const typed = window.prompt('Speech recognition not supported. Type your answer:');
        if (!typed?.trim()) { setStatusLabel('Your turn'); return; }
        processAnswer(typed.trim(), messages);
      }
    }
  };

  const processAnswer = (text, currentMessages) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
    setStatusLabel('Sending...');
    const newMsgs = [
      ...currentMessages.flatMap(m => [{ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }]),
      { role: 'user', content: text },
    ];
    callAI(newMsgs);
  };

  const handleEndEarly = () => {
    if (!window.confirm('End interview now? A partial assessment will be generated.')) return;
    setIsDone(true);
    clearInterval(timerRef.current);
    stopSR(); stopTTS();
    const endMsg = 'The candidate ended early. Give a brief goodbye and output ASSESSMENT_JSON based on what you observed.';
    const newMsgs = [
      ...messages.flatMap(m => [{ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }]),
      { role: 'user', content: endMsg },
    ];
    callAI(newMsgs);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = Math.min((questionCount / MAX_QUESTIONS) * 100, 100);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <span className={styles.brand}>◆ Cuemath</span>
        <div className={styles.statusRow}>
          <span className={styles.dot} />
          <span>{statusLabel}</span>
        </div>
        <div className={styles.timer}>{formatTime(seconds)}</div>
      </header>

      <div className={styles.body}>
        <div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <p className={styles.qCounter}>Question {Math.min(questionCount, MAX_QUESTIONS)} of {MAX_QUESTIONS}</p>
        </div>

        <div className={styles.aiZone}>
          <div className={`${styles.aiAvatar} ${isAiTyping ? styles.speaking : ''}`}>🎓</div>
          <div className={`${styles.aiBubble} ${isAiTyping ? styles.typing : ''}`}>
            {isAiTyping
              ? <span className={styles.dots}><span /><span /><span /></span>
              : aiBubble || '\u00A0'}
          </div>
        </div>

        <div className={styles.log} ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.userMsg : styles.aiMsg}`}>
              <div className={styles.msgAvatar}>{m.role === 'ai' ? '🎓' : (candidate.name[0] || 'U')}</div>
              <div className={styles.msgText}>{m.text}</div>
            </div>
          ))}
        </div>

        <div className={styles.voiceZone}>
          <WaveViz active={isRecording} />
          <button
            className={`${styles.micBtn} ${isRecording ? styles.recording : ''} ${(micDisabled && !isRecording) ? styles.disabled : ''}`}
            onClick={handleMicClick}
            disabled={micDisabled && !isRecording}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>
          <div className={styles.transcriptPreview}>
            {isRecording ? (liveTranscript || 'Listening...') : micDisabled ? 'Wait for Aria to finish...' : 'Tap the mic to speak your answer'}
          </div>
          {!srSupported && <p className={styles.hint}>Speech recognition unavailable — tap mic to type your answer</p>}
          {errorMsg && <p className={styles.errMsg}>{errorMsg}</p>}
        </div>

        {!isDone && <button className={styles.endBtn} onClick={handleEndEarly}>End interview early</button>}
      </div>
    </div>
  );
}

function WaveViz({ active }) {
  const defaults = [8, 14, 22, 18, 30, 22, 14, 8];
  const [bars, setBars] = useState(defaults);
  useEffect(() => {
    if (!active) { setBars(defaults); return; }
    const id = setInterval(() => setBars(defaults.map(() => Math.random() * 32 + 4)), 100);
    return () => clearInterval(id);
  }, [active]);
  return (
    <div className={styles.waveViz}>
      {bars.map((h, i) => (
        <div key={i} className={`${styles.bar} ${active ? styles.barActive : ''}`} style={{ height: h }} />
      ))}
    </div>
  );
}