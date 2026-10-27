"""Exercise monitor handlers without Firebase or production storage."""
import ast
import math
import time
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from types import SimpleNamespace


class ActivityTests(unittest.TestCase):
    def setUp(self):
        self.payload = {}
        self.uid = 'owner'
        self.ns = dict(math=math, time=time, uuid=uuid, datetime=datetime,
                       timedelta=timedelta, UTC=timezone.utc, library_lock=Lock(),
                       desktop_activity={}, desktop_libraries={}, library_commands={},
                       LIBRARY_COMMANDS_FILE='unused', save_json_file=lambda *args: None,
                       desktop_user=lambda: self.uid,
                       request=SimpleNamespace(get_json=lambda **kwargs: self.payload, args={'actions': 'launch,stop'}),
                       jsonify=lambda *args, **kwargs: args[0] if args else kwargs,
                       convert_datetime_to_string=lambda value: value)
        tree = ast.parse(Path('monitor-api.py').read_text(encoding='utf-8'))
        names = {'library_online', 'sync_game_activity', 'companion_activity',
                 'request_game_stop', 'get_library_commands'}
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        for node in nodes:
            node.decorator_list = []
        exec(compile(ast.Module(body=nodes, type_ignores=[]), 'monitor-api.py', 'exec'), self.ns)

    def publish(self):
        self.payload = {'sessions': [{'gameId': 'game', 'sessionId': 'run-1',
                                     'startedAt': time.time() * 1000, 'canStop': True}]}
        self.assertEqual(self.ns['sync_game_activity'](), {'success': True})
        self.ns['desktop_libraries']['owner'] = {'games': [{'id': 'game', 'name': 'Portal'}]}

    def test_activity_and_stop_queue(self):
        self.publish()
        result = self.ns['companion_activity']('owner')
        self.assertTrue(result['online'])
        self.assertEqual(result['sessions'][0]['name'], 'Portal')
        self.assertEqual(self.ns['companion_activity']('other')['sessions'], [])
        self.payload = {'gameId': 'game', 'sessionId': 'run-1'}
        self.assertEqual(self.ns['request_game_stop']('owner')[1], 202)
        command = self.ns['get_library_commands']('owner')['commands'][0]
        self.assertEqual((command['action'], command['sessionId']), ('stop', 'run-1'))
        self.ns['request'].args = {}
        self.assertEqual(self.ns['get_library_commands']('owner')['commands'], [])

    def test_rejects_stale_session_and_offline(self):
        self.publish()
        self.payload = {'gameId': 'game', 'sessionId': 'old-run'}
        self.assertEqual(self.ns['request_game_stop']('owner')[1], 409)
        self.payload['sessionId'] = 'run-1'
        self.ns['desktop_activity']['owner']['lastSeen'] -= timedelta(seconds=46)
        self.assertEqual(self.ns['request_game_stop']('owner')[1], 409)

    def test_validation_and_auth(self):
        for started in (float('nan'), float('inf'), -1, True, time.time() * 1000 + 120000):
            self.payload = {'sessions': [{'gameId': 'game', 'sessionId': 'run', 'startedAt': started}]}
            self.assertEqual(self.ns['sync_game_activity']()[1], 400)
        self.uid = None
        self.assertEqual(self.ns['sync_game_activity']()[1], 401)


if __name__ == '__main__':
    unittest.main()
