import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Card, EmptyState, ModuleBadge, ProgressBar, SourceRef, StatCard } from '../components/ui';
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

export function DashboardPage() {
  const { progress, flashcards, quizData, toggleModule } = useStudyData();
  const completed = progress.completedModules.length;
  const totalModules = MODULES.length;
  const knownCards = FLASHCARDS.filter((card) => flashcards[card.id] === 'known').length;
  const reviewedCards = FLASHCARDS.filter((card) => Boolean(flashcards[card.id])).length;
  const summary = summarizeAttempts(quizData.attempts);
  const weakTopics = enrichTopicStats(getWeakTopics(quizData.attempts), QUESTIONS).slice(0, 3);
  const continueRoute =
    progress.lastRoute && progress.lastRoute !== '/' ? progress.lastRoute : '/notes#note-m1-what-is';
  const lastAttempt = summary.lastAttempt;

  return (
    <div className="page dashboard-page animate-page-enter">
      <section className="hero animate-content-reveal stagger-1">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="hero-dot" /> BSCpE 4 · Final Examination
          </div>
          <h1>
            Embedded Systems,
            <br />
            made clear.
          </h1>
          <p>
            A focused, interactive reviewer for all five modules and both laboratory activities.
            Every note, formula, card, and question is drawn from the 11-page reviewer PDF — with
            page references you can check.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to={continueRoute}>
              <Icon name="play" size={16} /> Continue studying
            </Link>
            <Link className="btn btn-secondary" to="/quiz?scope=mixed">
              <Icon name="quiz" size={17} /> Start mixed quiz
            </Link>
            <Link className="btn btn-ghost" to="/formulas">
              <Icon name="formula" size={17} /> Formula sheet
            </Link>
          </div>
          <div className="hero-meta">
            <span>
              <Icon name="book" size={14} /> 11 pages
            </span>
            <span>
              <Icon name="notes" size={14} /> {NOTE_SECTIONS.length} note sections
            </span>
            <span>
              <Icon name="quiz" size={14} /> {QUESTIONS.length} practice questions
            </span>
            <span>
              <Icon name="cards" size={14} /> {FLASHCARDS.length} flashcards
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-chip animate-float">
            <div className="hero-chip-top">
              <span className="hero-chip-pin-row">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span key={index} />
                ))}
              </span>
            </div>
            <div className="hero-chip-body">
              <span className="hero-chip-core">
                <Icon name="chip" size={44} />
              </span>
              <span className="hero-chip-label">EMBEDDED</span>
            </div>
            <div className="hero-chip-bottom">
              <span className="hero-chip-pin-row">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span key={index} />
                ))}
              </span>
            </div>
          </div>
          <div className="hero-float hero-float-a">
            <Icon name="bolt" size={15} /> Real-time
          </div>
          <div className="hero-float hero-float-b">
            <Icon name="target" size={15} /> Dedicated function
          </div>
          <div className="hero-float hero-float-c">
            <Icon name="code" size={15} /> Firmware
          </div>
        </div>
      </section>

      <section className="stats-grid animate-content-reveal stagger-2" aria-label="Progress summary">
        <StatCard
          label="Study units reviewed"
          value={
            <>
              {completed}
              <span className="stat-value-fraction">/{totalModules}</span>
            </>
          }
          hint={`${Math.round((completed / totalModules) * 100)}% of the reviewer marked complete`}
          icon="progress"
        />
        <StatCard
          label="Flashcards known"
          value={
            <>
              {knownCards}
              <span className="stat-value-fraction">/{FLASHCARDS.length}</span>
            </>
          }
          hint={`${reviewedCards} cards reviewed so far`}
          icon="cards"
        />
        <StatCard
          label="Quiz average"
          value={summary.averagePercent === null ? '—' : formatPercent(summary.averagePercent)}
          hint={
            summary.attempts === 0
              ? 'No quiz attempts yet'
              : `${summary.attempts} attempt${summary.attempts === 1 ? '' : 's'} recorded`
          }
          icon="target"
        />
        <StatCard
          label="Questions answered"
          value={summary.totalQuestions}
          hint={
            summary.totalQuestions === 0
              ? 'Start a quiz to build your history'
              : `${summary.totalCorrect} correct across all attempts`
          }
          icon="quiz"
        />
      </section>

      <div className="dashboard-grid animate-content-reveal stagger-3">
        <Card className="dashboard-modules">
          <div className="card-heading">
            <div>
              <div className="eyebrow">Coverage</div>
              <h2>All five modules, plus both labs</h2>
            </div>
            <span className="muted-count">{totalModules} study units</span>
          </div>
          <div className="module-list">
            {MODULES.map((module) => {
              const isComplete = progress.completedModules.includes(module.id);
              const sectionCount = NOTE_SECTIONS.filter(
                (section) => section.moduleId === module.id,
              ).length;
              const questionCount = QUESTIONS.filter(
                (question) => question.moduleId === module.id,
              ).length;
              const cardCount = FLASHCARDS.filter((card) => card.moduleId === module.id).length;
              return (
                <article
                  key={module.id}
                  className={`module-row ${isComplete ? 'is-complete' : ''} accent-border-${module.accent}`}
                >
                  <div className="module-row-main">
                    <div className="module-row-top">
                      <ModuleBadge moduleId={module.id} />
                      {module.priority ? <span className="priority-pill">Exam priority</span> : null}
                      {isComplete ? (
                        <span className="complete-pill">
                          <Icon name="check" size={12} /> Reviewed
                        </span>
                      ) : null}
                    </div>
                    <h3>
                      <Link to={`/notes?module=${module.id}`}>{module.title}</Link>
                    </h3>
                    <p>{module.subtitle}</p>
                    <div className="module-row-meta">
                      <SourceRef page={module.pages} />
                      <span>{sectionCount} note sections</span>
                      <span>{questionCount} questions</span>
                      <span>{cardCount} cards</span>
                    </div>
                  </div>
                  <div className="module-row-actions">
                    <Link className="btn btn-small btn-secondary" to={`/notes?module=${module.id}`}>
                      Study notes
                    </Link>
                    <button
                      type="button"
                      className={`btn btn-small ${isComplete ? 'btn-ghost' : 'btn-ghost'}`}
                      aria-pressed={isComplete}
                      onClick={() => toggleModule(module.id)}
                    >
                      <Icon name={isComplete ? 'check' : 'target'} size={14} />
                      {isComplete ? 'Mark unreviewed' : 'Mark reviewed'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>

        <div className="dashboard-side animate-content-reveal stagger-4">
          <Card className="quick-access">
            <div className="card-heading compact">
              <div>
                <div className="eyebrow">Jump back in</div>
                <h2>Quick access</h2>
              </div>
            </div>
            <Link className="quick-link quick-formula" to="/formulas">
              <span className="quick-icon">
                <Icon name="formula" size={20} />
              </span>
              <span>
                <strong>Formula practice</strong>
                <span>All 10 formulas with calculators and worked examples.</span>
              </span>
              <Icon name="arrow-right" size={17} />
            </Link>
            <Link className="quick-link quick-smartled" to="/lab#lab-smartled">
              <span className="quick-icon">
                <Icon name="flask" size={20} />
              </span>
              <span>
                <strong>Smart LED Alert System</strong>
                <span>States, buttons, INPUT_PULLUP, and delay vs. millis.</span>
              </span>
              <Icon name="arrow-right" size={17} />
            </Link>
            <Link className="quick-link quick-temperature" to="/lab#lab-temperature">
              <span className="quick-icon">
                <Icon name="bolt" size={20} />
              </span>
              <span>
                <strong>Temperature Monitoring</strong>
                <span>TMP36 voltage, ADC conversion, and the 30°C threshold.</span>
              </span>
              <Icon name="arrow-right" size={17} />
            </Link>
            <Link className="quick-link quick-quiz" to="/quiz?scope=m4a">
              <span className="quick-icon">
                <Icon name="quiz" size={20} />
              </span>
              <span>
                <strong>Lab-focused quiz</strong>
                <span>Extra practice on the programming portion.</span>
              </span>
              <Icon name="arrow-right" size={17} />
            </Link>
          </Card>

          <Card className="weak-panel">
            <div className="card-heading compact">
              <div>
                <div className="eyebrow">From your activity</div>
                <h2>Review next</h2>
              </div>
              <Link to="/progress" className="text-link">
                Progress
              </Link>
            </div>
            {weakTopics.length === 0 ? (
              <EmptyState icon="target" title="No weak topics yet">
                <p>
                  Finish a quiz and this panel will recommend topics based only on the questions
                  you missed.
                </p>
              </EmptyState>
            ) : (
              <ul className="weak-topic-list">
                {weakTopics.map((topic) => (
                  <li key={topic.topic}>
                    <div>
                      <strong>{topic.topic}</strong>
                      <span>
                        {topic.misses} missed · {MODULE_MAP[topic.moduleId].code}
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
            {lastAttempt ? (
              <div className="last-attempt">
                <span className="last-attempt-label">Last quiz</span>
                <div>
                  <strong>
                    {scopeLabel(lastAttempt.scope)} · {lastAttempt.correct}/{lastAttempt.total}
                  </strong>
                  <span>{formatDateTime(lastAttempt.finishedAt ?? lastAttempt.startedAt)}</span>
                </div>
                <span className="score-pill">
                  {formatPercent((lastAttempt.correct / Math.max(1, lastAttempt.total)) * 100)}
                </span>
              </div>
            ) : null}
          </Card>

          <Card className="source-boundary">
            <span className="source-boundary-icon">
              <Icon name="book" size={20} />
            </span>
            <div>
              <h3>One source of truth</h3>
              <p>
                This site uses only the attached 11-page reviewer. Where the PDF does not specify a
                detail — such as exact LED blink intervals — the interface says so instead of
                inventing one.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card className="study-flow animate-content-reveal stagger-5">
        <div className="card-heading">
          <div>
            <div className="eyebrow">A simple study loop</div>
            <h2>Read, visualize, then test yourself</h2>
          </div>
          <Link to="/notes" className="text-link">
            Open study notes <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        <div className="study-steps">
          <Link to="/notes" className="study-step">
            <span className="study-step-number">01</span>
            <Icon name="notes" size={22} />
            <strong>Study the notes</strong>
            <span>Complete coverage of Modules 1–5 with source-page labels.</span>
          </Link>
          <Link to="/lab" className="study-step">
            <span className="study-step-number">02</span>
            <Icon name="flask" size={22} />
            <strong>Use the Concept Lab</strong>
            <span>Step through code, timing, PWM, ADC, and both lab simulators.</span>
          </Link>
          <Link to="/flashcards" className="study-step">
            <span className="study-step-number">03</span>
            <Icon name="cards" size={22} />
            <strong>Flip the flashcards</strong>
            <span>Mark each card “Know it” or “Review again” to focus your time.</span>
          </Link>
          <Link to="/quiz" className="study-step">
            <span className="study-step-number">04</span>
            <Icon name="quiz" size={22} />
            <strong>Take a quiz</strong>
            <span>Use missed-question review to close the gaps.</span>
          </Link>
        </div>
      </Card>

      <div className="dashboard-bottom-note animate-content-reveal stagger-6">
        <ProgressBar value={completed} max={totalModules} label="Study units reviewed" />
        <span>
          {completed === totalModules
            ? 'All study units are marked reviewed. Keep practicing with mixed quizzes.'
            : `${totalModules - completed} study units remain. Mark a module reviewed from its notes page or the module list above.`}
        </span>
        <Link to="/progress" className="text-link">
          View full progress <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </div>
  );
}
