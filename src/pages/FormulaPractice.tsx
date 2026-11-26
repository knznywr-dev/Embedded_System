import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  Callout,
  Card,
  MathText,
  PageHeader,
  SourceRef,
} from '../components/ui';
import { FORMULAS } from '../data/formulas';
import {
  AdcCodesCalculator,
  AdcLsbCalculator,
  AdcReadingExplainer,
  AdcVoltageCalculator,
  PwmDutyCalculator,
  PwmFrequencyCalculator,
  PwmOffTimeCalculator,
  PwmPeriodCalculator,
  ResponseTimeCalculator,
  TimingMarginCalculator,
  Tmp36TemperatureCalculator,
} from '../features/calculators';

const CALCULATORS = [
  {
    id: 'calc-response-time',
    formulaId: 'response-time',
    render: () => <ResponseTimeCalculator />,
    group: 'Timing',
  },
  {
    id: 'calc-timing-margin',
    formulaId: 'timing-margin',
    render: () => <TimingMarginCalculator />,
    group: 'Timing',
  },
  {
    id: 'calc-adc-codes',
    formulaId: 'adc-codes',
    render: () => <AdcCodesCalculator />,
    group: 'ADC',
  },
  {
    id: 'calc-adc-lsb',
    formulaId: 'adc-lsb',
    render: () => <AdcLsbCalculator />,
    group: 'ADC',
  },
  {
    id: 'calc-pwm-duty',
    formulaId: 'pwm-duty',
    render: () => <PwmDutyCalculator />,
    group: 'PWM',
  },
  {
    id: 'calc-pwm-frequency',
    formulaId: 'pwm-frequency',
    render: () => <PwmFrequencyCalculator />,
    group: 'PWM',
  },
  {
    id: 'calc-pwm-period',
    formulaId: 'pwm-period',
    render: () => <PwmPeriodCalculator />,
    group: 'PWM',
  },
  {
    id: 'calc-pwm-off-time',
    formulaId: 'pwm-off-time',
    render: () => <PwmOffTimeCalculator />,
    group: 'PWM',
  },
  {
    id: 'calc-tmp36-temperature',
    formulaId: 'tmp36-temp',
    render: () => <Tmp36TemperatureCalculator />,
    group: 'Sensor',
  },
  {
    id: 'calc-adc-voltage',
    formulaId: 'adc-voltage',
    render: () => <AdcVoltageCalculator />,
    group: 'Sensor',
  },
] as const;

const GROUPS = ['Timing', 'ADC', 'PWM', 'Sensor'] as const;

const GROUP_COPY: Record<(typeof GROUPS)[number], string> = {
  Timing: 'Response time and deadline analysis.',
  ADC: 'Ideal ADC codes and resolution. Keep the ideal LSB formula separate from the Arduino Uno conversion.',
  PWM: 'Duty cycle, frequency, period, and OFF time.',
  Sensor: 'TMP36 conversion and the Arduino Uno voltage conversion.',
};

