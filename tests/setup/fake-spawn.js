import { EventEmitter } from 'events';
import { Readable } from 'stream';

/**
 * Create a controllable fake child process for testing spawn-based code.
 * @returns {{
 *   process: import('child_process').ChildProcess,
 *   stdout: import('stream').Readable,
 *   stderr: import('stream').Readable,
 *   emitStdout: (data: string) => void,
 *   emitStderr: (data: string) => void,
 *   emitClose: (code: number) => void,
 *   emitError: (err: Error) => void,
 * }}
 */
export function createFakeChildProcess() {
  const proc = new EventEmitter();
  const stdout = new Readable({ read() {} });
  const stderr = new Readable({ read() {} });

  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.pid = 12345;
  proc.killed = false;
  proc.kill = (signal) => {
    proc.killed = true;
    proc.emit('close', null, signal);
  };

  return {
    process: proc,
    stdout,
    stderr,
    emitStdout(data) {
      stdout.push(data);
    },
    emitStderr(data) {
      stderr.push(data);
    },
    emitClose(code) {
      stdout.push(null);
      stderr.push(null);
      proc.emit('close', code);
    },
    emitError(err) {
      proc.emit('error', err);
    },
  };
}

/**
 * Create a vi.fn() spawn mock that returns scripted fake processes.
 * Call `enqueue(fakeChildProcess)` to set up what the next `spawn()` call returns.
 * @param {import('vitest').vi} vi
 * @returns {{
 *   spawnMock: import('vitest').Mock,
 *   enqueue: (fake: ReturnType<typeof createFakeChildProcess>) => void,
 *   createAndEnqueue: () => ReturnType<typeof createFakeChildProcess>,
 * }}
 */
export function createFakeSpawn(vi) {
  const queue = [];

  const spawnMock = vi.fn(() => {
    const next = queue.shift();
    if (!next) {
      throw new Error('createFakeSpawn: no queued fake process — call enqueue() or createAndEnqueue() first');
    }
    return next.process;
  });

  return {
    spawnMock,
    enqueue(fake) {
      queue.push(fake);
    },
    createAndEnqueue() {
      const fake = createFakeChildProcess();
      queue.push(fake);
      return fake;
    },
  };
}
