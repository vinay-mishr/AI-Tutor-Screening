import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import InterviewScreen from './InterviewScreen';
import ReportScreen from './ReportScreen';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [candidate, setCandidate] = useState(null);
  const [assessment, setAssessment] = useState(null);

  const handleStart = (candidateInfo) => {
    setCandidate(candidateInfo);
    setScreen('interview');
  };

  const handleComplete = (assessmentData) => {
    setAssessment(assessmentData);
    setScreen('report');
  };

  const handleRestart = () => {
    setCandidate(null);
    setAssessment(null);
    setScreen('welcome');
  };

  return (
    <>
      {screen === 'welcome' && <WelcomeScreen onStart={handleStart} />}
      {screen === 'interview' && (
        <InterviewScreen candidate={candidate} onComplete={handleComplete} />
      )}
      {screen === 'report' && (
        <ReportScreen data={assessment} onRestart={handleRestart} />
      )}
    </>
  );
}