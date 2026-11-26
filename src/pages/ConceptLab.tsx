import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Callout, Card, PageHeader, SourceRef } from '../components/ui';
import { ComparisonDemo } from '../features/lab/ComparisonDemo';
import { CharacteristicsExplorer } from '../features/lab/CharacteristicsExplorer';
import { ArduinoFlowDemo } from '../features/lab/ArduinoFlowDemo';
import { BuildProcessStepper } from '../features/lab/BuildProcessStepper';
import { TimingMarginCalculator } from '../features/calculators';
import { RealTimeCompare } from '../features/lab/RealTimeCompare';
import { SleepModes } from '../features/lab/SleepModes';
import { PwmVisualizer } from '../features/lab/PwmVisualizer';
import { DataPipeline } from '../features/lab/DataPipeline';
import { SensorActuatorExplorer } from '../features/lab/SensorActuatorExplorer';
import { SmartLedSimulator } from '../features/lab/SmartLedSimulator';
import { TemperatureSimulator } from '../features/lab/TemperatureSimulator';
import { DebuggingPractice } from '../features/lab/DebuggingPractice';
import type { PageRef } from '../types';
import type { ReactNode } from 'react';

interface LabEntry {
  letter: string;
  id: string;
  title: string;
  description: string;
  page: PageRef;
  group: 'Foundations' | 'Programming' | 'Timing & signals' | 'Laboratory';
  render: () => ReactNode;
}

const ENTRIES: LabEntry[] = [
  {
    letter: 'A',
    id: 'lab-comparison',
    title: 'General-Purpose vs. Embedded',
    description:
      'Focus one side of the comparison and see the reviewer’s five properties line up.',
    page: 1,
    group: 'Foundations',
    render: () => <ComparisonDemo />,
  },
  {
    letter: 'B',
    id: 'lab-characteristics',
    title: 'Characteristics & Quality Attributes',
    description:
      'Explore the seven core characteristics, the ten quality attributes, and the operational / non-operational split.',
    page: [1, 2],
    group: 'Foundations',
    render: () => <CharacteristicsExplorer />,
  },
  {
    letter: 'C',
    id: 'lab-arduino-flow',
    title: 'Arduino Program Flow',
    description:
      'Step or play through setup(), loop(), digitalWrite(), and delay(1000) using the reviewer’s blink example.',
    page: [2, 3],
    group: 'Programming',
    render: () => <ArduinoFlowDemo />,
  },
  {
    letter: 'D',
    id: 'lab-build',
    title: 'Build & Flash Process',
    description:
      'Walk the six build stages from preprocessing to flashing firmware into flash memory.',
    page: 3,
    group: 'Programming',
    render: () => <BuildProcessStepper />,
  },
  {
    letter: 'E',
    id: 'lab-timing-margin',
    title: 'Timing Margin',
    description:
      'Calculate Deadline − Response Time, including the reviewer’s 10 ms / 7 ms example.',
    page: [4, 11],
    group: 'Timing & signals',
    render: () => <TimingMarginCalculator />,
  },
  {
    letter: 'F',
    id: 'lab-realtime',
    title: 'Hard vs. Soft Real-Time',
    description:
      'Compare what a missed deadline means in each class, using only the reviewer’s definitions and examples.',
    page: 4,
    group: 'Timing & signals',
    render: () => <RealTimeCompare />,
  },
  {
    letter: 'G',
    id: 'lab-sleep',
    title: 'Sleep & Low-Power Modes',
    description:
      'Move from Active to Standby and see what happens to the CPU, clocks, and wake-up behavior.',
    page: 4,
    group: 'Timing & signals',
    render: () => <SleepModes />,
  },
  {
    letter: 'H',
    id: 'lab-pwm',
    title: 'PWM Visualizer',
    description:
      'Enter ON time and period, then see the duty cycle, OFF time, and frequency on a waveform.',
    page: [5, 11],
    group: 'Timing & signals',
    render: () => <PwmVisualizer />,
  },
  {
    letter: 'I',
    id: 'lab-data',
    title: 'Data Acquisition Pipeline',
    description:
      'Step through the six acquisition stages, compare analog and digital signals, and review ADC codes and LSB.',
    page: 5,
    group: 'Timing & signals',
    render: () => <DataPipeline />,
  },
  {
    letter: 'J',
    id: 'lab-sensors',
    title: 'Sensors & Actuators',
    description:
      'Browse the reviewer’s six sensor and six actuator examples, then follow the sense → process → decide → act loop.',
    page: 6,
    group: 'Timing & signals',
    render: () => <SensorActuatorExplorer />,
  },
  {
    letter: 'K',
    id: 'lab-smartled',
    title: 'Smart LED Alert System',
    description:
      'Drive the documented state machine with the Mode and Acknowledge buttons, check INPUT_PULLUP readings, and explore blocking vs. non-blocking timing.',
    page: [6, 7],
    group: 'Laboratory',
    render: () => <SmartLedSimulator />,
  },
  {
    letter: 'L',
    id: 'lab-temperature',
    title: 'Temperature Monitoring & Alert',
    description:
      'Enter a temperature or an ADC reading and watch the LED, buzzer status, and exact Serial Monitor text at the 30°C threshold.',
    page: [8, 9, 10],
    group: 'Laboratory',
    render: () => <TemperatureSimulator />,
  },
  {
    letter: 'M',
    id: 'lab-debugging',
    title: 'Debugging Practice',
    description:
      'Match each reviewer symptom to the cause listed in the debugging table.',
    page: 10,
    group: 'Laboratory',
    render: () => <DebuggingPractice />,
  },
];