export function FormulaPracticePage() {
  const formulaById = new Map(FORMULAS.map((formula) => [formula.id, formula]));

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page formulas-page animate-page-enter">
      <PageHeader
        eyebrow={
          <>
            <Icon name="formula" size={14} /> Computation practice
          </>
        }
        title="Formula Practice"
        description="All ten formulas the reviewer says to memorize, each with its unit, a live calculator, the substitution steps, and the source example. Validation messages explain invalid inputs instead of silently failing."
        actions={
          <>
            <Link className="btn btn-secondary" to="/notes?module=m5">
              <Icon name="notes" size={16} /> Formula notes
            </Link>
            <Link className="btn btn-primary" to="/quiz?scope=m5">
              <Icon name="quiz" size={16} /> Quiz Module 5
            </Link>
          </>
        }
      />

      <Callout tone="important" title="Two ADC formulas, kept separate" className="animate-content-reveal stagger-1">
        <p>
          <strong>ADC Resolution (LSB) = Vref / 2^N</strong> is the ideal ADC formula. The Arduino
          Uno activity separately uses <strong>ADC Reading × (5.0 / 1023.0)</strong>. The reviewer
          gives both, and they are not interchangeable.
        </p>
      </Callout>

      <div className="formula-layout animate-content-reveal stagger-2">
        <aside className="formula-index">
          <div className="formula-index-head">
            <Icon name="list" size={15} /> Formula sheet
          </div>
          <ol>
            {CALCULATORS.map((calculator, index) => {
              const formula = formulaById.get(calculator.formulaId);
              if (!formula) return null;
              return (
                <li key={calculator.id}>
                  <button type="button" onClick={() => scrollTo(calculator.id)}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <strong>{formula.topic}</strong>
                      <small>{formula.unit}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="formula-index-foot">
            Every formula is printed on p. 11. Worked examples come from pp. 4, 5, 8, and 9 where
            the reviewer provides them.
          </p>
        </aside>

        <div className="formula-content">
          <Card className="formula-sheet animate-content-reveal stagger-3">
            <div className="card-heading">
              <div>
                <div className="eyebrow">At a glance</div>
                <h2>Important formulas to memorize</h2>
              </div>
              <SourceRef page={11} />
            </div>
            <div className="formula-sheet-grid">
              {FORMULAS.map((formula) => (
                <button
                  key={formula.id}
                  type="button"
                  className="formula-sheet-item"
                  onClick={() => scrollTo(`calc-${formula.calculatorId}`)}
                >
                  <span className="formula-sheet-topic">{formula.topic}</span>
                  <MathText text={formula.expression} />
                  <span className="formula-sheet-unit">{formula.unit}</span>
                </button>
              ))}
            </div>
          </Card>

          {GROUPS.map((group, groupIndex) => (
            <section className="formula-group animate-content-reveal" key={group} style={{ animationDelay: `${(groupIndex + 1) * 100}ms` }}>
              <div className="formula-group-head">
                <h2>{group}</h2>
                <span>{GROUP_COPY[group]}</span>
              </div>
              {CALCULATORS.filter((calculator) => calculator.group === group).map((calculator) => {
                const formula = formulaById.get(calculator.formulaId);
                return (
                  <div key={calculator.id} className="formula-block-wrap">
                    <div className="formula-source-card">
                      <div className="formula-source-main">
                        <span className="formula-source-topic">{formula?.topic}</span>
                        <MathText text={formula?.expression ?? ''} className="formula-source-expression" />
                      </div>
                      <div className="formula-source-meta">
                        <span>
                          <em>Unit:</em> {formula?.unit}
                        </span>
                        <span>
                          <em>Variables:</em> {formula?.variables.join(', ')}
                        </span>
                        <SourceRef page={formula?.page ?? 11} />
                      </div>
                      {formula?.example ? (
                        <div className="formula-source-example">
                          <Icon name="spark" size={15} />
                          <span>{formula.example}</span>
                        </div>
                      ) : null}
                      {formula?.note ? <p className="formula-source-note">{formula.note}</p> : null}
                    </div>
                    {calculator.render()}
                  </div>
                );
              })}
            </section>
          ))}

          <section className="formula-group animate-content-reveal stagger-4">
            <div className="formula-group-head">
              <h2>Integer division checkpoint</h2>
              <span>The reviewer’s programming reminder for the Arduino Uno ADC.</span>
            </div>
            <Card>
              <AdcReadingExplainer />
            </Card>
          </section>

          <section className="formula-group animate-content-reveal stagger-5">
            <div className="formula-group-head">
              <h2>Units to remember</h2>
              <span>Exactly as listed by the reviewer on p. 11.</span>
            </div>
            <Card>
              <div className="units-grid">
                {[
                  ['Response Time', 'milliseconds (ms)'],
                  ['Timing Margin', 'milliseconds (ms)'],
                  ['Frequency', 'Hertz (Hz)'],
                  ['Period', 'seconds (s) or milliseconds (ms)'],
                  ['Duty Cycle', 'percentage (%)'],
                  ['Voltage', 'Volts (V)'],
                  ['Temperature', 'degrees Celsius (°C)'],
                ].map(([quantity, unit]) => (
                  <div className="unit-row" key={quantity}>
                    <span>{quantity}</span>
                    <strong>{unit}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="formula-group animate-content-reveal stagger-6">
            <div className="formula-group-head">
              <h2>Common traps</h2>
              <span>Points the reviewer explicitly emphasizes.</span>
            </div>
            <div className="trap-grid">
              <div className="trap-card">
                <span className="trap-icon">
                  <Icon name="warning" size={18} />
                </span>
                <strong>5 / 1023 vs. 5.0 / 1023.0</strong>
                <p>
                  <code>5 / 1023</code> uses integer division and produces zero. Write{' '}
                  <code>5.0 / 1023.0</code> to keep the fractional result.
                </p>
                <SourceRef page={9} />
              </div>
              <div className="trap-card">
                <span className="trap-icon">
                  <Icon name="clock" size={18} />
                </span>
                <strong>Period units</strong>
                <p>
                  Frequency = 1 / Period. The period must be in seconds. A 10 ms period is 0.010 s,
                  not 10 s.
                </p>
                <SourceRef page={[5, 11]} />
              </div>
              <div className="trap-card">
                <span className="trap-icon">
                  <Icon name="target" size={18} />
                </span>
                <strong>&gt;= includes 30°C</strong>
                <p>
                  The temperature program uses <code>temperature &gt;= 30.0</code>. Exactly 30°C
                  triggers the warning; <code>&gt; 30.0</code> would not.
                </p>
                <SourceRef page={10} />
              </div>
              <div className="trap-card">
                <span className="trap-icon">
                  <Icon name="bolt" size={18} />
                </span>
                <strong>Longer delay ≠ less power</strong>
                <p>
                  A longer <code>delay()</code> only checks less often. The reviewer says it does not
                  automatically mean lower power; that requires sleep modes and measurements.
                </p>
                <SourceRef page={11} />
              </div>
            </div>
          </section>

          <Card className="formula-footer-card">
            <div>
              <h3>Practice these computations</h3>
              <p>
                The quiz has a dedicated Module 5 scope plus computation questions throughout the
                lab sections.
              </p>
            </div>
            <div className="formula-footer-actions">
              <Link className="btn btn-primary btn-small" to="/quiz?scope=m5">
                <Icon name="quiz" size={15} /> Module 5 quiz
              </Link>
              <Link className="btn btn-secondary btn-small" to="/quiz?scope=m4b">
                <Icon name="flask" size={15} /> Temperature math quiz
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
