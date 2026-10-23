import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { waitForBackend } from './wait-for-backend.mjs';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const children = [];
let stopping = false;
const controller = new AbortController();

function stop(code) {
  if (stopping) return;
  stopping = true;
  controller.abort();
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      // Stop the entire npm process group, including Vite and Mastra.
      process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  }
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

function start(service) {
  const child = spawn('npm', ['run', `dev:${service}`], {
    cwd,
    stdio: 'inherit',
    detached: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`Failed to start ${service}: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

start('backend');
try {
  console.log('Waiting for Mastra on 127.0.0.1:4111...');
  await waitForBackend({ signal: controller.signal });
  if (!stopping) start('web');
} catch (error) {
  if (!stopping) {
    console.error(error.message);
    stop(1);
  }
}
