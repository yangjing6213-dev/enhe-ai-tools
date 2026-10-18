"""Offline tests: no SSH, Docker daemon, production files or business data access."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('operations', ROOT / 'deploy/enhe-ai-tools/scripts/enhe-operations-remediate.py')
ops = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ops)


def container(name, mount='/sandbox/db'):
    return {'Name': '/' + name, 'Id': 'id-' + name, 'Image': 'sha256:fixture',
            'Created': '2026-01-01T00:00:00Z', 'State': {'Running': True},
            'Mounts': [{'Source': mount}], 'Config': {'Env': ['DATABASE_URL=postgresql://u:p@test-db:5432/test']},
            'HostConfig': {'RestartPolicy': {'Name': 'unless-stopped', 'MaximumRetryCount': 0}}}


class OperationsTests(unittest.TestCase):
    def test_gateway_preserves_both_networks_certificate_mount_and_ports(self):
        config = ops.gateway_compose('sha256:immutable')
        gateway = config['services']['nginx']
        self.assertEqual(gateway['image'], 'sha256:immutable')
        self.assertEqual(set(gateway['networks']), set(ops.NETWORKS))
        self.assertEqual(gateway['ports'], ['80:80', '443:443'])
        self.assertIn('/etc/letsencrypt:/etc/letsencrypt:ro', gateway['volumes'])
        self.assertEqual(gateway['logging']['options']['max-file'], '5')
        self.assertTrue(all(n['external'] for n in config['networks'].values()))

    def test_firewall_only_scoped_private_ingress_and_no_flush(self):
        script = ops.port_guard()
        self.assertIn('-i eth0', script)
        self.assertIn('--dports 3000,8000,5432,6379,3030', script)
        self.assertNotIn('--dports 22', script)
        self.assertNotIn('-F ', script)
        self.assertNotIn('-P ', script)
        self.assertIn('INPUT DOCKER-USER', script)
        self.assertIn('iptables ip6tables', script)
        self.assertIn('--comment enhe-audit-private-ports', script)
        self.assertIn('-D "$chain" "$@"', script)

    def test_retirement_excludes_production_and_stable_staging(self):
        self.assertEqual(len(ops.LEGACY), 12)
        for name in ('enhe-ai-tools-app', 'enhe-ai-tools-db', 'enhe-ai-tools-staging-app', 'hot-content-nginx'):
            with self.assertRaises(RuntimeError):
                ops.legacy_candidates([container(name)], [], '')

    def test_retirement_rejects_shared_mount_database_or_gateway_reference(self):
        target = container(ops.LEGACY[0])
        live = container('enhe-ai-tools-app')
        with self.assertRaisesRegex(RuntimeError, 'mount'):
            ops.legacy_candidates([target], [live], '')
        live['Mounts'] = [{'Source': '/production/db'}]
        with self.assertRaisesRegex(RuntimeError, 'database'):
            ops.legacy_candidates([target], [live], '')
        with self.assertRaisesRegex(RuntimeError, 'nginx'):
            ops.legacy_candidates([target], [], 'proxy_pass http://' + ops.LEGACY[0])

    def test_recovery_manifest_does_not_contain_env_or_database_credentials(self):
        result = ops.legacy_candidates([container(ops.LEGACY[0])], [], '')
        self.assertEqual(set(result[0]), {'name', 'id', 'image', 'running', 'restart'})
        self.assertNotIn('DATABASE_URL', str(result))

    def test_recent_or_renamed_candidate_is_rejected(self):
        target = container(ops.LEGACY[0])
        target['Created'] = '2099-01-01T00:00:00Z'
        with self.assertRaisesRegex(RuntimeError, 'recent'):
            ops.legacy_candidates([target], [], '')

    def test_permission_tree_rejects_escape_and_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            child = root / 'owned'
            child.mkdir()
            (child / 'file').write_text('fixture')
            self.assertEqual(len(ops.safe_tree(child, root)), 2)
            with self.assertRaises(RuntimeError):
                ops.safe_tree(root.parent, root)
            link = child / 'escape'
            try:
                link.symlink_to(root.parent, target_is_directory=True)
            except OSError:
                self.skipTest('Windows symlink privilege unavailable; also tested in Linux container')
            with self.assertRaises(RuntimeError):
                ops.safe_tree(child, root)

    def test_gateway_rollback_checks_identity_before_stopping_any_container(self):
        with patch.object(ops, 'read', return_value={'id': 'expected'}), \
             patch.object(ops, 'inspect', return_value={'Id': 'different'}), patch.object(ops, 'run') as run:
            with self.assertRaises(RuntimeError):
                ops.rollback_gateway()
            run.assert_not_called()

    def test_gateway_failed_canary_restores_original_gateway(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            state = base / 'state'
            state.mkdir()
            config = base / 'original.conf'
            config.write_text('/promotion-manager/ /api/promotion-manager/ 172.20.0.1:3030 '
                              'proxy_set_header X-Real-IP $remote_addr')
            old = container(ops.OLD_GATEWAY)
            old['NetworkSettings'] = {'Networks': {n: {} for n in ops.NETWORKS}}
            old['Mounts'] = [{'Destination': '/etc/nginx/conf.d/default.conf', 'Source': str(config)},
                             {'Destination': '/etc/letsencrypt', 'Source': '/etc/letsencrypt'}]
            with patch.object(ops, 'STATE', state), patch.object(ops, 'EDGE', base / 'edge'), \
                 patch.object(ops, 'OLD_CONFIG', config), patch.object(ops, 'HOOK', base / 'hook'), \
                 patch.object(ops, 'healthy'), patch.object(ops, 'inspect', return_value=old), \
                 patch.object(ops, 'run'), patch.object(ops, 'time') as clock, \
                 patch.object(ops, 'promotion_baseline', return_value={p: '200' for p in ops.PROMOTION_PATHS}), \
                 patch.object(ops, 'route_status', return_value='503'), \
                 patch.object(ops, 'rollback_gateway') as rollback:
                with self.assertRaises(RuntimeError):
                    ops.migrate_gateway()
                rollback.assert_called_once()
                self.assertEqual((base / 'edge/nginx/default.conf').read_bytes(), config.read_bytes())

    def test_bad_effective_ssh_configuration_rolls_back_after_timer_is_armed(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            calls = []
            def command(args, **kwargs):
                calls.append(args)
                output = 'dev eth0' if args[:2] == ['ip', 'route'] else 'passwordauthentication yes'
                return subprocess.CompletedProcess(args, 0, output, '')
            with patch.object(ops, 'STATE', base), patch.object(ops, 'SSH_CONFIG', base / 'ssh.conf'), \
                 patch.object(ops, 'GUARD', base / 'guard.sh'), patch.object(ops, 'GUARD_UNIT', base / 'guard.service'), \
                 patch.object(ops, 'run', side_effect=command), patch.object(ops, 'rollback_access') as rollback:
                with self.assertRaises(RuntimeError):
                    ops.harden_access()
                rollback.assert_called_once()
                self.assertTrue(any(c[0] == 'systemd-run' for c in calls))
                self.assertFalse(any(c[:3] == ['systemctl', 'reload', 'ssh'] for c in calls))

    def test_legacy_failure_restores_recorded_restart_and_running_states(self):
        record = {'name': ops.LEGACY[0], 'id': 'fixture-id', 'running': True,
                  'restart': {'Name': 'on-failure', 'MaximumRetryCount': 3}}
        with patch.object(ops, 'read', return_value=[record]), \
             patch.object(ops, 'inspect', return_value={'Id': 'fixture-id'}), patch.object(ops, 'run') as run:
            ops.rollback_legacy()
            self.assertEqual(run.call_args_list[0].args[0], ['docker', 'update', '--restart=on-failure:3', ops.LEGACY[0]])
            self.assertEqual(run.call_args_list[1].args[0], ['docker', 'start', ops.LEGACY[0]])

    def test_command_failure_never_echoes_captured_secret_or_env(self):
        with patch.object(ops.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, 'private', 'private')):
            with self.assertRaises(RuntimeError) as failure:
                ops.run(['docker', 'inspect', 'fixture'])
            self.assertNotIn('private', str(failure.exception))

    def test_missing_dependency_fails_before_any_command_or_mutation(self):
        with patch.object(ops.shutil, 'which', return_value=None), patch.object(ops, 'run') as command:
            with self.assertRaisesRegex(RuntimeError, 'logrotate'):
                ops.preflight('prepare-runtime')
            command.assert_not_called()

    def test_operation_lock_rejects_concurrent_operation(self):
        try:
            import fcntl
        except ImportError:
            self.skipTest('Linux flock is verified in the Linux container')
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'APP', Path(temp)), \
             patch.dict(ops.os.environ, {}, clear=True):
            (Path(temp) / 'deploy/enhe-ai-tools/runtime').mkdir(parents=True)
            with ops.operation_lock():
                with self.assertRaisesRegex(RuntimeError, 'another'):
                    with ops.operation_lock():
                        self.fail('concurrent mutation lock was accepted')

    def test_operation_lock_accepts_verified_inherited_descriptor_9(self):
        try:
            import fcntl
        except ImportError:
            self.skipTest('Linux inherited flock is verified in the Linux container')
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'APP', Path(temp)):
            lock = Path(temp) / 'deploy/enhe-ai-tools/runtime/enhe-operation.lock'
            lock.parent.mkdir(parents=True)
            with lock.open('a') as handle:
                os.dup2(handle.fileno(), 9)
                try:
                    fcntl.flock(9, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    with patch.dict(ops.os.environ, {'ENHE_OPERATION_LOCK_HELD': '1', 'ENHE_OPERATION_LOCK_FILE': str(lock)}):
                        with ops.operation_lock():
                            pass
                finally:
                    os.close(9)

    def test_emergency_access_rollback_waits_until_backup_releases_lock(self):
        try:
            import fcntl
        except ImportError:
            self.skipTest('Linux emergency lock wait is verified in the Linux container')
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'APP', Path(temp)), \
             patch.dict(ops.os.environ, {}, clear=True):
            (Path(temp) / 'deploy/enhe-ai-tools/runtime').mkdir(parents=True)
            entered = threading.Event()
            acquired = threading.Event()
            def emergency():
                entered.set()
                with ops.operation_lock(wait=True):
                    acquired.set()
            with ops.operation_lock():
                worker = threading.Thread(target=emergency)
                worker.start()
                self.assertTrue(entered.wait(1))
                self.assertFalse(acquired.wait(0.05))
            worker.join(2)
            self.assertFalse(worker.is_alive())
            self.assertTrue(acquired.is_set())

    def test_access_confirmation_cancels_timer_and_queued_service(self):
        with patch.object(ops, 'healthy'), patch.object(ops, 'route_status', return_value='200'), \
             patch.object(ops, 'promotion_baseline', return_value={p: '200' for p in ops.PROMOTION_PATHS}), \
             patch.object(ops, 'assert_key_only_ssh'), patch.object(ops, 'run') as command:
            ops.confirm_access()
            self.assertEqual(command.call_args.args[0], ['systemctl', 'stop',
                             ops.ROLLBACK_UNIT + '.timer', ops.ROLLBACK_UNIT + '.service'])

    def test_existing_upstream_404_is_preserved_but_proxy_failure_is_rejected(self):
        with patch.object(ops, 'route_status', return_value='404'), \
             patch.object(ops, 'run', return_value=subprocess.CompletedProcess([], 0, '404', '')):
            self.assertEqual(ops.promotion_baseline(), {p: '404' for p in ops.PROMOTION_PATHS})
        with patch.object(ops, 'route_status', return_value='502'), \
             patch.object(ops, 'run', return_value=subprocess.CompletedProcess([], 0, '404', '')):
            with self.assertRaises(RuntimeError):
                ops.promotion_baseline()

    def test_prepare_runtime_failure_compensates_permissions_cron_and_config(self):
        if not hasattr(os, 'chown'):
            self.skipTest('POSIX permission compensation is verified in the Linux container')
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            app = base / 'app'
            state = base / 'state'
            state.mkdir()
            upload = app / 'deploy/enhe-ai-tools/uploads'
            upload.mkdir(parents=True)
            upload.chmod(0o755)
            config = base / 'logrotate'
            config.write_text('original-config')
            def command(args, **kwargs):
                if args[0] == 'sh' and args[1].endswith('enhe-install-cron.sh'):
                    raise RuntimeError('fixture cron install failure')
                return subprocess.CompletedProcess(args, 0, 'existing-cron\n', '')
            with patch.object(ops, 'APP', app), patch.object(ops, 'STATE', state), \
                 patch.object(ops, 'LOGROTATE', config), patch.object(ops, 'healthy'), \
                 patch.object(ops, 'run', side_effect=command), patch.object(ops.os, 'chown'):
                with self.assertRaisesRegex(RuntimeError, 'fixture'):
                    ops.prepare_runtime()
            self.assertEqual(upload.stat().st_mode & 0o777, 0o755)
            self.assertEqual(config.read_text(), 'original-config')

    def test_access_failure_does_not_cancel_timer_before_web_verification(self):
        with patch.object(ops, 'healthy', side_effect=RuntimeError('unhealthy')), patch.object(ops, 'run') as run:
            with self.assertRaises(RuntimeError):
                ops.confirm_access()
            run.assert_not_called()

    def test_journal_refuses_overwriting_previous_recovery_point(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(ops, 'STATE', Path(temp)):
            ops.save('state.json', {'version': 1})
            with self.assertRaises(RuntimeError):
                ops.save('state.json', {'version': 2})
            self.assertEqual(ops.read('state.json'), {'version': 1})


if __name__ == '__main__':
    unittest.main()
