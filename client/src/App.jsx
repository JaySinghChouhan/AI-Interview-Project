import { useEffect, useRef, useState } from 'react';
import './App.css';
import AuthScreen from './AuthScreen.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_KEY = 'interview-agent-history';
const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const roles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'MERN Technology', 'Product Manager', 'Data Analyst', 'UX Designer'];
const levels = ['Entry level', 'Mid-level', 'Senior level'];
const interviewTypes = ['Mixed', 'Technical', 'Behavioral'];

const demoQuestions = [
  { id: 'demo-1', category: 'Introduction', question: 'Tell me about yourself and what brought you to this role.' },
  { id: 'demo-2', category: 'Role experience', question: 'Which project best demonstrates your skills for this position, and what was your contribution?' },
  { id: 'demo-3', category: 'Problem solving', question: 'Describe a challenging problem you solved. How did you approach it?' },
  { id: 'demo-4', category: 'Collaboration', question: 'Tell me about a time you received difficult feedback. What did you do with it?' },
  { id: 'demo-5', category: 'Role fit', question: 'What would you hope to accomplish in your first 90 days in this role?' },
];

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'interviews', label: 'My interviews', icon: 'briefcase' },
  { id: 'progress', label: 'My progress', icon: 'chart' },
];

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m8 14 4-4 4 3 5-7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5" /><path d="M5 17v4h14v-4" /></>,
  };

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.sparkle}
    </svg>
  );
}

function readHistory(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`${STORAGE_KEY}:${userId}`) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn('Could not read saved interview history.', error);
    return [];
  }
}

async function extractResumeText(file) {
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    return file.text();
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Please choose a PDF or plain text resume.');
  }

  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageTexts = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 20); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pageTexts.join('\n').slice(0, 20000);
}

