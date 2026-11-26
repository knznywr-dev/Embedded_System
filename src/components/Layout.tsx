import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { GlobalSearch } from './GlobalSearch';
import { ProgressBar } from './ui';
import { MODULES } from '../data/modules';
import { useStudyData } from '../state/StudyDataContext';

const NAV_ITEMS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/notes', label: 'Study Notes', icon: 'notes' },
  { to: '/lab', label: 'Concept Lab', icon: 'flask' },
  { to: '/flashcards', label: 'Flashcards', icon: 'cards' },
  { to: '/quiz', label: 'Practice Quiz', icon: 'quiz' },
  { to: '/formulas', label: 'Formula Practice', icon: 'formula' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
];

const BOTTOM_NAV_ITEMS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/notes', label: 'Notes', icon: 'notes' },
  { to: '/lab', label: 'Lab', icon: 'flask' },
  { to: '/quiz', label: 'Quiz', icon: 'quiz' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/notes': 'Study Notes',
  '/lab': 'Concept Lab',
  '/flashcards': 'Flashcards',
  '/quiz': 'Practice Quiz',
  '/formulas': 'Formula Practice',
  '/progress': 'Progress',
};

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={19} />
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { progress } = useStudyData();
  const completed = progress.completedModules.length;
  const total = MODULES.length;

  return (
    <div className="sidebar-inner">
      <NavLink to="/" className="brand" onClick={onNavigate} aria-label="Embedded Reviewer dashboard">
        <span className="brand-mark">
          <Icon name="chip" size={23} />
        </span>
        <span className="brand-copy">
          <strong>Embedded Reviewer</strong>
          <span>BSCpE 4 · Final Exam</span>
        </span>
      </NavLink>

      <div className="sidebar-section-label">Study</div>
      <NavItems onNavigate={onNavigate} />

      <div className="sidebar-progress">
        <div className="sidebar-progress-top">
          <span>Study progress</span>
          <strong>
            {completed}/{total}
          </strong>
        </div>
        <ProgressBar value={completed} max={total} label="Study units reviewed" />
        <p>{total - completed} study units left to mark reviewed.</p>
      </div>

      <div className="sidebar-source">
        <Icon name="book" size={14} />
        <span>
          Built only from the 11-page reviewer. Every note, card, and question carries a page
          reference.
        </span>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const { setLastRoute } = useStudyData();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pageTransitionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastRoute(`${location.pathname}${location.hash}`);
  }, [location.pathname, location.hash, setLastRoute]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    setIsNavigating(navigation.state === 'loading');
  }, [navigation.state]);

  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        const input = document.querySelector<HTMLInputElement>('#global-search-input');
        if (input) {
          event.preventDefault();
          input.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Embedded Reviewer';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className="sidebar" aria-label="Sidebar">
        <SidebarContent />
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menuButtonRef}
              type="button"
              className="icon-button mobile-menu-button"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="menu" size={22} />
            </button>
            <span className="topbar-page-title">{pageTitle}</span>
          </div>
          <GlobalSearch />
          <div className="topbar-meta">
            <span className="pdf-chip">
              <Icon name="book" size={14} />
              PDF · 11 pages
            </span>
          </div>
        </header>

        {/* Page transition progress bar */}
        {isNavigating && (
          <div className="page-transition-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-label="Page loading">
            <div className="page-transition-bar-fill" />
          </div>
        )}

        <main id="main-content" className="main-content" tabIndex={-1}>
          <div ref={pageTransitionRef} className="page-transition-wrapper animate-page-enter">
            {children}
          </div>
        </main>

        <footer className="site-footer">
          <span>
            <Icon name="book" size={14} /> Study aid for the Embedded Systems BSCpE 4 final
            examination.
          </span>
          <span>All academic content is limited to the attached 11-page reviewer PDF.</span>
        </footer>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-link ${isActive ? 'is-active' : ''}`}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {drawerOpen ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerOpen(false)}>
          <div
            id="mobile-drawer"
            className="drawer animate-slide-in-right"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-head">
              <span>Navigation</span>
              <button
                ref={closeButtonRef}
                type="button"
                className="icon-button"
                aria-label="Close navigation menu"
                onClick={() => {
                  setDrawerOpen(false);
                  menuButtonRef.current?.focus();
                }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
