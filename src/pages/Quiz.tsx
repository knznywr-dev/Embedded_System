import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Callout,
  Card,
  EmptyState,
  ModuleBadge,
  PageHeader,
  ProgressBar,
  SourceRef,
} from '../components/ui';
import { QUESTIONS } from '../data/questions';
import { MODULES, MODULE_MAP, type ModuleId } from '../data/modules';
import type {
  MatchingQuestion,
  OrderingQuestion,
  Question,
  QuizAttempt,
  QuizConfig,
  QuizScope,
} from '../types';
import {
  buildAttempt,
  evaluateAnswer,
  formatDateTime,
  formatPercent,
  isAnswerProvided,
  questionsForScope,
  sampleQuestions,
  scopeLabel,
  shuffleWithSeed,
  type Evaluation,
  type QuizAnswer,
} from '../lib/quiz';
import { useStudyData } from '../state/StudyDataContext';

type Phase = 'setup' | 'running' | 'results';

interface SessionState {
  questions: Question[];
  answers: Map<string, QuizAnswer>;
  checked: Set<string>;
  evaluations: Map<string, Evaluation>;
  startedAt: number;
  config: QuizConfig;
}

const COUNT_OPTIONS = [10, 20, 30, 50];

function scopeLabelLong(scope: QuizScope): string {
  return scope === 'mixed' ? 'Mixed review' : `${MODULE_MAP[scope].code} · ${MODULE_MAP[scope].shortTitle}`;
}

function correctAnswerText(question: Question): string {
  switch (question.kind) {
    case 'mcq':
    case 'code':
    case 'lab':
      return question.options[question.answer] ?? '—';
    case 'tf':
      return question.answer ? 'True' : 'False';
    case 'fill':
      return question.accepted[0];
    case 'numeric':
      return `${question.answer} ${question.unit}`.trim();
    case 'matching':
      return question.left
        .map((item) => `${item.label} → ${question.correct[item.id]}`)
        .join(' · ');
    case 'ordering':
      return question.items.join(' → ');
  }
}

function answerText(question: Question, answer: QuizAnswer | null): string {
  if (!answer) return 'No answer';
  switch (answer.type) {
    case 'choice':
      return question.kind === 'mcq' || question.kind === 'code' || question.kind === 'lab'
        ? question.options[answer.index] ?? 'No answer'
        : 'No answer';
    case 'boolean':
      return answer.value ? 'True' : 'False';
    case 'text':
      return answer.value.trim() || 'No answer';
    case 'matching':
      return Object.entries(answer.value)
        .map(([, value]) => value)
        .join(' · ');
    case 'ordering':
      return answer.value.join(' → ');
  }
}

