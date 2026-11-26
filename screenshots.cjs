const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:9222';
const OUT = 'C:\\Users\\MSI\\AppData\\Local\\Temp\\opencode\\reviewer-shots';

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
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  return { socket, send };
}

const wait = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { socket, send } = await connect();
  await send('Runtime.enable');
  await send('Page.enable');

  const routes = [
    ['dashboard', '/'],
    ['notes', '/notes'],
    ['lab', '/lab'],
    ['flashcards', '/flashcards'],
    ['quiz', '/quiz'],
    ['formulas', '/formulas'],
    ['progress', '/progress'],
  ];
  const viewports = [
    ['desktop', 1440, 900, 1],
    ['mobile', 390, 844, 2],
  ];

  for (const [view, width, height, scale] of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: view === 'mobile',
    });
    for (const [name, route] of routes) {
      await send('Page.navigate', { url: `http://localhost:4173/?t=${Date.now()}#${route}` });
      await wait(1200);
      await send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
      await wait(200);
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const file = path.join(OUT, `${view}-${name}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(file);
    }
  }
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
