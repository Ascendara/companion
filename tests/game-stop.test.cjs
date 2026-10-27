const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('../ascendara/electron/modules/games.js', 'utf8');

function setup() {
  const handlers = {};
  const processes = new Map();
  vm.runInNewContext(source.slice(source.indexOf('  // Stop game'), source.indexOf('  // Check if game is running')), {
    ipcMain: { handle: (name, handler) => { handlers[name] = handler; } },
    runGameProcesses: processes, setTimeout, clearTimeout,
  });
  const process = new EventEmitter();
  process.playSession = { sessionId: 'current', name: 'Portal' };
  process.stopSupported = true;
  process.stdin = { write(command, callback) {
    assert.equal(command, 'ASCENDARA_STOP\n');
    callback();
    process.emit('session-ended');
  } };
  processes.set('Portal', process);
  return { handlers, process };
}

test('stop targets only the requested launch and waits for game exit', async () => {
  const { handlers, process } = setup();
  await assert.rejects(handlers['stop-game'](null, 'Portal', 'old'), /already ended/);
  assert.equal(process.stopRequested, undefined);
  assert.equal((await handlers['stop-game'](null, 'Portal', 'current')).success, true);
  assert.equal(process.listenerCount('session-ended'), 0);
  assert.equal(process.listenerCount('close'), 0);
});

test('old helpers reject stop; finished sessions leave the activity feed', async () => {
  const { handlers, process } = setup();
  process.stopSupported = false;
  await assert.rejects(handlers['stop-game'](null, 'Portal', 'current'), /Update/);
  assert.equal(handlers['get-running-game-sessions']()[0].canStop, false);
  process.sessionEnded = true;
  assert.equal(handlers['get-running-game-sessions']().length, 0);
});