const GROUPS: LabEntry['group'][] = ['Foundations', 'Programming', 'Timing & signals', 'Laboratory'];

export function ConceptLabPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace(/^#/, '');
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page lab-page animate-page-enter">
      <PageHeader
        eyebrow={
          <>
            <Icon name="flask" size={14} /> Interactive demos · A–M
          </>
        }
        title="Concept Lab"
        description="Thirteen hands-on ways to work with the reviewer’s concepts. Each demo is built from the PDF and keeps its source pages visible. Where the PDF gives no exact value, the demo says so instead of guessing."
        actions={
          <>
            <Link className="btn btn-secondary" to="/notes">
              <Icon name="notes" size={16} /> Study notes
            </Link>
            <Link className="btn btn-primary" to="/quiz?scope=mixed">
              <Icon name="quiz" size={16} /> Practice quiz
            </Link>
          </>
        }
      />

      <div className="lab-layout animate-content-reveal stagger-1">
        <nav className="lab-nav" aria-label="Concept Lab sections">
          <div className="lab-nav-head">
            <Icon name="list" size={15} /> Demos
          </div>
          {GROUPS.map((group, groupIndex) => (
            <div className="lab-nav-group animate-content-reveal" key={group} style={{ animationDelay: `${(groupIndex + 1) * 100}ms` }}>
              <span>{group}</span>
              <ul>
                {ENTRIES.filter((entry) => entry.group === group).map((entry, entryIndex) => (
                  <li key={entry.id} style={{ animationDelay: `${entryIndex * 50}ms` }}>
                    <button type="button" onClick={() => scrollTo(entry.id)}>
                      <span className="lab-nav-letter">{entry.letter}</span>
                      {entry.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="lab-content animate-content-reveal stagger-2">
          <Callout tone="info" title="How to use this lab">
            <p>
              Start with a demo that matches the module you are reading. Every interaction is
              local — nothing is sent anywhere, and your quiz/flashcard progress is stored only in
              this browser.
            </p>
          </Callout>

          {GROUPS.map((group) => (
            <div className="lab-group" key={group}>
              <div className="lab-group-heading">
                <h2>{group}</h2>
                <span className="lab-group-line" />
              </div>
              {ENTRIES.filter((entry) => entry.group === group).map((entry) => (
                <Card as="section" className="lab-entry" key={entry.id}>
                  <div className="lab-entry-head" id={entry.id}>
                    <span className="lab-letter" aria-hidden="true">
                      {entry.letter}
                    </span>
                    <div className="lab-entry-copy">
                      <h3>{entry.title}</h3>
                      <p>{entry.description}</p>
                    </div>
                    <SourceRef page={entry.page} />
                  </div>
                  <div className="lab-entry-body">{entry.render()}</div>
                </Card>
              ))}
            </div>
          ))}

          <Callout tone="note" title="A note on invented details">
            <p>
              Simulations are teaching visuals, not additional specifications. Exact LED blink
              intervals, the WARNING pattern, power draw, and wake-up times are{' '}
              <strong>not specified in the reviewer</strong> and are not presented as facts here.
            </p>
          </Callout>
        </div>
      </div>
    </div>
  );
}
