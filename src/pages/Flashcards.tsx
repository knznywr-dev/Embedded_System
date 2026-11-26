import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Card, EmptyState, ModuleBadge, PageHeader, ProgressBar, SourceRef } from '../components/ui';
import { FLASHCARDS } from '../data/flashcards';
import { MODULES, type ModuleId } from '../data/modules';
import { useStudyData } from '../state/StudyDataContext';
import type { FlashcardStatus } from '../types';

type ModuleFilter = ModuleId | 'all';
type StatusFilter = 'all' | 'known' | 'review' | 'unseen';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All cards',
  unseen: 'Not marked',
  review: 'Review again',
  known: 'Known',
};

function shuffleIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function FlashcardsPage() {
  const { flashcards, setFlashcardStatus, resetFlashcards } = useStudyData();
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [order, setOrder] = useState<string[]>(() => FLASHCARDS.map((card) => card.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filtered = useMemo(() => {
    const byId = new Map(FLASHCARDS.map((card) => [card.id, card]));
    return order
      .map((id) => byId.get(id))
      .filter((card): card is (typeof FLASHCARDS)[number] => {
        if (!card) return false;
        if (moduleFilter !== 'all' && card.moduleId !== moduleFilter) return false;
        const status = flashcards[card.id];
        if (statusFilter === 'unseen') return !status;
        if (statusFilter === 'known') return status === 'known';
        if (statusFilter === 'review') return status === 'review';
        return true;
      });
  }, [order, moduleFilter, statusFilter, flashcards]);

  const safeIndex = Math.min(index, Math.max(0, filtered.length - 1));
  const card = filtered[safeIndex];

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [moduleFilter, statusFilter]);

  useEffect(() => {
    if (index > filtered.length - 1) setIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, index]);

  const known = FLASHCARDS.filter((item) => flashcards[item.id] === 'known').length;
  const review = FLASHCARDS.filter((item) => flashcards[item.id] === 'review').length;
  const seen = known + review;

  const go = (delta: number) => {
    if (filtered.length === 0) return;
    setFlipped(false);
    setIndex((current) => (current + delta + filtered.length) % filtered.length);
  };

  const mark = (status: FlashcardStatus) => {
    if (!card) return;
    setFlashcardStatus(card.id, status);
    setFlipped(false);
    window.setTimeout(() => {
      setIndex((current) => (filtered.length <= 1 ? 0 : (current + 1) % filtered.length));
    }, 120);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      }
      if (event.key.toLowerCase() === 'k' && flipped) {
        mark('known');
      }
      if (event.key.toLowerCase() === 'r' && flipped) {
        mark('review');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className=”page flashcards-page animate-page-enter”>
      <PageHeader
        eyebrow={
          <>
            <Icon name=”cards” size={14} /> Active recall
          </>
        }
        title=”Flashcards”
        description=”Flip each card, then mark it “Know it” or “Review again”. Your marks are saved in this browser and drive the counts on the dashboard and progress page.”
        actions={
          <>
            <button
              type=”button”
              className=”btn btn-secondary”
              onClick={() => {
                setOrder(shuffleIds(FLASHCARDS.map((item) => item.id)));
                setIndex(0);
                setFlipped(false);
              }}
            >
              <Icon name=”shuffle” size={16} /> Shuffle
            </button>
            <Link className=”btn btn-primary” to=”/quiz?scope=mixed”>
              <Icon name=”quiz” size={16} /> Quiz me
            </Link>
          </>
        }
      />

      <div className=”flashcard-stats animate-content-reveal stagger-1”>
        <div className="flashcard-stat">
          <span>Known</span>
          <strong>{known}</strong>
          <small>of {FLASHCARDS.length}</small>
        </div>
        <div className="flashcard-stat">
          <span>Review again</span>
          <strong>{review}</strong>
        </div>
        <div className="flashcard-stat">
          <span>Not marked</span>
          <strong>{FLASHCARDS.length - seen}</strong>
        </div>
        <div className="flashcard-stat flashcard-stat-progress">
          <span>Deck progress</span>
          <ProgressBar
            value={known}
            max={FLASHCARDS.length}
            label="Flashcards marked known"
            tone="success"
          />
          <small>
            {Math.round((known / FLASHCARDS.length) * 100)}% marked known · {seen} reviewed
          </small>
        </div>
      </div>

      <Card className="flashcard-controls animate-content-reveal stagger-2">
        <div className="flashcard-filter-row">
          <label className="field compact-field">
            <span className="field-label">Module</span>
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value as ModuleFilter)}
            >
              <option value="all">All modules</option>
              {MODULES.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} · {module.shortTitle}
                </option>
              ))}
            </select>
          </label>
          <div className="status-tabs" role="group" aria-label="Filter by card status">
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                className={`chip-button ${statusFilter === status ? 'is-active' : ''}`}
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-small flashcard-reset"
            onClick={() => {
              if (window.confirm('Reset every flashcard mark in this browser?')) {
                resetFlashcards();
                setIndex(0);
                setFlipped(false);
              }
            }}
          >
            <Icon name="trash" size={14} /> Reset marks
          </button>
        </div>
        <div className="flashcard-count">
          {filtered.length} card{filtered.length === 1 ? '' : 's'} in this view
        </div>
      </Card>

      {!card ? (
        <EmptyState
          icon="cards"
          title="No cards in this view"
          action={
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                setModuleFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </button>
          }
        >
          <p>Try another module or status filter.</p>
        </EmptyState>
      ) : (
        <>
          <div className="flashcard-stage animate-content-reveal stagger-3">
          <div className="flashcard-stage">
            <button
              type="button"
              className={`flashcard ${flipped ? 'is-flipped' : ''}`}
              onClick={() => setFlipped((value) => !value)}
              aria-label={flipped ? 'Hide answer' : 'Show answer'}
            >
              <span className="flashcard-meta">
                <ModuleBadge moduleId={card.moduleId} />
                <span className="flashcard-topic">{card.topic}</span>
                <SourceRef page={card.page} />
              </span>
              <span className="flashcard-content">
                {flipped ? (
                  <span className="flashcard-back">
                    <span className="flashcard-side-label">Answer</span>
                    <span className="flashcard-answer">{card.back}</span>
                  </span>
                ) : (
                  <span className="flashcard-front">
                    <span className="flashcard-side-label">Question</span>
                    <span className="flashcard-question">{card.front}</span>
                  </span>
                )}
              </span>
              <span className="flashcard-hint">
                <Icon name={flipped ? 'refresh' : 'bulb'} size={15} />
                {flipped ? 'Click to hide the answer' : 'Click to reveal the answer'}
              </span>
              {flashcards[card.id] ? (
                <span className={`flashcard-status-tag status-${flashcards[card.id]}`}>
                  {flashcards[card.id] === 'known' ? 'Known' : 'Review again'}
                </span>
              ) : null}
            </button>
          </div>

          <div className="flashcard-actions">
            <button type="button" className="btn btn-secondary" onClick={() => go(-1)}>
              <Icon name="arrow-left" size={16} /> Previous
            </button>
            <div className="flashcard-mark-actions">
              <button
                type="button"
                className="btn btn-review"
                onClick={() => mark('review')}
                disabled={!flipped}
                title={flipped ? 'Mark for review' : 'Reveal the answer first'}
              >
                <Icon name="refresh" size={16} /> Review again
              </button>
              <button
                type="button"
                className="btn btn-know"
                onClick={() => mark('known')}
                disabled={!flipped}
                title={flipped ? 'Mark as known' : 'Reveal the answer first'}
              >
                <Icon name="check" size={16} /> Know it
              </button>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => go(1)}>
              Next <Icon name="arrow-right" size={16} />
            </button>
          </div>

          <div className="flashcard-position">
            <div className="flashcard-position-bar">
              <span style={{ width: `${((safeIndex + 1) / filtered.length) * 100}%` }} />
            </div>
            <span>
              Card {safeIndex + 1} of {filtered.length}
            </span>
            <span className="flashcard-shortcuts">
              <kbd>Space</kbd> flip <kbd>←</kbd> <kbd>→</kbd> navigate{' '}
              <kbd>K</kbd> known <kbd>R</kbd> review
            </span>
          </div>
        </>
      )}
    </div>
  );
}