async function requestApi(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    const error = new Error(payload.message || 'The request failed.');
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

async function apiRequest(path, body) {
  return requestApi(path, { method: 'POST', body });
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [authUser, setAuthUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyUserId, setHistoryUserId] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [role, setRole] = useState(roles[0]);
  const [customRole, setCustomRole] = useState('');
  const [level, setLevel] = useState(levels[1]);
  const [interviewType, setInterviewType] = useState(interviewTypes[0]);
  const [resumeText, setResumeText] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [resumeBusy, setResumeBusy] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);
  const activeRole = role === 'Other' ? customRole.trim() : role;

  useEffect(() => {
    let active = true;
    requestApi('/auth/me')
      .then((data) => {
        if (active) {
          setAuthUser(data.user);
          setHistory(readHistory(data.user.id));
          setHistoryUserId(data.user.id);
        }
      })
      .catch((error) => {
        if (active && error.status !== 401) setAuthError(error.message);
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      setAuthUser(null);
      setAuthError('Your session expired. Please sign in again.');
      setHistory([]);
      setHistoryUserId(null);
      setSession(null);
      setShowSetup(false);
      setPage('dashboard');
    }
    window.addEventListener('auth:expired', handleExpiredSession);
    return () => window.removeEventListener('auth:expired', handleExpiredSession);
  }, []);

  useEffect(() => {
    if (!authUser || historyUserId !== authUser.id) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}:${authUser.id}`, JSON.stringify(history));
    } catch (error) {
      console.warn('Could not save interview history.', error);
    }
  }, [authUser, history, historyUserId]);

  async function handleAuthSubmit({ mode, name, email, password }) {
    setAuthBusy(true);
    setAuthError('');
    try {
      const data = await requestApi(`/auth/${mode}`, {
        method: 'POST',
        body: { name, email, password },
      });
      setAuthUser(data.user);
      setHistory(readHistory(data.user.id));
      setHistoryUserId(data.user.id);
      setPage('dashboard');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    setAuthBusy(true);
    setAuthError('');
    try {
      await requestApi('/auth/logout', { method: 'POST' });
      setAuthUser(null);
      setPage('dashboard');
      setSession(null);
      setResult(null);
      setShowSetup(false);
      setNotice('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  useEffect(() => {
    if (!session) return undefined;
    const timer = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  async function handleResumeChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSetupError('');
    if (file.size > MAX_RESUME_SIZE) {
      setSetupError('Resume must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setResumeBusy(true);
    try {
      const text = await extractResumeText(file);
      if (!text.trim()) throw new Error('No readable text was found. Try a text-based PDF or TXT resume.');
      setResumeName(file.name);
      setResumeText(text.slice(0, 20000));
    } catch (error) {
      setSetupError(error.message || 'Could not read this resume.');
      setResumeName('');
      setResumeText('');
    } finally {
      setResumeBusy(false);
      event.target.value = '';
    }
  }

  async function startInterview(event) {
    event.preventDefault();
    if (!activeRole) {
      setSetupError('Enter the role you are preparing for.');
      return;
    }

    setBusy(true);
    setSetupError('');
    setNotice('');
    let questions;
    let mode = 'AI';
    try {
      const data = await apiRequest('/ai/questions', { role: activeRole, level, interviewType, resumeText });
      questions = data.questions;
    } catch (error) {
      mode = 'Demo';
      questions = demoQuestions;
      setNotice(`Demo mode: ${error.message} Your answers will stay in this browser.`);
    }

    const interview = {
      id: `${Date.now()}`,
      role: activeRole,
      level,
      interviewType,
      questions,
      mode,
      currentIndex: 0,
      answers: [],
    };
    setSession(interview);
    setElapsed(0);
    setAnswer('');
    setResult(null);
    setShowSetup(false);
    setPage('session');
    setBusy(false);
  }

  function saveCurrentAnswer() {
    const answers = [...session.answers];
    answers[session.currentIndex] = {
      question: session.questions[session.currentIndex].question,
      answer: answer.trim(),
    };
    return answers;
  }

  function nextQuestion() {
    const answers = saveCurrentAnswer();
    const nextIndex = session.currentIndex + 1;
    setSession({ ...session, answers, currentIndex: nextIndex });
    setAnswer(answers[nextIndex]?.answer || '');
  }

  async function finishInterview() {
    const answers = saveCurrentAnswer();
    setBusy(true);
    let evaluation;
    let evaluationMode = session.mode;

    if (session.mode === 'AI') {
      try {
        const data = await apiRequest('/ai/evaluate', { role: session.role, level: session.level, answers });
        evaluation = data.evaluation;
      } catch (error) {
        evaluationMode = 'Offline estimate';
        setNotice(`AI feedback unavailable: ${error.message} Showing an offline answer-completeness estimate instead.`);
      }
    }

    if (!evaluation) {
      const answered = answers.filter((item) => item?.answer.trim()).length;
      const averageWords = answers.reduce((sum, item) => sum + (item?.answer.trim().split(/\s+/).filter(Boolean).length || 0), 0) / answers.length;
      const score = Math.round(Math.min(78, 35 + (answered / answers.length) * 28 + Math.min(15, averageWords / 8)));
      evaluation = {
        overallScore: score,
        communicationScore: Math.min(75, Math.round(score * 0.9)),
        strengths: ['You completed a structured practice session.', 'You have a useful baseline to build on.'],
        improvements: ['Add specific examples and measurable outcomes to your answers.', 'Practice keeping each response concise and structured.'],
        summary: 'This is an offline practice estimate based on answer completion and length, not an AI evaluation.',
        recommendedPlan: ['Use the STAR structure for experience-based questions.', 'Add one concrete result to each example.'],
      };
    }

    const completed = {
      id: session.id,
      role: session.role,
      level: session.level,
      interviewType: session.interviewType,
      score: evaluation.overallScore,
      mode: evaluationMode,
      date: new Date().toISOString(),
      duration: elapsed,
    };
    setHistory((items) => [completed, ...items].slice(0, 20));
    setResult({ ...evaluation, mode: evaluationMode, role: session.role, duration: elapsed, answers });
    setSession(null);
    setPage('results');
    setBusy(false);
  }

  function resetToDashboard() {
    setPage('dashboard');
    setSession(null);
    setNotice('');
  }

  function downloadReport() {
    if (!result) return;
    const report = [
      `Interview practice report: ${result.role}`,
      `Mode: ${result.mode}`,
      `Overall score: ${result.overallScore}/100`,
      `Communication: ${result.communicationScore}/100`,
      '',
      `Summary: ${result.summary}`,
      '',
      'Strengths:',
      ...result.strengths.map((item) => `- ${item}`),
      '',
      'Areas to improve:',
      ...result.improvements.map((item) => `- ${item}`),
      '',
      'Recommended next steps:',
      ...result.recommendedPlan.map((item) => `- ${item}`),
    ].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    link.download = 'interview-practice-report.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const answeredCount = session?.answers.filter((item) => item?.answer.trim()).length || 0;
  const currentQuestion = session?.questions[session.currentIndex];
  const averageScore = history.length
    ? Math.round(history.reduce((total, item) => total + item.score, 0) / history.length)
    : null;

  if (authChecking) {
    return <div className="auth-loading" role="status"><span aria-hidden="true" /></div>;
  }
  if (!authUser) {
    return <AuthScreen busy={authBusy} error={authError} onSubmit={handleAuthSubmit} onClearError={() => setAuthError('')} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={resetToDashboard} aria-label="Interviewly dashboard">
          <span className="brand-mark"><Icon name="sparkle" size={20} /></span>
          <span>interviewly<span className="brand-dot">.</span></span>
        </button>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.id === 'interviews' && history.length > 0 && <span className="nav-count">{history.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="credits-card">
            <div className="credits-icon"><Icon name="sparkle" size={16} /></div>
            <strong>Practice at your pace</strong>
            <p>Your practice history is saved on this device.</p>
            <button className="credits-button" onClick={() => setShowSetup(true)}>Start an interview <Icon name="arrow" size={15} /></button>
          </div>
          <div className="guest-profile">
            <div className="avatar">{authUser.name.charAt(0).toUpperCase()}</div>
            <div><strong>{authUser.name}</strong><span>{authUser.email}</span></div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {page === 'session' && session ? (
          <section className="session-page">
            <header className="session-topbar">
              <button className="back-button" onClick={resetToDashboard}>← <span>Exit practice</span></button>
              <div className="session-role"><span className={`mode-dot ${session.mode.toLowerCase()}`} />{session.mode === 'AI' ? 'AI interview' : 'Practice preview'} <span>·</span> {session.role}</div>
              <div className="session-user-actions"><button type="button" className="logout-button" onClick={handleLogout} disabled={authBusy}>Sign out</button><div className="timer"><Icon name="clock" size={16} /> {formatDuration(elapsed)}</div></div>
            </header>
            {(notice || authError) && <div className="notice-banner"><Icon name="sparkle" size={18} /><span>{notice || authError}</span></div>}
            <div className="session-layout">
              <section className="question-panel">
                <div className="question-progress">
                  <span>QUESTION {session.currentIndex + 1} <span className="muted">/ {session.questions.length}</span></span>
                  <span>{answeredCount} answered</span>
                </div>
                <div className="progress-track"><span style={{ width: `${((session.currentIndex + 1) / session.questions.length) * 100}%` }} /></div>
                <div className="question-category">{currentQuestion?.category || 'Interview question'}</div>
                <h1>{currentQuestion?.question}</h1>
                <p className="question-hint">Take a moment to think. Share a clear example, your actions, and the outcome.</p>
                <label className="answer-label" htmlFor="candidate-answer">YOUR ANSWER</label>
                <textarea id="candidate-answer" className="answer-box" placeholder="Type your answer here. You can use the STAR method: Situation, Task, Action, Result..." value={answer} onChange={(event) => setAnswer(event.target.value)} />
                <div className="answer-footer"><span>{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</span><span>Your answer stays private in this session.</span></div>
                <div className="session-actions">
                  <span>{session.currentIndex + 1} of {session.questions.length} questions</span>
                  {session.currentIndex < session.questions.length - 1 ? (
                    <button className="button button-primary" onClick={nextQuestion}>Next question <Icon name="arrow" size={16} /></button>
                  ) : (
                    <button className="button button-primary" onClick={finishInterview} disabled={busy}>{busy ? 'Preparing feedback…' : 'Finish interview'} <Icon name="check" size={16} /></button>
                  )}
                </div>
              </section>
              <aside className="coach-card">
                <div className="coach-icon"><Icon name="sparkle" size={19} /></div>
                <h3>Quick tip</h3>
                <p>Strong answers are specific. Explain the context, what <em>you</em> did, and what changed because of it.</p>
                <div className="coach-divider" />
                <div className="coach-mini-title">INTERVIEW FORMAT</div>
                <strong>{session.interviewType} · {session.level}</strong>
                <div className="question-list">
                  {session.questions.map((question, index) => (
                    <div className={`question-list-item ${index === session.currentIndex ? 'selected' : ''}`} key={question.id}>
                      <span className="question-number">{session.answers[index]?.answer ? <Icon name="check" size={13} /> : index + 1}</span>
                      <span>{question.category || `Question ${index + 1}`}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>
        ) : page === 'results' && result ? (
          <section className="results-page">
            <div className="results-top"><button className="back-button" onClick={resetToDashboard}>← <span>Back to dashboard</span></button><div className="results-actions"><button type="button" className="logout-button" onClick={handleLogout} disabled={authBusy}>Sign out</button><button className="button button-outline" onClick={downloadReport}><Icon name="download" size={16} /> Download report</button></div></div>
            <div className="results-heading"><div className="result-spark"><Icon name="sparkle" size={22} /></div><div><div className="eyebrow">PRACTICE COMPLETE · {result.mode.toUpperCase()}</div><h1>Your interview debrief</h1><p>{result.role} · {formatDuration(result.duration)} practice session</p></div></div>
            {(notice || authError) && <div className="notice-banner"><Icon name="sparkle" size={18} /><span>{notice || authError}</span></div>}
            <div className="result-score-grid">
              <div className="score-card"><span>Overall score</span><strong>{result.overallScore}<small>/100</small></strong><div className="score-bar"><span style={{ width: `${result.overallScore}%` }} /></div><p>{result.mode === 'AI' ? 'AI-generated assessment' : 'Offline practice estimate'}</p></div>
              <div className="score-card"><span>Communication</span><strong>{result.communicationScore}<small>/100</small></strong><div className="score-bar green"><span style={{ width: `${result.communicationScore}%` }} /></div><p>Clarity and completeness</p></div>
              <div className="score-card answers-score"><span>Questions answered</span><strong>{result.answers.filter((item) => item?.answer.trim()).length}<small>/{result.answers.length}</small></strong><div className="answer-checks"><Icon name="check" size={15} /> Session saved on this device</div></div>
            </div>
            <div className="feedback-grid">
              <section className="feedback-card"><div className="feedback-title"><span className="feedback-icon good"><Icon name="check" size={17} /></span><h2>What went well</h2></div><ul>{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section className="feedback-card"><div className="feedback-title"><span className="feedback-icon improve"><Icon name="chart" size={17} /></span><h2>Opportunities to grow</h2></div><ul>{result.improvements.map((item) => <li key={item}>{item}</li>)}</ul></section>
            </div>
            <section className="summary-card"><div className="feedback-title"><span className="feedback-icon purple"><Icon name="sparkle" size={17} /></span><h2>Coach's summary</h2></div><p>{result.summary}</p><div className="plan-list">{result.recommendedPlan.map((item, index) => <div key={item}><span>{index + 1}</span>{item}</div>)}</div></section>
            <button className="button button-primary results-cta" onClick={() => setShowSetup(true)}>Practice again <Icon name="arrow" size={16} /></button>
          </section>
        ) : (
          <>
            <header className="topbar">
              <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{navItems.find((item) => item.id === page)?.label || 'Dashboard'}</strong></div>
              <div className="topbar-right"><span className="preview-pill"><span /> SIGNED IN</span>{authError && <span className="auth-inline-error" role="alert">{authError}</span>}{notice && <span className="auth-inline-error" role="status">{notice}</span>}<div className="avatar avatar-small">{authUser.name.charAt(0).toUpperCase()}</div><button type="button" className="logout-button" onClick={handleLogout} disabled={authBusy}>Sign out</button></div>
            </header>
            {page === 'dashboard' && (
              <div className="dashboard-page">
                <section className="welcome-row">
                  <div><p className="eyebrow">YOUR PERSONAL INTERVIEW COACH</p><h1>Ready to feel confident?</h1><p className="welcome-copy">Practice the conversation before it matters.</p></div>
                  <button className="button button-primary" onClick={() => setShowSetup(true)}><Icon name="plus" size={17} /> New interview</button>
                </section>
                <section className="hero-card">
                  <div className="hero-copy"><div className="hero-kicker"><Icon name="sparkle" size={15} /> PREP WITH PURPOSE</div><h2>Make your next<br />interview your best.</h2><p>Get role-specific questions, practice at your pace, and leave with feedback you can put to work.</p><button className="button button-light" onClick={() => setShowSetup(true)}>Start practicing <Icon name="arrow" size={16} /></button><div className="hero-safe"><Icon name="check" size={14} /> Your answers stay on this device</div></div>
                  <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-card art-card-back"><span>✦</span></div><div className="art-card art-card-main"><div className="art-avatar">AI</div><div className="art-lines"><i /><i /><i /></div><div className="art-wave"><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /></div><span className="art-label">YOUR NEXT BIG MOVE</span></div><div className="art-bubble">You’ve got this <span>✦</span></div></div>
                </section>
                <section className="stats-grid">
                  <div className="stat-card"><div className="stat-icon purple-bg"><Icon name="briefcase" size={18} /></div><span>Interviews practiced</span><strong>{history.length}</strong><small>Keep building your confidence</small></div>
                  <div className="stat-card"><div className="stat-icon green-bg"><Icon name="chart" size={18} /></div><span>Average score</span><strong>{averageScore === null ? '—' : `${averageScore}%`}</strong><small>{averageScore === null ? 'Your results will show here' : 'Across completed sessions'}</small></div>
                  <div className="stat-card"><div className="stat-icon yellow-bg"><Icon name="clock" size={18} /></div><span>Practice time</span><strong>{formatDuration(history.reduce((total, item) => total + item.duration, 0))}</strong><small>Every minute makes a difference</small></div>
                </section>
                <section className="dashboard-bottom">
                  <div className="recent-section">
                    <div className="section-heading"><div><h2>Recent interviews</h2><p>Your practice, all in one place.</p></div><button className="text-button" onClick={() => setPage('interviews')}>View all <Icon name="arrow" size={15} /></button></div>
                    {history.length ? <InterviewTable history={history.slice(0, 4)} /> : <div className="empty-state"><div className="empty-icon"><Icon name="briefcase" size={21} /></div><strong>Your first practice starts here</strong><p>Choose a role and create a personalized interview session.</p><button className="text-button" onClick={() => setShowSetup(true)}>Set up an interview <Icon name="arrow" size={15} /></button></div>}
                  </div>
                  <aside className="tip-card"><div className="tip-card-top"><span className="tip-icon"><Icon name="sparkle" size={17} /></span><span className="eyebrow">A LITTLE PREP GOES A LONG WAY</span></div><h3>Try the STAR method</h3><p>Structure your stories around the Situation, Task, Action, and Result. It helps interviewers follow your impact.</p><div className="star-row"><span>S</span><span>T</span><span>A</span><span>R</span><i>Situation · Task · Action · Result</i></div></aside>
                </section>
                <div className="demo-footnote"><span className="demo-dot" /> Local preview: AI interviews need an OpenRouter API key in <code>server/.env</code>.</div>
              </div>
            )}
            {page === 'interviews' && (
              <div className="listing-page"><div className="listing-heading"><div><p className="eyebrow">YOUR PRACTICE LIBRARY</p><h1>My interviews</h1><p>Review your completed practice sessions.</p></div><button className="button button-primary" onClick={() => setShowSetup(true)}><Icon name="plus" size={17} /> New interview</button></div>{history.length ? <div className="listing-card"><InterviewTable history={history} /></div> : <div className="listing-empty"><div className="empty-icon"><Icon name="briefcase" size={21} /></div><h2>No interviews yet</h2><p>Your completed sessions will appear here.</p><button className="button button-primary" onClick={() => setShowSetup(true)}>Start your first interview <Icon name="arrow" size={16} /></button></div>}</div>
            )}
            {page === 'progress' && (
              <div className="listing-page"><div className="listing-heading"><div><p className="eyebrow">YOUR GROWTH</p><h1>My progress</h1><p>Small steps add up to confident interviews.</p></div></div><div className="progress-summary"><div className="progress-large"><span>Average practice score</span><strong>{averageScore === null ? '—' : `${averageScore}%`}</strong><p>{history.length ? `From ${history.length} completed ${history.length === 1 ? 'session' : 'sessions'}` : 'Complete a practice session to start tracking your progress.'}</p></div><div className="progress-large"><span>Total practice time</span><strong>{formatDuration(history.reduce((total, item) => total + item.duration, 0))}</strong><p>Time spent preparing in this browser.</p></div></div><div className="progress-note"><Icon name="sparkle" size={18} /><p>Your practice history is saved in this browser and kept separate for your account.</p></div></div>
            )}
          </>
        )}
      </main>

      {showSetup && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowSetup(false); }}>
        <section className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
          <div className="modal-heading"><div><span className="modal-mark"><Icon name="sparkle" size={18} /></span><p className="eyebrow">LET'S GET YOU READY</p><h2 id="setup-title">Set up your interview</h2><p>Tell us what you’re preparing for.</p></div><button className="icon-button" onClick={() => setShowSetup(false)} disabled={busy} aria-label="Close dialog"><Icon name="close" size={19} /></button></div>
          <form onSubmit={startInterview}>
            <label className="field-label" htmlFor="role">Role you’re preparing for</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item}>{item}</option>)}<option>Other</option></select>
            {role === 'Other' && <input className="custom-role" value={customRole} onChange={(event) => setCustomRole(event.target.value)} placeholder="Enter a role" maxLength={120} />}
            <div className="field-grid"><div><label className="field-label" htmlFor="level">Experience level</label><select id="level" value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></div><div><label className="field-label" htmlFor="interview-type">Interview style</label><select id="interview-type" value={interviewType} onChange={(event) => setInterviewType(event.target.value)}>{interviewTypes.map((item) => <option key={item}>{item}</option>)}</select></div></div>
            <label className="field-label">Add your resume <span className="optional-label">OPTIONAL</span></label>
            <input ref={fileInput} className="file-input" type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={handleResumeChange} />
            <button type="button" className={`upload-box ${resumeName ? 'has-file' : ''}`} onClick={() => fileInput.current?.click()} disabled={resumeBusy}>
              <span className="upload-icon"><Icon name={resumeName ? 'file' : 'upload'} size={19} /></span><span className="upload-copy"><strong>{resumeBusy ? 'Reading resume…' : resumeName || 'Choose a PDF or TXT file'}</strong><small>{resumeName ? `${(new TextEncoder().encode(resumeText).length / 1024).toFixed(1)} KB of text extracted` : 'Up to 5 MB · Used to personalize your questions'}</small></span><Icon name="chevron" size={17} />
            </button>
            {setupError && <p className="form-error" role="alert">{setupError}</p>}
            <div className="privacy-note"><Icon name="check" size={15} /><span>Resume text is only sent to the AI provider when AI is configured. Otherwise, practice uses sample questions.</span></div>
            <button className="button button-primary modal-submit" type="submit" disabled={busy || resumeBusy}>{busy ? 'Preparing your interview…' : 'Start interview'} <Icon name="arrow" size={16} /></button>
          </form>
        </section>
      </div>}
    </div>
  );
}

function InterviewTable({ history }) {
  return (
    <div className="table-wrap">
      <table className="interview-table">
        <thead><tr><th>ROLE</th><th>DATE</th><th>DURATION</th><th>MODE</th><th>SCORE</th></tr></thead>
        <tbody>{history.map((item) => <tr key={item.id}><td><span className="table-role-icon"><Icon name="briefcase" size={16} /></span><strong>{item.role}</strong></td><td>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>{formatDuration(item.duration)}</td><td><span className={`table-mode ${item.mode === 'AI' ? 'mode-ai' : ''}`}><span />{item.mode}</span></td><td><strong className="table-score">{item.score}</strong><small>/100</small></td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default App;
