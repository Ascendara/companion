# Live game activity

The desktop sends authenticated activity snapshots to `/library/activity` every
three seconds. Webview polls `/companion/activity` at the same interval and
displays each running session above the mobile navigation. Activity becomes
offline after 45 seconds without a heartbeat; stop is disabled while offline.

Stop requests use the existing claim/acknowledge queue with a game ID and unique
launch session ID. Desktop verifies the session again before sending the helper
a stop command. The helper kills game processes and their descendants, then
flushes playtime. The game disappears from activity before post-game backups.
Old desktop clients only receive launch commands.

Deploy the monitor API and Webview, and rebuild/distribute Ascendara **including
the updated AscendaraGameHandler binary**. Already-running sessions using an old
helper need a relaunch to support stop. The stop button is disabled for those
sessions. No production deployment is performed by these source changes.

Tracking covers games launched through Ascendara on the PC or through Webview.
Unrelated executables started outside Ascendara are not discovered. The existing
administrator launch path exits its helper and cannot provide ongoing tracking;
OS-protected processes may reject termination.

Validation: `python -m unittest discover -s tests -p test_game_activity.py`,
`node --test tests/game-stop.test.cjs` (requires the sibling Ascendara checkout),
`npx tsc --noEmit`, and `npx eslint components/now-playing.tsx`.
