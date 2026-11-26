const BASE = 'http://127.0.0.1:9222';

async function connect() {
  let target;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/json/list`);
      const targets = await response.json();
      target = targets.find((item) => item.type === 'page');
      if (target) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) events.push(message);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  return { socket, send, events };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed');
  return result.result.value;
}

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];

async function main() {
  const { socket, send, events } = await connect();
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('DOMStorage.enable');

  const goto = async (route) => {
    await send('Page.navigate', { url: `http://localhost:4173/#${route}` });
    await wait(1000);
  };
  const clickText = (text, selector = 'button') =>
    evaluate(
      send,
      `(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) return 'NOT FOUND'; el.click(); return el.textContent.trim(); })()`,
    );
  const check = async (name, fn) => {
    try {
      results.push({ name, ok: true, value: await fn() });
    } catch (error) {
      results.push({ name, ok: false, value: error.message });
    }
  };
  const text = (selector) =>
    evaluate(send, `document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? null`);

  // Clear any previous study data before testing persistence.
  await goto('/progress');
  await evaluate(send, `localStorage.clear()`);
  await send('Page.reload');
  await wait(1200);

  // --- Quiz complete flow ---
  await goto('/quiz');
  await clickText('Start quiz');
  await wait(500);
  await check('quiz running has choices', async () => {
    const count = await evaluate(
      send,
      `document.querySelectorAll('.choice, .tf-button, .match-row select, .answer-field input').length`,
    );
    if (count < 1) throw new Error(`expected an answer control, got ${count}`);
    return `${count} answer controls`;
  });
  await evaluate(
    send,
    `(() => {
      const quick = document.querySelector('.choice, .tf-button');
      if (quick) { quick.click(); return quick.className; }
      const select = document.querySelector('.match-row select');
      if (select) { select.selectedIndex = 1; select.dispatchEvent(new Event('change', { bubbles: true })); return 'match'; }
      const input = document.querySelector('.answer-field input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, '1');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return 'input';
      }
      return 'none';
    })()`,
  );
  await wait(250);
  await check('quiz answer recorded', async () => {
    const value = await text('.quiz-run-score');
    return value;
  });
  await clickText('Next question');
  await wait(300);
  await clickText('Finish quiz');
  await wait(350);
  await check('quiz finish prompt', async () => text('.quiz-finish-prompt'));
  await clickText('Finish anyway');
  await wait(700);
  await check('quiz results rendered', async () => {
    const h2 = await evaluate(
      send,
      `[...document.querySelectorAll('h2')].map(e=>e.textContent.trim()).join(' | ')`,
    );
    const body = await text('main');
    if (!body || !/score|correct|results|attempt/i.test(body)) {
      throw new Error(`no results content: ${body?.slice(0, 200)}`);
    }
    return { h2, start: body.slice(0, 260) };
  });
  await check('quiz stored attempt', async () => {
    const raw = await evaluate(
      send,
      `localStorage.getItem('embedded-reviewer:v1:quiz')`,
    );
    if (!raw) throw new Error('no quiz storage');
    const parsed = JSON.parse(raw);
    if (!parsed.attempts?.length) throw new Error('no attempt stored');
    return { attempts: parsed.attempts.length, missed: parsed.missedQuestionIds.length };
  });

  // --- Flashcards persistence ---
  await goto('/flashcards');
  await evaluate(send, `document.querySelector('.flashcard').click()`);
  await wait(250);
  await clickText('Know it');
  await wait(300);
  await check('flashcard mark persists', async () => {
    const raw = await evaluate(
      send,
      `localStorage.getItem('embedded-reviewer:v1:flashcards')`,
    );
    const parsed = JSON.parse(raw || '{}');
    if (Object.values(parsed).filter((value) => value === 'known').length !== 1) {
      throw new Error(`unexpected marks: ${raw}`);
    }
    return parsed;
  });

  // --- Notes + mark reviewed ---
  await goto('/notes?module=m4b');
  await check('notes module filter', async () => {
    const headings = await evaluate(
      send,
      `[...document.querySelectorAll('.note-section-head h3')].map(e=>e.textContent.trim()).slice(0,4)`,
    );
    if (headings.length < 3) throw new Error('missing m4b sections');
    return headings;
  });
  await clickText('Mark reviewed');
  await wait(300);
  await check('module completion persists', async () => {
    const raw = await evaluate(send, `localStorage.getItem('embedded-reviewer:v1:progress')`);
    const parsed = JSON.parse(raw || '{}');
    if (!parsed.completedModules?.includes('m4b')) throw new Error(`progress: ${raw}`);
    return parsed;
  });

  // --- Smart LED state machine ---
  await goto('/lab');
  await clickText('Mode Button');
  await wait(250);
  await clickText('Mode Button');
  await wait(250);
  await check('smart LED warning state', async () => ({
    state: await text('.smartled-state-label'),
    indicator: await text('.smartled-stage-copy h5'),
    warning: await text('.warning-condition'),
  }));
  await clickText('Acknowledge');
  await wait(250);
  await check('ACKNOWLEDGED keeps warning active', async () => {
    const state = await text('.smartled-state-label');
    const warning = await text('.warning-condition');
    if (state !== 'ACKNOWLEDGED') throw new Error(`state ${state}`);
    if (!warning.includes('ACTIVE')) throw new Error(`warning ${warning}`);
    return { state, warning };
  });
  await clickText('Mode Button');
  await wait(250);
  await check('leaving WARNING clears ACK', async () => ({
    state: await text('.smartled-state-label'),
    indicator: await text('.smartled-stage-copy h5'),
  }));

  // --- Temperature 30 C boundary ---
  await goto('/lab#lab-temperature');
  await wait(500);
  await clickText('30 °C');
  await wait(300);
  await check('temperature at exactly 30 C warns', async () => ({
    temperature: await text('.temp-readout'),
    status: await text('.temp-status'),
    serial: await text('.serial-monitor'),
    boundary: await text('.temp-boundary'),
  }));

  // --- Formula calculator example ---
  await goto('/formulas');
  await check('formula calculators rendered', async () => {
    const count = await evaluate(send, `document.querySelectorAll('.calc-card').length`);
    if (count !== 10) throw new Error(`expected 10 calculators, got ${count}`);
    return count;
  });
  await evaluate(send, `document.querySelector('.calc-example-button button')?.click()`);
  await wait(350);
  await check('formula example result', async () => {
    const value = await text('.calc-result-value');
    const substitution = await text('.calc-substitution');
    if (!value) throw new Error('no result');
    return { value, substitution };
  });

  // --- Global search ---
  await evaluate(
    send,
    `(() => {
      const input = document.querySelector('#global-search-input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '30.0');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      return input.value;
    })()`,
  );
  await wait(500);
  await check('global search returns results', async () => {
    const count = await evaluate(
      send,
      `document.querySelectorAll('.search-result').length`,
    );
    const first = await text('.search-result');
    if (count === 0) throw new Error('no search results');
    return { count, first: first?.slice(0, 160) };
  });

  const errors = events
    .filter(
      (event) =>
        event.method === 'Runtime.exceptionThrown' ||
        (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') ||
        (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error'),
    )
    .map((event) => event.method);
  console.log(JSON.stringify(results, null, 2));
  console.log('errors:', errors);
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
