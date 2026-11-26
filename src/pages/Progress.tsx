import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Callout,
  Card,
  EmptyState,
  ModuleBadge,
  PageHeader,
  ProgressBar,
  SourceRef,
  StatCard,
} from '../components/ui';
import { MODULES, MODULE_MAP } from '../data/modules';
import { NOTE_SECTIONS } from '../data/notes';
import { FLASHCARDS } from '../data/flashcards';
import { QUESTIONS } from '../data/questions';
import { useStudyData } from '../state/StudyDataContext';
import {
  enrichTopicStats,
  formatDateTime,
  formatPercent,
  getWeakTopics,
  scopeLabel,
  summarizeAttempts,
} from '../lib/quiz';

export function ProgressPage() {
  const {
    progress,
    flashcards,
    quizData,
    toggleModule,
    resetQuizHistory,
    clearMissedQuestions,
    resetAll,
  } = useStudyData();

  const summary = summarizeAttempts(quizData.attempts);
  const known = FLASHCARDS.filter((card) => flashcards[card.id] === 'known').length;
  const review = FLASHCARDS.filter((card) => flashcards[card.id] === 'review').length;
  const reviewedCards = known + review;
  const weakTopics = enrichTopicStats(getWeakTopics(quizData.attempts), QUESTIONS).slice(0, 6);
  const missedQuestions = quizData.missedQuestionIds
    .map((id) => QUESTIONS.find((question) => question.id === id))
    .filter((question): question is (typeof QUESTIONS)[number] => Boolean(question));

  const moduleAccuracy = MODULES.map((module) => {
    let total = 0;
    let correct = 0;
    for (const attempt of quizData.attempts) {
      for (const answer of attempt.answers) {
        if (answer.moduleId !== module.id) continue;
        total += 1;
        if (answer.correct) correct += 1;
      }
    }
    return {
      module,
      total,
      correct,
      percent: total === 0 ? null : (correct / total) * 100,
    };
  });

  const completed = progress.completedModules.length;
  const totalModules = MODULES.length;

  return (
    <div className="page progress-page animate-page-enter">
      <PageHeader
        eyebrow={
          <>
            <Icon name="progress" size={14} /> Local progress
          </>
        }
        title="Progress"
        description="A single view of what you have reviewed, how your quiz scores are trending, and which topics still need attention. Everything is stored in this browser."
        actions={
          <>
            <Link className="btn btn-secondary" to="/quiz?scope=mixed">
              <Icon name="quiz" size={16} /> New quiz
            </Link>
            <Link className="btn btn-ghost" to="/flashcards">
              <Icon name="cards" size={16} /> Flashcards
            </Link>
          </>
        }
      />

      <div className="progress-stats animate-content-reveal stagger-1">
        <StatCard
          label="Study units reviewed"
          value={
            <>
              {completed}
              <span className="stat-value-fraction">/{totalModules}</span>
            </>
          }
          hint={`${Math.round((completed / totalModules) * 100)}% complete`}
          icon="notes"
        />
        <StatCard
          label="Average quiz score"
          value={summary.averagePercent === null ? '—' : formatPercent(summary.averagePercent)}
          hint={
            summary.attempts === 0
              ? 'No attempts yet'
              : `Across ${summary.attempts} attempt${summary.attempts === 1 ? '' : 's'}`
          }
          icon="target"
        />
        <StatCard
          label="Best score"
          value={summary.bestPercent === null ? '—' : formatPercent(summary.bestPercent)}
          hint={`${summary.totalCorrect}/${summary.totalQuestions} correct all-time`}
          icon="spark"
        />
        <StatCard
          label="Flashcards known"
          value={
            <>
              {known}
              <span className="stat-value-fraction">/{FLASHCARDS.length}</span>
            </>
          }
          hint={`${reviewedCards} reviewed · ${review} marked for review`}
          icon="cards"
        />
      </div>

      <div className="progress-grid animate-content-reveal stagger-2">
        <Card className="progress-modules">
          <div className="card-heading">
            <div>
              <div className="eyebrow">Coverage</div>
              <h2>Study unit checklist</h2>
            </div>
            <span className="muted-count">{completed}/{totalModules} reviewed</span>
          </div>
          <div className="progress-module-list">
            {MODULES.map((module) => {
              const isComplete = progress.completedModules.includes(module.id);
              const sections = NOTE_SECTIONS.filter((section) => section.moduleId === module.id).length;
              const accuracy = moduleAccuracy.find((entry) => entry.module.id === module.id);
              return (
                <div className={`progress-module-row ${isComplete ? 'is-complete' : ''}`} key={module.id}>
                  <button
                    type="button"
                    className={`progress-check ${isComplete ? 'is-checked' : ''}`}
                    aria-pressed={isComplete}
                    aria-label={`${isComplete ? 'Mark unreviewed' : 'Mark reviewed'}: ${module.title}`}
                    onClick={() => toggleModule(module.id)}
                  >
                    {isComplete ? <Icon name="check" size={15} /> : null}
                  </button>
                  <div className="progress-module-copy">
                    <div className="progress-module-top">
                      <ModuleBadge moduleId={module.id} />
                      <strong>{module.shortTitle}</strong>
                      {module.priority ? <span className="priority-pill">Priority</span> : null}
                    </div>
                    <span>
                      {sections} note sections · {QUESTIONS.filter((q) => q.moduleId === module.id).length}{' '}
                      questions
                    </span>
                  </div>
                  <div className="progress-module-accuracy">
                    {accuracy && accuracy.percent !== null ? (
                      <>
                        <strong>{formatPercent(accuracy.percent)}</strong>
                        <span>
                          {accuracy.correct}/{accuracy.total} quiz answers
                        </span>
                      </>
                    ) : (
                      <span className="muted-copy">No quiz data</span>
                    )}
                  </div>
                  <Link className="text-link" to={`/notes?module=${module.id}`}>
                    Open
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="progress-side animate-content-reveal stagger-3">
          <Card className="animate-content-reveal stagger-4">
            <div className="card-heading compact">
              <div>
                <div className="eyebrow">Focus</div>
                <h2>Weak topics</h2>
              </div>
              <span className="muted-count">{weakTopics.length}</span>
            </div>
            {weakTopics.length === 0 ? (
              <EmptyState icon="target" title="Nothing flagged yet">
                <p>Missed quiz questions will appear here by topic.</p>
              </EmptyState>
            ) : (
              <ul className="weak-topic-list">
                {weakTopics.map((topic) => (
                  <li key={topic.topic}>
                    <div>
                      <strong>{topic.topic}</strong>
                      <span>
                        {topic.misses} missed of {topic.attempts} · {MODULE_MAP[topic.moduleId].code}
                      </span>
                    </div>
                    {topic.reviewNoteId ? (
                      <Link to={`/notes#note-${topic.reviewNoteId}`} className="text-link">
                        Review
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="card-heading compact">
              <div>
                <div className="eyebrow">Flashcards</div>
                <h2>Deck status</h2>
              </div>
              <Link to="/flashcards" className="text-link">
                Open
              </Link>
            </div>
            <div className="deck-status">
              <div className="deck-status-row">
                <span>Known</span>
                <ProgressBar value={known} max={FLASHCARDS.length} tone="success" label="Known cards" />
                <strong>{known}</strong>
              </div>
              <div className="deck-status-row">
                <span>Review again</span>
                <ProgressBar value={review} max={FLASHCARDS.length} tone="warning" label="Cards marked for review" />
                <strong>{review}</strong>
              </div>
              <div className="deck-status-row">
                <span>Not marked</span>
                <ProgressBar value={FLASHCARDS.length - reviewedCards} max={FLASHCARDS.length} label="Unmarked cards" />
                <strong>{FLASHCARDS.length - reviewedCards}</strong>
              </div>
            </div>
            <div className="deck-module-breakdown">
              {MODULES.map((module) => {
                const cards = FLASHCARDS.filter((card) => card.moduleId === module.id);
                const moduleKnown = cards.filter((card) => flashcards[card.id] === 'known').length;
                return (
                  <div key={module.id}>
                    <span>{module.code}</span>
                    <span>
                      {moduleKnown}/{cards.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="progress-lower animate-content-reveal stagger-5">
        <Card className="progress-history animate-content-reveal stagger-6">
          <div className="card-heading">
            <div>
              <div className="eyebrow">History</div>
              <h2>Quiz attempts</h2>
            </div>
            {quizData.attempts.length > 0 ? (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  if (window.confirm('Delete all quiz attempts and missed-question history?')) {
                    resetQuizHistory();
                  }
                }}
              >
                <Icon name="trash" size={14} /> Clear history
              </button>
            ) : null}
          </div>
          {quizData.attempts.length === 0 ? (
            <EmptyState
              icon="quiz"
              title="No attempts recorded"
              action={
                <Link className="btn btn-primary btn-small" to="/quiz?scope=mixed">
                  Take the first quiz
                </Link>
              }
            >
              <p>Your scores, per-module accuracy, and weak topics will appear here.</p>
            </EmptyState>
          ) : (
            <div className="history-list">
              {quizData.attempts.map((attempt) => {
                const percent = (attempt.correct / Math.max(1, attempt.total)) * 100;
                return (
                  <details className="history-item" key={attempt.id}>
                    <summary>
                      <span className={`history-score ${percent >= 70 ? 'is-good' : 'is-low'}`}>
                        {formatPercent(percent)}
                      </span>
                      <span className="history-main">
                        <strong>{scopeLabel(attempt.scope)}</strong>
                        <span>
                          {attempt.correct}/{attempt.total} correct ·{' '}
                          {formatDateTime(attempt.finishedAt ?? attempt.startedAt)} ·{' '}
                          {attempt.feedback === 'immediate' ? 'checked each answer' : 'feedback at end'}
                        </span>
                      </span>
                      <span className="history-chevron">
                        <Icon name="chevron-down" size={16} />
                      </span>
                    </summary>
                    <div className="history-body">
                      {attempt.missedTopics.length > 0 ? (
                        <div className="history-missed">
                          <span>Missed topics:</span>
                          <div className="history-tags">
                            {attempt.missedTopics.map((topic) => (
                              <span key={topic} className="topic-tag">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="history-perfect">
                          <Icon name="check" size={15} /> No missed topics in this attempt.
                        </p>
                      )}
                      <div className="history-actions">
                        <Link
                          className="btn btn-secondary btn-small"
                          to={`/quiz?scope=${attempt.scope}`}
                        >
                          Practice {scopeLabel(attempt.scope)} again
                        </Link>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="progress-missed animate-content-reveal stagger-7">
          <div className="card-heading">
            <div>
              <div className="eyebrow">Question bank</div>
              <h2>Still marked missed</h2>
            </div>
            <span className="missed-count">{missedQuestions.length}</span>
          </div>
          {missedQuestions.length === 0 ? (
            <EmptyState icon="check" title="No questions on the missed list">
              <p>
                A correct answer removes a question from this list, so it stays useful as a
                targeted review queue.
              </p>
            </EmptyState>
          ) : (
            <>
              <ul className="missed-question-list">
                {missedQuestions.slice(0, 10).map((question) => (
                  <li key={question.id}>
                    <div>
                      <strong>{question.topic}</strong>
                      <span>{question.prompt}</span>
                      <div className="missed-meta">
                        <ModuleBadge moduleId={question.moduleId} />
                        <SourceRef page={question.page} />
                      </div>
                    </div>
                    <Link to={`/notes#note-${question.reviewNoteId}`} className="text-link">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
              {missedQuestions.length > 10 ? (
                <p className="muted-copy">Showing the first 10 of {missedQuestions.length}.</p>
              ) : null}
              <div className="missed-actions">
                <Link className="btn btn-primary btn-small" to="/quiz?scope=mixed">
                  <Icon name="refresh" size={14} /> Retry from setup
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => {
                    if (window.confirm('Clear the missed-question queue? Quiz history stays intact.')) {
                      clearMissedQuestions();
                    }
                  }}
                >
                  <Icon name="trash" size={14} /> Clear queue
                </button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Callout tone="info" title="Where this data lives" className="animate-content-reveal stagger-8">
        <p>
          Progress, flashcard marks, and quiz history are saved in this browser’s local storage.
          Nothing is uploaded. Clearing your browser data or using another device will not carry
          this progress over.
        </p>
      </Callout>

      <Card className="danger-card animate-content-reveal stagger-9">
        <div>
          <h3>Reset everything</h3>
          <p>
            Clears study-unit completion, every flashcard mark, all quiz attempts, and the missed
            question queue in this browser.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-danger btn-small"
          onClick={() => {
            if (window.confirm('Reset all study progress, flashcard marks, and quiz history?')) {
              resetAll();
            }
          }}
        >
          <Icon name="trash" size={14} /> Reset all data
        </button>
      </Card>

      {summary.lastAttempt ? (
        <div className="progress-last-line animate-content-reveal stagger-10">
          <span>
            Last attempt:{' '}
            <strong>
              {scopeLabel(summary.lastAttempt.scope)} · {summary.lastAttempt.correct}/
              {summary.lastAttempt.total}
            </strong>{' '}
            on {formatDateTime(summary.lastAttempt.finishedAt ?? summary.lastAttempt.startedAt)}
          </span>
          <Link className="text-link" to="/quiz?scope=mixed">
            Start another <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
