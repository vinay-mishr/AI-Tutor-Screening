import React, { useState } from 'react';
import styles from './WelcomeScreen.module.css';

export default function WelcomeScreen({ onStart }) {
  const [name, setName] = useState('');
  const [exp, setExp] = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!name.trim()) { setError('Please enter your name to continue.'); return; }
    setError('');
    onStart({ name: name.trim(), experience: exp.trim() });
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.badge}>Cuemath — AI Tutor Screener</span>
      <h1 className={styles.title}>Your interview<br />starts here</h1>
      <p className={styles.sub}>
        A 5-minute conversational screening with our AI interviewer, Aria.
        We're looking for warmth, clarity, and how you connect with students —
        not just credentials.
      </p>

      <div className={styles.infoCards}>
        {[['5', 'Minutes'], ['4–6', 'Questions'], ['Voice', 'Based']].map(([n, l]) => (
          <div className={styles.infoCard} key={l}>
            <span className={styles.infoNum}>{n}</span>
            <span className={styles.infoLbl}>{l}</span>
          </div>
        ))}
      </div>

      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="cname">Your full name</label>
          <input
            id="cname"
            type="text"
            placeholder="e.g. Priya Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            autoComplete="name"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="cexp">Years of tutoring experience</label>
          <input
            id="cexp"
            type="text"
            placeholder="e.g. 2 years, or 'Fresher'"
            value={exp}
            onChange={e => setExp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <button className={styles.startBtn} onClick={handleStart}>
        Begin Interview →
      </button>

      <p className={styles.disclaimer}>
        This conversation will be recorded and assessed by the Cuemath hiring team.
        Microphone access is required. Results are shared within 24 hours.
      </p>
    </div>
  );
}