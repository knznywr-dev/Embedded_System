import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { SourceRef } from '../../components/ui';
import {
  INITIAL_SMART_LED_STATE,
  documentedIndicator,
  pressAcknowledge,
  pressMode,
  pullupReading,
  visibleState,
  warningConditionActive,
} from '../../lib/smartLed';
import type { SmartLedState } from '../../lib/smartLed';
import { SMART_LED_STATE_ROWS } from '../../data/labs';
import { BlockingTimingDemo } from './BlockingTimingDemo';

export function SmartLedSimulator() {
  const [state, setState] = useState<SmartLedState>(INITIAL_SMART_LED_STATE);
  const [message, setMessage] = useState('Press the Mode button to move NORMAL → CAUTION → WARNING → NORMAL.');
  const [modePressed, setModePressed] = useState(false);
  const [ackPressed, setAckPressed] = useState(false);

  const visible = visibleState(state);
  const indicator = documentedIndicator(visible);
  const warningActive = warningConditionActive(state);

  const handleMode = () => {
    const next = pressMode(state);
    setState(next);
    const nextVisible = visibleState(next);
    setMessage(
      nextVisible === 'WARNING'
        ? 'Mode advanced to WARNING. The red LED is now in its warning behavior.'
        : nextVisible === 'CAUTION'
          ? 'Mode advanced to CAUTION. The warning condition is not active in this state.'
          : 'Mode returned to NORMAL. Acknowledgement, if any, has been cleared.',
    );
  };

  const handleAcknowledge = () => {
    if (state.operating !== 'WARNING') {
      setMessage('Acknowledge has no effect here: the reviewer says it works only in WARNING state.');
      return;
    }
    const next = pressAcknowledge(state);
    setState(next);
    setMessage(
      'Warning acknowledged: the red LED is steadily ON. The warning condition is still active; acknowledgement does not resolve the underlying problem.',
    );
  };

  const reset = () => {
    setState(INITIAL_SMART_LED_STATE);
    setMessage('Reset to NORMAL. Press Mode to begin the documented sequence.');
  };

  const pressHandlers = (setter: (value: boolean) => void) => ({
    onPointerDown: () => setter(true),
    onPointerUp: () => setter(false),
    onPointerLeave: () => setter(false),
    onPointerCancel: () => setter(false),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') setter(true);
    },
    onKeyUp: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') setter(false);
    },
  });

  return (
    <div className="smartled-demo">
      <div className="smartled-main">
        <div className="smartled-state-head">
          <div>
            <span className="detail-kicker">Current documented state</span>
            <h4 className={`smartled-state-label state-${visible.toLowerCase()}`}>{visible}</h4>
          </div>
          <span className={`warning-condition ${warningActive ? 'is-active' : ''}`}>
            <Icon name={warningActive ? 'warning' : 'info'} size={16} />
            Warning condition: {warningActive ? 'ACTIVE' : 'not in WARNING state'}
          </span>
        </div>

        <div className="smartled-stage">
          <div
            className={`smart-led ${indicator.animation} led-${indicator.pin === 'D8' ? 'green' : indicator.pin === 'D9' ? 'yellow' : 'red'}`}
          >
            <span className="smart-led-glow" />
            <span className="smart-led-bulb" />
            <span className="smart-led-base" />
          </div>
          <div className="smartled-stage-copy" aria-live="polite">
            <span className="detail-kicker">Active indicator</span>
            <h5>
              {indicator.led} · {indicator.pin}
            </h5>
            <p>{indicator.behavior}</p>
            <SourceRef page={6} />
          </div>
        </div>

        <div className="smartled-note">
          <Icon name="info" size={17} />
          <span>
            Only the documented indicator is shown. The reviewer does not specify the behavior of
            the other LEDs in each state. The blink timing and pattern here are illustrative; the
            PDF gives no exact CAUTION interval or WARNING pattern.
          </span>
        </div>

        <div className="smartled-controls">
          <button
            type="button"
            className="btn btn-secondary smartled-button"
            onClick={handleMode}
            {...pressHandlers(setModePressed)}
          >
            <span className="button-dot dot-mode" />
            Mode Button · D2
            <kbd>{pullupReading(modePressed)}</kbd>
          </button>
          <button
            type="button"
            className="btn btn-secondary smartled-button"
            onClick={handleAcknowledge}
            {...pressHandlers(setAckPressed)}
          >
            <span className="button-dot dot-ack" />
            Acknowledge · D3
            <kbd>{pullupReading(ackPressed)}</kbd>
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={reset}>
            <Icon name="refresh" size={14} /> Reset
          </button>
        </div>
        <div className="smartled-message" role="status" aria-live="polite">
          <Icon name="spark" size={16} />
          <span>{message}</span>
        </div>
      </div>

      <div className="smartled-side">
        <div className="pin-map-card">
          <div className="pin-map-head">
            <strong>Components &amp; pins</strong>
            <SourceRef page={6} />
          </div>
          <div className="pin-row">
            <span className="pin-dot green" /> Green LED <code>D8</code> <span>NORMAL</span>
          </div>
          <div className="pin-row">
            <span className="pin-dot yellow" /> Yellow LED <code>D9</code> <span>CAUTION</span>
          </div>
          <div className="pin-row">
            <span className="pin-dot red" /> Red LED <code>D10</code> <span>WARNING</span>
          </div>
          <div className="pin-row">
            <span className="pin-dot neutral" /> Mode Button <code>D2</code> <span>State</span>
          </div>
          <div className="pin-row">
            <span className="pin-dot neutral" /> Acknowledge <code>D3</code> <span>Warning</span>
          </div>
          <p className="pin-note">Each external LED uses a 220 Ω resistor to limit current.</p>
        </div>

        <div className="pullup-card">
          <div className="pin-map-head">
            <strong>INPUT_PULLUP</strong>
            <SourceRef page={7} />
          </div>
          <div className="pullup-table" role="table" aria-label="INPUT_PULLUP readings">
            <div className="pullup-row pullup-head" role="row">
              <span role="columnheader">Button</span>
              <span role="columnheader">Not pressed</span>
              <span role="columnheader">Pressed</span>
            </div>
            <div className="pullup-row" role="row">
              <span role="cell">D2</span>
              <span role="cell" className="reading-high">HIGH</span>
              <span role="cell" className="reading-low">LOW</span>
            </div>
            <div className="pullup-row" role="row">
              <span role="cell">D3</span>
              <span role="cell" className="reading-high">HIGH</span>
              <span role="cell" className="reading-low">LOW</span>
            </div>
          </div>
          <p>
            The button connects between the input pin and GND. The internal pull-up keeps the input
            HIGH when not pressed, so the button is active-LOW. Hold a button above to see its reading
            change.
          </p>
        </div>

        <div className="ack-reminder">
          <Icon name="warning" size={18} />
          <div>
            <strong>ACKNOWLEDGED ≠ resolved</strong>
            <p>
              The warning condition is still active. The user has only acknowledged the warning; the
              actual problem has not necessarily been resolved.
            </p>
          </div>
        </div>
      </div>

      <div className="smartled-state-table">
        <div className="pin-map-head">
          <strong>Documented state behavior</strong>
          <SourceRef page={6} />
        </div>
        <div className="table-wrap">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>State</th>
                <th>LED behavior</th>
              </tr>
            </thead>
            <tbody>
              {SMART_LED_STATE_ROWS.map((row) => (
                <tr key={row.state} className={row.state === visible ? 'is-current-row' : ''}>
                  <td>{row.state}</td>
                  <td>{row.behavior}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BlockingTimingDemo />
    </div>
  );
}