/** Deterministic option order so a matching column is not already aligned. */
function matchingRightOrder(question: MatchingQuestion): string[] {
  let hash = 0;
  for (const character of question.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return shuffleWithSeed(question.right, hash || 1);
}

function OrderingInput({
  question,
  answer,
  onChange,
}: {
  question: OrderingQuestion;
  answer: QuizAnswer | null;
  onChange: (answer: QuizAnswer) => void;
}) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!answer) {
      onChange({ type: 'ordering', value: [...question.items].reverse() });
    }
  });

  const value =
    answer && answer.type === 'ordering'
      ? answer.value
      : [...question.items].reverse();

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ type: 'ordering', value: next });
  };

  return (
    <div className="ordering-input">
      <p className="input-help">Use the arrows to arrange the steps in the correct order.</p>
      <ol>
        {value.map((item, itemIndex) => (
          <li key={item}>
            <span className="ordering-number">{itemIndex + 1}</span>
            <span className="ordering-label">{item}</span>
            <span className="ordering-buttons">
              <button
                type="button"
                className="icon-button tiny"
                aria-label={`Move ${item} up`}
                disabled={itemIndex === 0}
                onClick={() => move(itemIndex, itemIndex - 1)}
              >
                <Icon name="chevron-down" size={15} className="icon-up" />
              </button>
              <button
                type="button"
                className="icon-button tiny"
                aria-label={`Move ${item} down`}
                disabled={itemIndex === value.length - 1}
                onClick={() => move(itemIndex, itemIndex + 1)}
              >
                <Icon name="chevron-down" size={15} />
              </button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MatchingInput({
  question,
  answer,
  onChange,
}: {
  question: MatchingQuestion;
  answer: QuizAnswer | null;
  onChange: (answer: QuizAnswer) => void;
}) {
  const options = useMemo(() => matchingRightOrder(question), [question]);
  const value = answer && answer.type === 'matching' ? answer.value : {};
  return (
    <div className="matching-input">
      {question.left.map((item) => (
        <div className="matching-row" key={item.id}>
          <span className="matching-label">{item.label}</span>
          <select
            aria-label={`Match for ${item.label}`}
            value={value[item.id] ?? ''}
            onChange={(event) =>
              onChange({
                type: 'matching',
                value: { ...value, [item.id]: event.target.value },
              })
            }
          >
            <option value="">Select a match…</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function QuestionInput({
  question,
  answer,
  onChange,
  locked,
  checked,
}: {
  question: Question;
  answer: QuizAnswer | null;
  onChange: (answer: QuizAnswer) => void;
  locked: boolean;
  checked: boolean;
  evaluation?: Evaluation;
}) {
  switch (question.kind) {
    case 'mcq':
    case 'code':
    case 'lab':
      return (
        <div className="choice-list" role="radiogroup" aria-label="Answer choices">
          {question.options.map((option, optionIndex) => {
            const selected = answer?.type === 'choice' && answer.index === optionIndex;
            const isCorrectOption = checked && question.answer === optionIndex;
            const isWrongChoice = checked && selected && question.answer !== optionIndex;
            return (
              <label
                key={option}
                className={`choice ${selected ? 'is-selected' : ''} ${isCorrectOption ? 'is-correct' : ''} ${isWrongChoice ? 'is-wrong' : ''}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={selected}
                  disabled={locked}
                  onChange={() => onChange({ type: 'choice', index: optionIndex })}
                />
                <span className="choice-letter">{String.fromCharCode(65 + optionIndex)}</span>
                <span className="choice-text">{option}</span>
                {isCorrectOption ? <Icon name="check" size={16} /> : null}
                {isWrongChoice ? <Icon name="close" size={16} /> : null}
              </label>
            );
          })}
        </div>
      );
    case 'tf':
      return (
        <div className="tf-buttons" role="radiogroup" aria-label="True or false">
          {[
            { label: 'True', value: true },
            { label: 'False', value: false },
          ].map((option) => {
            const selected = answer?.type === 'boolean' && answer.value === option.value;
            const revealCorrect = checked && question.answer === option.value;
            const revealWrong = checked && selected && question.answer !== option.value;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`tf-button ${selected ? 'is-selected' : ''} ${revealCorrect ? 'is-correct' : ''} ${revealWrong ? 'is-wrong' : ''}`}
                disabled={locked}
                onClick={() => onChange({ type: 'boolean', value: option.value })}
              >
                <Icon name={option.value ? 'check' : 'close'} size={16} /> {option.label}
              </button>
            );
          })}
        </div>
      );
    case 'fill':
    case 'numeric':
      return (
        <label className="answer-field">
          <span className="field-label">
            Your answer {question.kind === 'numeric' ? <em>({question.unit})</em> : null}
          </span>
          <input
            type={question.kind === 'numeric' ? 'number' : 'text'}
            inputMode={question.kind === 'numeric' ? 'decimal' : undefined}
            value={answer?.type === 'text' ? answer.value : ''}
            placeholder={
              question.placeholder ??
              (question.kind === 'numeric' ? 'Enter a number' : 'Type your answer')
            }
            disabled={locked}
            aria-describedby={question.kind === 'fill' ? `${question.id}-fill-help` : undefined}
            onChange={(event) => onChange({ type: 'text', value: event.target.value })}
          />
          {question.kind === 'fill' ? (
            <span className="field-hint" id={`${question.id}-fill-help`}>
              Short answer. Spelling and case are not graded strictly.
            </span>
          ) : null}
        </label>
      );
    case 'matching':
      return (
        <MatchingInput
          question={question}
          answer={answer}
          onChange={onChange}
        />
      );
    case 'ordering':
      return <OrderingInput question={question} answer={answer} onChange={onChange} />;
  }
}

export function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { quizData, recordAttempt } = useStudyData();
  const [phase, setPhase] = useState<Phase>('setup');
  const [scope, setScope] = useState<QuizScope>('mixed');
  const [count, setCount] = useState(20);
  const [feedback, setFeedback] = useState<'end' | 'immediate'>('end');
  const [selfPaced, setSelfPaced] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [result, setResult] = useState<{ attempt: QuizAttempt; questions: Question[] } | null>(null);
  const [current, setCurrent] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    const param = searchParams.get('scope');
    if (!param) return;
    if (param === 'mixed' || MODULES.some((module) => module.id === param)) {
      setScope(param as QuizScope);
      if (phase !== 'setup') {
        setPhase('setup');
        setSession(null);
        setResult(null);
      }
    }
  }, [searchParams, phase]);

  const available = useMemo(() => questionsForScope(QUESTIONS, scope).length, [scope]);
  const effectiveCount = Math.min(count, available);
  const missedQuestions = useMemo(() => {
    const byId = new Map(QUESTIONS.map((question) => [question.id, question]));
    return quizData.missedQuestionIds
      .map((id) => byId.get(id))
      .filter((question): question is Question => Boolean(question));
  }, [quizData.missedQuestionIds]);

  const begin = (questionsSeed?: { questions: Question[]; config: QuizConfig }) => {
    const questions =
      questionsSeed?.questions ??
      sampleQuestions(QUESTIONS, scope, effectiveCount, Date.now() % 2 ** 31).questions;
    if (questions.length === 0) return;
    const config: QuizConfig =
      questionsSeed?.config ?? {
        scope,
        count: questions.length,
        feedback,
        selfPaced,
      };
    setSession({
      questions,
      answers: new Map(),
      checked: new Set(),
      evaluations: new Map(),
      startedAt: Date.now(),
      config,
    });
    setCurrent(0);
    setResult(null);
    setShowFinishConfirm(false);
    setFlash('');
    setPhase('running');
  };

  const startMissed = () => {
    if (missedQuestions.length === 0) return;
    begin({
      questions: missedQuestions,
      config: {
        scope: 'mixed',
        count: missedQuestions.length,
        feedback,
        selfPaced,
      },
    });
  };

  const attemptFinish = () => {
    if (!session) return;
    const unanswered = session.questions.filter(
      (question) => !isAnswerProvided(question, session.answers.get(question.id) ?? null),
    ).length;
    if (unanswered > 0 && !showFinishConfirm) {
      setShowFinishConfirm(true);
      setFlash(`${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered.`);
      return;
    }
    finish();
  };

  const finish = () => {
    if (!session) return;
    const attempt = buildAttempt(session.config, {
      questions: session.questions,
      answers: session.answers,
      evaluations: session.evaluations,
    }, session.startedAt);
    recordAttempt(attempt);
    setResult({ attempt, questions: session.questions });
    setPhase('results');
    setShowFinishConfirm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setAnswer = (question: Question, answer: QuizAnswer) => {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const answers = new Map(currentSession.answers);
      answers.set(question.id, answer);
      return { ...currentSession, answers };
    });
  };

  const checkCurrent = (question: Question) => {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const answer = currentSession.answers.get(question.id) ?? null;
      if (!isAnswerProvided(question, answer)) return currentSession;
      const evaluation = evaluateAnswer(question, answer);
      const evaluations = new Map(currentSession.evaluations);
      evaluations.set(question.id, evaluation);
      const checked = new Set(currentSession.checked);
      checked.add(question.id);
      if (evaluation.correct) setFlash('Correct.');
      else setFlash(`Not quite. ${question.explanation}`);
      return { ...currentSession, evaluations, checked };
    });
  };

  const resetToSetup = () => {
    setPhase('setup');
    setSession(null);
    setResult(null);
    setShowFinishConfirm(false);
    setFlash('');
    setSearchParams({}, { replace: true });
  };

  if (phase === 'setup') {
    return (
      <div className="page quiz-page animate-page-enter">
        <PageHeader
          eyebrow={
            <>
              <Icon name="quiz" size={14} /> Practice test
            </>
          }
          title="Practice Quiz"
          description="Build a quiz from any module or a mixed pool. Every question comes from the 11-page reviewer, and answers and explanations stay hidden until you submit."
          actions={
            <>
              <Link className="btn btn-secondary" to="/notes">
                <Icon name="notes" size={16} /> Study first
              </Link>
              <Link className="btn btn-ghost" to="/progress">
                <Icon name="progress" size={16} /> History
              </Link>
            </>
          }
        />

        <div className="quiz-setup-grid animate-content-reveal stagger-1">
          <Card className="quiz-config">
            <div className="card-heading">
              <div>
                <div className="eyebrow">Step 1</div>
                <h2>Choose a scope</h2>
              </div>
            </div>
            <div className="scope-grid" role="radiogroup" aria-label="Quiz scope">
              <button
                type="button"
                role="radio"
                aria-checked={scope === 'mixed'}
                className={`scope-option ${scope === 'mixed' ? 'is-active' : ''}`}
                onClick={() => setScope('mixed')}
              >
                <span className="scope-option-icon">
                  <Icon name="spark" size={19} />
                </span>
                <strong>Mixed review</strong>
                <span>All modules and both labs</span>
                <em>{QUESTIONS.length} questions</em>
              </button>
              {MODULES.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  role="radio"
                  aria-checked={scope === module.id}
                  className={`scope-option ${scope === module.id ? 'is-active' : ''}`}
                  onClick={() => setScope(module.id)}
                >
                  <span className={`scope-option-icon accent-${module.accent}`}>
                    <Icon
                      name={module.kind === 'lab' ? 'flask' : module.kind === 'reference' ? 'formula' : 'notes'}
                      size={19}
                    />
                  </span>
                  <strong>{module.code}</strong>
                  <span>{module.shortTitle}</span>
                  <em>{questionsForScope(QUESTIONS, module.id).length} questions</em>
                </button>
              ))}
            </div>

            <div className="card-heading quiz-step-two">
              <div>
                <div className="eyebrow">Step 2</div>
                <h2>Quiz options</h2>
              </div>
            </div>
            <div className="quiz-options-grid">
              <div className="quiz-option-group">
                <span className="field-label">Number of questions</span>
                <div className="chip-row">
                  {COUNT_OPTIONS.filter((option) => option < available || option === COUNT_OPTIONS[0]).map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        className={`chip-button ${count === option ? 'is-active' : ''}`}
                        aria-pressed={count === option}
                        onClick={() => setCount(option)}
                      >
                        {option}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className={`chip-button ${count >= available ? 'is-active' : ''}`}
                    aria-pressed={count >= available}
                    onClick={() => setCount(available)}
                  >
                    All {available}
                  </button>
                </div>
                <span className="field-hint">
                  This scope has {available} questions. Your quiz will use {effectiveCount}.
                </span>
              </div>

              <div className="quiz-option-group">
                <span className="field-label">Feedback</span>
                <label className={`radio-card ${feedback === 'end' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="feedback"
                    value="end"
                    checked={feedback === 'end'}
                    onChange={() => setFeedback('end')}
                  />
                  <span>
                    <strong>Show everything at the end</strong>
                    <small>Answers and explanations appear only after you finish.</small>
                  </span>
                </label>
                <label className={`radio-card ${feedback === 'immediate' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="feedback"
                    value="immediate"
                    checked={feedback === 'immediate'}
                    onChange={() => setFeedback('immediate')}
                  />
                  <span>
                    <strong>Check each answer</strong>
                    <small>Submit a question to reveal its answer, then continue.</small>
                  </span>
                </label>
              </div>

              <div className="quiz-option-group">
                <span className="field-label">Pacing</span>
                <label className={`toggle-card ${selfPaced ? 'is-active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selfPaced}
                    onChange={(event) => setSelfPaced(event.target.checked)}
                  />
                  <span>
                    <strong>Self-paced navigation</strong>
                    <small>Move back and forth between unanswered questions.</small>
                  </span>
                </label>
                <span className="field-hint">
                  No timer is used in either mode: the reviewer does not specify an exam duration.
                </span>
              </div>
            </div>

            <div className="quiz-start-row">
              <button type="button" className="btn btn-primary" onClick={() => begin()} disabled={available === 0}>
                <Icon name="play" size={16} /> Start quiz · {effectiveCount} questions
              </button>
              <span className="field-hint">Answers are not revealed before you submit.</span>
            </div>
          </Card>

          <div className="quiz-setup-side animate-content-reveal stagger-2">
            <Card className="quiz-missed-card">
              <div className="card-heading compact">
                <div>
                  <div className="eyebrow">Targeted review</div>
                  <h2>Missed questions</h2>
                </div>
                <span className="missed-count">{missedQuestions.length}</span>
              </div>
              {missedQuestions.length === 0 ? (
                <p className="muted-copy">
                  Questions you miss are saved here so you can retry just those. Finish a quiz to
                  start building this list.
                </p>
              ) : (
                <>
                  <p className="muted-copy">
                    Practice the {missedQuestions.length} question
                    {missedQuestions.length === 1 ? '' : 's'} you have not yet answered correctly.
                    A correct retry removes a question from this list.
                  </p>
                  <button type="button" className="btn btn-secondary btn-small" onClick={startMissed}>
                    <Icon name="refresh" size={14} /> Retry missed questions
                  </button>
                </>
              )}
            </Card>

            <Card className="quiz-side-info">
              <div className="card-heading compact">
                <div>
                  <div className="eyebrow">Coverage</div>
                  <h2>What is included</h2>
                </div>
              </div>
              <ul className="check-list">
                <li>
                  <Icon name="check" size={15} /> Multiple choice, true/false, matching, ordering
                </li>
                <li>
                  <Icon name="check" size={15} /> Fill-in and numeric computation
                </li>
                <li>
                  <Icon name="check" size={15} /> Code interpretation and lab troubleshooting
                </li>
                <li>
                  <Icon name="check" size={15} /> A review note link for every explanation
                </li>
              </ul>
              <p className="quiz-count-note">
                {QUESTIONS.length} grounded questions across {MODULES.length} study units.
              </p>
            </Card>

            {quizData.attempts.length > 0 ? (
              <Card className="quiz-recent">
                <div className="card-heading compact">
                  <div>
                    <div className="eyebrow">Recent</div>
                    <h2>Last attempts</h2>
                  </div>
                  <Link to="/progress" className="text-link">
                    All
                  </Link>
                </div>
                <ul className="recent-attempt-list">
                  {quizData.attempts.slice(0, 4).map((attempt) => (
                    <li key={attempt.id}>
                      <div>
                        <strong>{scopeLabel(attempt.scope)}</strong>
                        <span>{formatDateTime(attempt.finishedAt ?? attempt.startedAt)}</span>
                      </div>
                      <span className="score-pill">
                        {attempt.correct}/{attempt.total} ·{' '}
                        {formatPercent((attempt.correct / Math.max(1, attempt.total)) * 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'running' && session) {
    const question = session.questions[current];
    const answer = session.answers.get(question.id) ?? null;
    const checked = session.checked.has(question.id);
    const evaluation = session.evaluations.get(question.id);
    const answeredCount = session.questions.filter((item) =>
      isAnswerProvided(item, session.answers.get(item.id) ?? null),
    ).length;
    const isLast = current === session.questions.length - 1;
    const immediate = session.config.feedback === 'immediate';
    const locked = immediate && checked;
    const canCheck = isAnswerProvided(question, answer) && !checked;
    const correctSoFar = session.questions.filter(
      (item) => session.evaluations.get(item.id)?.correct,
    ).length;

    return (
      <div className="page quiz-run-page animate-page-enter">
        <div className="quiz-run-head animate-content-reveal stagger-1">
          <button type="button" className="btn btn-ghost btn-small" onClick={resetToSetup}>
            <Icon name="close" size={15} /> Exit
          </button>
          <div className="quiz-run-title">
            <strong>{scopeLabelLong(session.config.scope)}</strong>
            <span>
              {session.config.selfPaced ? 'Self-paced · no timer' : 'Forward only · no timer'}
            </span>
          </div>
          <div className="quiz-run-score">
            <span>
              {answeredCount}/{session.questions.length} answered
            </span>
            {immediate ? <span>{correctSoFar} correct</span> : null}
          </div>
        </div>
        <ProgressBar
          value={answeredCount}
          max={session.questions.length}
          label="Questions answered"
          className="animate-content-reveal stagger-2"
        />

        <div className="quiz-run-grid animate-content-reveal stagger-3">
          <div className="quiz-question-column">
            <Card className="quiz-question-card">
              <div className="quiz-question-meta">
                <span className="question-counter">
                  Question {current + 1} of {session.questions.length}
                </span>
                <ModuleBadge moduleId={question.moduleId} />
                <span className="question-topic">{question.topic}</span>
                <SourceRef page={question.page} />
              </div>
              <h2 className="quiz-prompt">{question.prompt}</h2>
              {'snippet' in question && question.snippet ? (
                <div className="quiz-snippet">
                  <div className="quiz-snippet-head">{question.snippetCaption ?? 'Code'}</div>
                  <pre>
                    <code>{question.snippet}</code>
                  </pre>
                </div>
              ) : null}

              <QuestionInput
                question={question}
                answer={answer}
                onChange={(next) => setAnswer(question, next)}
                locked={locked}
                checked={checked}
                evaluation={evaluation}
              />

              {immediate && checked && evaluation ? (
                <div
                  className={`quiz-feedback ${evaluation.correct ? 'is-correct' : 'is-wrong'}`}
                  aria-live="polite"
                >
                  <div className="quiz-feedback-head">
                    <Icon name={evaluation.correct ? 'check' : 'warning'} size={18} />
                    <strong>{evaluation.correct ? 'Correct' : 'Incorrect'}</strong>
                  </div>
                  {!evaluation.correct ? (
                    <p className="quiz-correct-answer">
                      <span>Correct answer:</span> {correctAnswerText(question)}
                    </p>
                  ) : null}
                  <p>{question.explanation}</p>
                  <div className="quiz-feedback-foot">
                    <SourceRef page={question.page} />
                    <Link to={`/notes#note-${question.reviewNoteId}`} className="text-link">
                      Open review note <Icon name="arrow-right" size={14} />
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="quiz-question-actions">
                {session.config.selfPaced ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={current === 0}
                    onClick={() => {
                      setFlash('');
                      setCurrent((value) => Math.max(0, value - 1));
                    }}
                  >
                    <Icon name="arrow-left" size={16} /> Previous
                  </button>
                ) : (
                  <span />
                )}

                <div className="quiz-actions-right">
                  {immediate && !checked ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!canCheck}
                      onClick={() => checkCurrent(question)}
                    >
                      <Icon name="check" size={16} /> Submit answer
                    </button>
                  ) : immediate && checked ? (
                    isLast ? (
                      <button type="button" className="btn btn-primary" onClick={attemptFinish}>
                        <Icon name="target" size={16} /> Finish quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setFlash('');
                          setCurrent((value) => Math.min(session.questions.length - 1, value + 1));
                        }}
                      >
                        Next question <Icon name="arrow-right" size={16} />
                      </button>
                    )
                  ) : isLast ? (
                    <button type="button" className="btn btn-primary" onClick={attemptFinish}>
                      <Icon name="target" size={16} /> Finish quiz
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setFlash('');
                        setCurrent((value) => Math.min(session.questions.length - 1, value + 1));
                      }}
                    >
                      Next question <Icon name="arrow-right" size={16} />
                    </button>
                  )}
                </div>
              </div>

              {flash && !(immediate && checked) ? (
                <div className="quiz-inline-flash" role="status" aria-live="polite">
                  {flash}
                </div>
              ) : null}
            </Card>

            {showFinishConfirm ? (
              <div className="quiz-finish-prompt" role="alert">
                <Icon name="warning" size={18} />
                <div>
                  <strong>Finish with unanswered questions?</strong>
                  <p>Unanswered questions are scored as incorrect. {flash}</p>
                </div>
                <div className="quiz-finish-actions">
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowFinishConfirm(false)}>
                    Keep going
                  </button>
                  <button type="button" className="btn btn-primary btn-small" onClick={finish}>
                    Finish anyway
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="quiz-palette animate-content-reveal stagger-4" aria-label="Question navigation">
            <div className="quiz-palette-head">
              <span>Questions</span>
              <span>{answeredCount} answered</span>
            </div>
            <div className="quiz-palette-grid">
              {session.questions.map((item, itemIndex) => {
                const itemAnswer = session.answers.get(item.id) ?? null;
                const itemChecked = session.checked.has(item.id);
                const itemEvaluation = session.evaluations.get(item.id);
                const answered = isAnswerProvided(item, itemAnswer);
                const lockedAhead = !session.config.selfPaced && itemIndex > current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`palette-cell ${itemIndex === current ? 'is-current' : ''} ${answered ? 'is-answered' : ''} ${itemChecked && itemEvaluation ? (itemEvaluation.correct ? 'is-correct' : 'is-wrong') : ''}`}
                    disabled={lockedAhead}
                    aria-label={`Question ${itemIndex + 1}${answered ? ', answered' : ', unanswered'}`}
                    aria-current={itemIndex === current ? 'step' : undefined}
                    onClick={() => {
                      setFlash('');
                      setCurrent(itemIndex);
                    }}
                  >
                    {itemIndex + 1}
                  </button>
                );
              })}
            </div>
            <div className="quiz-palette-legend">
              <span>
                <i className="legend-dot legend-current" /> Current
              </span>
              <span>
                <i className="legend-dot legend-answered" /> Answered
              </span>
              <span>
                <i className="legend-dot legend-empty" /> Unanswered
              </span>
            </div>
            <button type="button" className="btn btn-secondary btn-small quiz-finish-button" onClick={attemptFinish}>
              Finish quiz
            </button>
            <p className="quiz-palette-note">
              {session.config.feedback === 'immediate'
                ? 'Each answer is revealed only after you submit that question.'
                : 'Answers stay hidden until the quiz is finished.'}
            </p>
          </aside>
        </div>
      </div>
    );
  }

  if (phase === 'results' && result) {
    const { attempt, questions } = result;
    const percent = (attempt.correct / Math.max(1, attempt.total)) * 100;
    const missed = attempt.answers.filter((answer) => !answer.correct);
    const byModule = new Map<ModuleId, { total: number; correct: number }>();
    for (const answer of attempt.answers) {
      const entry = byModule.get(answer.moduleId) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (answer.correct) entry.correct += 1;
      byModule.set(answer.moduleId, entry);
    }

    return (
      <div className="page quiz-results-page animate-page-enter">
        <PageHeader
          eyebrow={
            <>
              <Icon name="target" size={14} /> Attempt complete
            </>
          }
          title="Quiz results"
          description={`${scopeLabelLong(attempt.scope)} · finished ${formatDateTime(attempt.finishedAt ?? Date.now())}`}
          actions={
            <>
              <button type="button" className="btn btn-secondary" onClick={resetToSetup}>
                <Icon name="refresh" size={16} /> New quiz
              </button>
              {missed.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    begin({
                      questions: questions.filter((question) =>
                        missed.some((answer) => answer.questionId === question.id),
                      ),
                      config: {
                        scope: attempt.scope,
                        count: missed.length,
                        feedback: attempt.feedback,
                        selfPaced: true,
                      },
                    })
                  }
                >
                  <Icon name="refresh" size={16} /> Retry missed
                </button>
              ) : null}
            </>
          }
        />

        <div className="results-hero">
          <div className="results-score">
            <div
              className={`score-ring ${percent >= 70 ? 'is-pass' : 'is-low'}`}
              style={{ ['--score' as string]: `${percent}%` }}
            >
              <span>{formatPercent(percent)}</span>
              <small>score</small>
            </div>
            <div className="results-score-copy">
              <h2>
                {attempt.correct} of {attempt.total} correct
              </h2>
              <p>
                {percent >= 90
                  ? 'Strong recall. Review the explanations below to keep the details sharp.'
                  : percent >= 70
                    ? 'Solid foundation. Focus on the missed topics before the exam.'
                    : 'Use the missed questions and note links below to close the gaps.'}
              </p>
              <div className="results-quick-stats">
                <span>
                  <strong>{attempt.total - attempt.correct}</strong> missed
                </span>
                <span>
                  <strong>{attempt.missedTopics.length}</strong> topics to review
                </span>
                <span>
                  <strong>{formatPercent((attempt.correct / Math.max(1, attempt.total)) * 100)}</strong>{' '}
                  correct
                </span>
              </div>
            </div>
          </div>
        </div>

        {attempt.missedTopics.length > 0 ? (
          <Card className="results-breakdown animate-content-reveal stagger-1">
            <div className="card-heading">
              <div>
                <div className="eyebrow">Next steps</div>
                <h2>Topics to review</h2>
              </div>
              <Link to="/progress" className="text-link">
                Full progress
              </Link>
            </div>
            <ul className="weak-topic-list">
              {attempt.missedTopics.map((topic) => {
                const question = questions.find((item) => item.topic === topic);
                return (
                  <li key={topic}>
                    <div>
                      <strong>{topic}</strong>
                      <span>
                        {question ? MODULE_MAP[question.moduleId].code : 'Mixed'} · try the related
                        questions again
                      </span>
                    </div>
                    {question ? (
                      <Link to={`/notes#note-${question.reviewNoteId}`} className="text-link">
                        Review note
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <Card className="results-by-module animate-content-reveal stagger-2">
          <div className="card-heading">
            <div>
              <div className="eyebrow">Breakdown</div>
              <h2>By study unit</h2>
            </div>
          </div>
          <div className="module-breakdown">
            {Array.from(byModule.entries()).map(([moduleId, stats]) => {
              const modulePercent = (stats.correct / Math.max(1, stats.total)) * 100;
              return (
                <div className="module-breakdown-row" key={moduleId}>
                  <ModuleBadge moduleId={moduleId} />
                  <div className="module-breakdown-bar">
                    <ProgressBar
                      value={stats.correct}
                      max={stats.total}
                      tone={modulePercent >= 70 ? 'success' : 'warning'}
                      label={`${MODULE_MAP[moduleId].code} score`}
                    />
                  </div>
                  <span>
                    {stats.correct}/{stats.total}
                  </span>
                  <Link to={`/quiz?scope=${moduleId}`} className="text-link">
                    Practice
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="results-review animate-content-reveal stagger-3">
          <div className="card-heading">
            <div>
              <div className="eyebrow">Every question</div>
              <h2>Answer review</h2>
            </div>
            <span className="muted-count">
              {attempt.correct} correct · {attempt.total - attempt.correct} incorrect
            </span>
          </div>
          <div className="review-list">
            {questions.map((question, index) => {
              const record = attempt.answers.find((item) => item.questionId === question.id);
              const evaluation = record
                ? { correct: record.correct, responseLabel: record.response }
                : null;
              return (
                <details
                  className={`review-item ${evaluation?.correct ? 'is-correct' : 'is-wrong'}`}
                  key={question.id}
                  open={!evaluation?.correct}
                >
                  <summary>
                    <span className="review-number">{index + 1}</span>
                    <span className="review-status">
                      <Icon name={evaluation?.correct ? 'check' : 'close'} size={15} />
                    </span>
                    <span className="review-summary-text">{question.prompt}</span>
                    <span className="review-topic">{question.topic}</span>
                  </summary>
                  <div className="review-body">
                    {'snippet' in question && question.snippet ? (
                      <pre className="review-code">
                        <code>{question.snippet}</code>
                      </pre>
                    ) : null}
                    <p className="review-answer">
                      <span>Your answer:</span> {answerText(question, session?.answers.get(question.id) ?? null)}
                    </p>
                    <p className="review-correct">
                      <span>Correct answer:</span> {correctAnswerText(question)}
                    </p>
                    <p className="review-explanation">{question.explanation}</p>
                    <div className="review-foot">
                      <ModuleBadge moduleId={question.moduleId} />
                      <SourceRef page={question.page} />
                      <Link to={`/notes#note-${question.reviewNoteId}`} className="text-link">
                        Review note <Icon name="arrow-right" size={13} />
                      </Link>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </Card>

        <Callout tone="info" title="Your attempt is saved" className="animate-content-reveal stagger-4">
          <p>
            This attempt was added to your local quiz history. The Progress page shows your average,
            per-module accuracy, and the questions still marked as missed.
          </p>
        </Callout>
      </div>
    );
  }

  return (
    <div className="page quiz-page animate-page-enter">
      <EmptyState
        icon="quiz"
        title="Quiz state unavailable"
        action={
          <button type="button" className="btn btn-primary btn-small" onClick={resetToSetup}>
            Back to quiz setup
          </button>
        }
      >
        <p>Return to the setup screen to start a new attempt.</p>
      </EmptyState>
    </div>
  );
}
