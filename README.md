# Embedded Reviewer — BSCpE 4 Final Examination

An interactive, offline-friendly study website for the **Embedded Systems – BSCpE 4 Final Examination**. It is built only from the attached 11-page `REVIEWER-FOR-THE-FINAL-EXAMINATION.pdf`, with every academic section carrying a reviewer page reference.

## Run it

```bash
npm install
npm run dev        # local development server
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm test           # 50 unit tests
```

Requires Node.js 18+ (developed with Node 20). The app uses `HashRouter`, so the built `dist/` folder can also be hosted as plain static files with no server rewrite rules.

## What is included

| Route | Purpose |
| --- | --- |
| `/#/` | Dashboard: module map, priorities, quick links, recent quiz results, weak topics |
| `/#/notes` | Study Notes: all six modules, 46 sections, source pages, search within notes, mark-reviewed |
| `/#/lab` | Concept Lab: 13 interactions labelled A–M |
| `/#/flashcards` | Flashcards: flip, previous/next, shuffle, filters, know/review tracking |
| `/#/quiz` | Practice Quiz: 161 grounded questions, module and mixed scopes, results and review |
| `/#/formulas` | Formula Practice: all 10 formulas with live calculators, validation, and substitution steps |
| `/#/progress` | Local progress, per-module accuracy, quiz history, weak topics, missed-question queue, reset |

Global search is available from the top bar (press `/` to focus it) and searches notes, formulas, labs, and questions.

## Source boundary

The reviewer PDF is the only academic source. The site:

- preserves the reviewer's terminology, examples, pins, thresholds, units, formulas, and code;
- labels unspecified details with **“Not specified in the reviewer”** rather than inventing values;
- uses illustrative blink timing and power visuals while explicitly saying the PDF gives no exact intervals or power measurements;
- keeps the **ideal ADC resolution formula** `Vref / 2^N` separate from the **Arduino Uno activity conversion** `ADC × (5.0 / 1023.0)`;
- shows the buzzer as a status only — no audio is played.

## Key content checks

- Smart LED pins: Green D8, Yellow D9, Red D10, Mode D2, Acknowledge D3, 220 Ω per external LED.
- Smart LED ACK only works in WARNING, **does not clear the warning condition**, and is cleared when leaving WARNING.
- `INPUT_PULLUP`: unpressed = HIGH, pressed = LOW.
- Temperature warning uses `temperature >= 30.0`, so exactly 30°C triggers the warning.
- `delay(1000)` blocks for one second; `millis()` measures elapsed time and is non-blocking.
- A longer `delay()` does not automatically mean lower power.
- Temperature pins: TMP36 +Vs → 5V, Vout → A0, GND → GND; LED → D9 through 220 Ω; buzzer → D8.
- Formula list and units match reviewer p. 11 exactly.

## Architecture

```text
src/
  components/       Layout, global search, shared UI primitives, icons
  data/             Typed reviewer content: modules, notes, formulas, labs,
                    flashcards (133), questions (161), search index
  features/
    calculators/    Ten formula calculators + ADC integer-division explainer
    lab/            Interactive demos A–M
  lib/              Pure logic: formulas, quiz scoring/sampling, storage,
                    Smart LED state machine, search
  pages/            Dashboard, Notes, Concept Lab, Flashcards, Quiz,
                    Formula Practice, Progress
  state/            React context with local-storage persistence and cross-tab sync
  styles/           Light academic-tech design system; tokens, motion, responsive rules
```

Academic data is separated from UI so answers and page references stay auditable. Quiz answers are never shown before submission: either feedback is held until the end (default), or a self-paced question must be submitted before its own feedback appears. There is no invented exam timer.

The interface uses one shared token layer (colour, spacing, radii, shadows, type scale, motion), subtle page/section entrances, hover and press feedback, and compact mobile navigation. All motion is CSS-only and is disabled under `prefers-reduced-motion`. There are no external fonts, images, or UI libraries.

## Tests

`npm test` runs 5 suites / 50 tests covering:

- all timing, ADC, PWM, TMP36, and Uno voltage formulas;
- the 30°C `>=` boundary;
- quiz answer evaluation for every question kind;
- deterministic sampling, scoring, weak topics, and missed-question repair;
- local-storage sanitization and failure handling;
- Smart LED transitions, ACK semantics, and `INPUT_PULLUP` readings;
- content integrity: question counts, valid answer indexes, note links, formula and flashcard coverage.

Verified results at build time:

```text
Test Files  5 passed (5)
Tests       50 passed (50)
Build       73 modules transformed
CSS         165.11 kB (23.35 kB gzip)
JS          493.89 kB (136.49 kB gzip)
```

## Accessibility and privacy

- Keyboard-operable controls, visible focus rings, skip link, ARIA labels/live regions, and semantic tables/tabs.
- Responsive layout: full sidebar on desktop, drawer plus bottom navigation on mobile.
- `prefers-reduced-motion` disables animations and smooth scrolling.
- No external fonts, images, APIs, analytics, or backend. Progress, flashcard marks, and quiz history live in this browser's `localStorage` and can be reset from Progress. Cross-tab updates sync through the `storage` event.

## Known limitations

- Storage is browser-local: clearing browser data or switching devices loses progress.
- Simulations are teaching visuals, not hardware emulators. Exact blink intervals, WARNING patterns, power draw, and wake-up times are **not specified in the reviewer**.
- The temperature buzzer is represented visually at the reviewer's 1000 Hz; no tone is played.
- Quiz questions are limited to material stated in the 11-page PDF; topics the PDF omits are not tested as facts.
- The reviewer does not specify an exam duration, so no countdown timer is presented.
