import React, { useState } from 'react';
import styles from './ReportScreen.module.css';

const DIM_LABELS = {
  clarity: 'Communication Clarity',
  warmth: 'Warmth & Rapport',
  simplicity: 'Ability to Simplify',
  patience: 'Patience & Empathy',
  fluency: 'English Fluency',
};

const DIM_COLORS = {
  clarity: '#6366F1',
  warmth: '#EC4899',
  simplicity: '#10B981',
  patience: '#F59E0B',
  fluency: '#3B82F6',
};

export default function ReportScreen({ data, onRestart }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const dims = data.dimensions || {};
  const verdict = data.verdict || 'maybe';
  const verdictConfig = {
    pass: { cls: styles.pass, label: '✓ Advance to Next Round' },
    maybe: { cls: styles.maybe, label: '◐ Review Recommended' },
    fail: { cls: styles.fail, label: '✗ Does Not Meet Bar' },
  }[verdict] || { cls: styles.maybe, label: '◐ Review Recommended' };

  const duration = `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`;
  const transcript = (data.transcript || []).filter(m =>
    ['user', 'assistant'].includes(m.role) && m.content && !m.content.includes('has joined')
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.reportHeader}>
        <span className={styles.badge}>Screening Report</span>
        <h1 className={styles.name}>{data.candidateName || 'Candidate'}</h1>
        <p className={styles.meta}>Interview duration: {duration}</p>
        <div className={styles.overallScore}>{data.overall}<span>/100</span></div>
        <div className={`${styles.verdictBadge} ${verdictConfig.cls}`}>{verdictConfig.label}</div>
      </div>

      <p className={styles.sectionTitle}>Assessment by Dimension</p>
      <div className={styles.dimGrid}>
        {Object.entries(dims).map(([key, dim]) => (
          <div className={styles.dimCard} key={key}>
            <p className={styles.dimName}>{DIM_LABELS[key] || key}</p>
            <div className={styles.dimScoreRow}>
              <span className={styles.dimNum}>{dim.score}</span>
              <div className={styles.dimBarTrack}>
                <div className={styles.dimBarFill} style={{ width: `${dim.score}%`, background: DIM_COLORS[key] || '#6366F1' }} />
              </div>
            </div>
            {dim.note && <p className={styles.dimNote}>{dim.note}</p>}
            {dim.quote && <p className={styles.dimQuote}>"{dim.quote}"</p>}
          </div>
        ))}
      </div>

      <p className={styles.sectionTitle}>Interviewer Summary</p>
      <div className={styles.summaryBox}>{data.summary}</div>

      {data.recommendation && (
        <>
          <p className={styles.sectionTitle}>Recommendation</p>
          <div className={`${styles.summaryBox} ${styles.recBox}`}>{data.recommendation}</div>
        </>
      )}

      <div className={styles.transcriptSection}>
        <button className={styles.transcriptToggle} onClick={() => setTranscriptOpen(o => !o)}>
          <span>View Full Transcript</span>
          <span>{transcriptOpen ? '▲' : '▼'}</span>
        </button>
        {transcriptOpen && (
          <div className={styles.transcriptBody}>
            {transcript.map((m, i) => {
              const clean = m.content.replace(/ASSESSMENT_JSON:.*/s, '').trim();
              if (!clean) return null;
              return (
                <div className={styles.tLine} key={i}>
                  <span className={`${styles.tWho} ${m.role === 'assistant' ? styles.tAi : styles.tYou}`}>
                    {m.role === 'assistant' ? 'Aria' : data.candidateName || 'You'}
                  </span>
                  <span>{clean}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className={styles.restartBtn} onClick={onRestart}>Start New Interview ↺</button>
    </div>
  );
}