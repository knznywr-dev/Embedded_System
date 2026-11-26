import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Callout,
  Card,
  MathText,
  ModuleBadge,
  PageHeader,
  ProgressBar,
  SourceRef,
} from '../components/ui';
import { MODULES, type ModuleId } from '../data/modules';
import { NOTE_SECTION_MAP, NOTE_SECTIONS, noteSearchText } from '../data/notes';
import type { NoteBlock, NoteSection } from '../types';
import { useStudyData } from '../state/StudyDataContext';

function BlockRenderer({ block }: { block: NoteBlock }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>;
    case 'list':
      return block.ordered ? (
        <ol className="note-list">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="note-list">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption ? <p className="table-caption">{block.caption}</p> : null}
        </div>
      );
    case 'code':
      return (
        <div className="code-block">
          {block.caption ? <div className="code-caption">{block.caption}</div> : null}
          <pre>
            <code>{block.code}</code>
          </pre>
        </div>
      );
    case 'callout':
      return (
        <Callout tone={block.tone} title={block.title}>
          {block.text ? <p>{block.text}</p> : null}
          {block.items ? (
            <ul className="note-list">
              {block.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : null}
        </Callout>
      );
    case 'definition':
      return (
        <div className="definition-block">
          <span className="definition-term">{block.term}</span>
          <p>{block.text}</p>
        </div>
      );
    case 'steps':
      return (
        <div className="steps-block">
          {block.title ? <h4>{block.title}</h4> : null}
          {block.ordered ? (
            <ol className="note-steps">
              {block.items.map((item, index) => (
                <li key={index}>
                  <span className="step-marker">{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.text ? <p>{item.text}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="note-steps note-steps-plain">
              {block.items.map((item, index) => (
                <div className="note-step-row" key={index}>
                  <span className="step-marker">{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.text ? <p>{item.text}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case 'compare':
      return (
        <div className="compare-table">
          <div className="compare-head">
            <span />
            <strong>{block.leftTitle}</strong>
            <strong>{block.rightTitle}</strong>
          </div>
          {block.rows.map((row) => (
            <div className="compare-row" key={row.label}>
              <span className="compare-label">{row.label}</span>
              <span>{row.left}</span>
              <span className="compare-right">{row.right}</span>
            </div>
          ))}
        </div>
      );
    case 'formula':
      return (
        <div className="formula-block">
          <Icon name="formula" size={17} />
          <MathText text={block.expression} />
          {block.caption ? <span className="formula-caption">{block.caption}</span> : null}
        </div>
      );
  }
}

function SectionCard({ section }: { section: NoteSection }) {
  return (
    <Card as="article" className="note-section" >
      <div className="note-section-head">
        <h3 id={`note-${section.id}`}>{section.title}</h3>
        <SourceRef page={section.page} />
      </div>
      <div className="note-section-body">
        {section.blocks.map((block, index) => (
          <BlockRenderer key={index} block={block} />
        ))}
      </div>
    </Card>
  );
}

export function NotesPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { progress, toggleModule } = useStudyData();
  const requestedModule = searchParams.get('module');
  const initialModule =
    requestedModule && MODULES.some((module) => module.id === requestedModule)
      ? (requestedModule as ModuleId)
      : 'm1';
  const [selectedModule, setSelectedModule] = useState<ModuleId | 'all'>(initialModule);
  const [query, setQuery] = useState('');

  const hashId = location.hash.startsWith('#note-') ? location.hash.slice('#note-'.length) : '';

  useEffect(() => {
    if (requestedModule && MODULES.some((module) => module.id === requestedModule)) {
      setSelectedModule(requestedModule as ModuleId);
    }
  }, [requestedModule]);

  useEffect(() => {
    if (!hashId) return;
    const section = NOTE_SECTION_MAP[hashId];
    if (!section) return;
    setSelectedModule(section.moduleId);
    setQuery('');
  }, [hashId]);

  useEffect(() => {
    if (!hashId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`note-${hashId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [hashId, selectedModule]);

  const filteredSections = useMemo(() => {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    return NOTE_SECTIONS.filter((section) => {
      if (selectedModule !== 'all' && section.moduleId !== selectedModule) return false;
      if (tokens.length === 0) return true;
      const text = noteSearchText(section).toLowerCase();
      return tokens.every((token) => text.includes(token));
    });
  }, [selectedModule, query]);

  const grouped = useMemo(() => {
    const map = new Map<ModuleId, NoteSection[]>();
    for (const section of filteredSections) {
      const list = map.get(section.moduleId) ?? [];
      list.push(section);
      map.set(section.moduleId, list);
    }
    return map;
  }, [filteredSections]);

  const modulesToShow =
    selectedModule === 'all' ? MODULES : MODULES.filter((module) => module.id === selectedModule);
  const completed = progress.completedModules.length;

  return (
    <div className="page notes-page animate-page-enter">
      <PageHeader
        eyebrow={
          <>
            <Icon name="notes" size={14} /> Complete reviewer
          </>
        }
        title="Study Notes"
        description="Every topic from Modules 1–5, including both laboratory activities. Filter by module or search the notes; each section keeps its source-page reference."
        actions={
          <>
            <Link className="btn btn-secondary" to="/formulas">
              <Icon name="formula" size={16} /> Formula sheet
            </Link>
            <Link className="btn btn-primary" to="/quiz?scope=mixed">
              <Icon name="quiz" size={16} /> Quiz me
            </Link>
          </>
        }
      />

      <Card className="notes-controls animate-content-reveal stagger-1">
        <div className="module-tabs" role="tablist" aria-label="Filter notes by module">
          <button
            type="button"
            role="tab"
            aria-selected={selectedModule === 'all'}
            className={`module-tab ${selectedModule === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedModule('all')}
          >
            All modules
          </button>
          {MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              role="tab"
              aria-selected={selectedModule === module.id}
              className={`module-tab ${selectedModule === module.id ? 'is-active' : ''} accent-tab-${module.accent}`}
              onClick={() => setSelectedModule(module.id)}
            >
              {module.code}
            </button>
          ))}
        </div>
        <div className="notes-filter-row">
          <label className="input-with-icon notes-filter">
            <Icon name="search" size={17} />
            <input
              type="search"
              value={query}
              placeholder="Filter these notes…"
              aria-label="Filter study notes"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="input-clear"
                aria-label="Clear notes filter"
                onClick={() => setQuery('')}
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
          </label>
          <span className="filter-count">
            {filteredSections.length} section{filteredSections.length === 1 ? '' : 's'}
          </span>
          <span className="notes-progress-chip">
            <Icon name="check" size={14} /> {completed}/{MODULES.length} units reviewed
          </span>
        </div>
      </Card>

      <div className="notes-layout animate-content-reveal stagger-2">
        <div className="notes-content">
          {filteredSections.length === 0 ? (
            <Card>
              <div className="empty-state">
                <span className="empty-state-icon">
                  <Icon name="search" size={24} />
                </span>
                <div>
                  <h3>No notes match “{query}”</h3>
                  <p className="empty-state-copy">
                    Try a shorter term, clear the filter, or switch to “All modules”.
                  </p>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => setQuery('')}>
                    Clear filter
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            modulesToShow.map((module) => {
              const sections = grouped.get(module.id) ?? [];
              if (sections.length === 0) return null;
              const isComplete = progress.completedModules.includes(module.id);
              return (
                <section key={module.id} className="module-notes-group" id={`module-${module.id}`}>
                  <div className={`module-group-head accent-bg-${module.accent}`}>
                    <div>
                      <div className="module-group-top">
                        <ModuleBadge moduleId={module.id} />
                        {module.priority ? <span className="priority-pill">Exam priority</span> : null}
                      </div>
                      <h2>{module.title}</h2>
                      <p>{module.subtitle}</p>
                      <SourceRef page={module.pages} />
                    </div>
                    <div className="module-group-actions">
                      <button
                        type="button"
                        className={`btn btn-small ${isComplete ? 'btn-ghost' : 'btn-secondary'}`}
                        aria-pressed={isComplete}
                        onClick={() => toggleModule(module.id)}
                      >
                        <Icon name={isComplete ? 'check' : 'target'} size={14} />
                        {isComplete ? 'Reviewed' : 'Mark reviewed'}
                      </button>
                      <Link className="btn btn-small btn-ghost" to={`/quiz?scope=${module.id}`}>
                        <Icon name="quiz" size={14} /> Practice
                      </Link>
                    </div>
                  </div>
                  <div className="module-sections">
                    {sections.map((section) => (
                      <SectionCard key={section.id} section={section} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <aside className="notes-toc" aria-label="On this page">
          <div className="toc-card">
            <div className="toc-head">
              <Icon name="list" size={16} /> On this page
            </div>
            {modulesToShow.map((module) => {
              const sections = grouped.get(module.id) ?? [];
              if (sections.length === 0) return null;
              return (
                <div key={module.id} className="toc-group">
                  <button
                    type="button"
                    className="toc-module"
                    onClick={() =>
                      document.getElementById(`module-${module.id}`)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                  >
                    {module.code}
                  </button>
                  <ul>
                    {sections.map((section) => (
                      <li key={section.id}>
                        <Link to={`/notes#note-${section.id}`}>{section.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="toc-card toc-progress">
            <div className="toc-head">Module progress</div>
            <ProgressBar value={completed} max={MODULES.length} label="Study units reviewed" />
            <p>{MODULES.length - completed} units left to mark reviewed.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
