/**
 * Minimal ipcMain double for main-process IPC tests.
 * @returns {{
 *   handle: (channel: string, fn: Function) => void,
 *   invoke: (channel: string, event?: object, ...args: unknown[]) => Promise<unknown>,
 *   handlers: Map<string, Function>
 * }}
 */
export function createFakeIpcMain() {
  const handlers = new Map();

  return {
    handlers,
    handle(channel, fn) {
      handlers.set(channel, fn);
    },
    async invoke(channel, event = {}, ...args) {
      const fn = handlers.get(channel);
      if (!fn) {
        throw new Error(`No IPC handler registered for channel: ${channel}`);
      }
      return fn(event, ...args);
    },
  };
}
