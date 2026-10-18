#!/usr/bin/env python3
"""Explicit, reversible OPS-001..005 steps. No application data or image deletion.

Run plan first. Other phases are production mutations and require authorization.
The fixed paths/candidate names intentionally fail closed on a different host.
Only metadata and small system configuration are stored in the root-only journal.
"""
import argparse
from contextlib import contextmanager
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import time
from urllib.parse import urlsplit

APP = Path('/opt/enhe-ai-tools')
STATE = Path('/opt/enhe-operations-backups/audit-20261018')
EDGE = Path('/opt/enhe-edge')
OLD_GATEWAY = 'hot-content-nginx'
NEW_GATEWAY = 'enhe-edge-nginx'
OLD_CONFIG = Path('/opt/hot-content-os/app/hot-content-os/infra/nginx/default.conf')
HOOK = Path('/etc/letsencrypt/renewal-hooks/deploy/reload-hot-content-nginx.sh')
SSH_CONFIG = Path('/etc/ssh/sshd_config.d/00-enhe-audit-hardening.conf')
GUARD = Path('/usr/local/sbin/enhe-port-guard.sh')
GUARD_UNIT = Path('/etc/systemd/system/enhe-port-guard.service')
LOGROTATE = Path('/etc/logrotate.d/enhe-operations')
ROLLBACK_UNIT = 'enhe-audit-access-rollback'
NETWORKS = ('enhe-ai-tools-net', 'hot-content-os_default')
PRIVATE_PORTS = (3000, 8000, 5432, 6379, 3030)
PROMOTION_PATHS = ('/promotion-manager/', '/api/promotion-manager/')
LEGACY = (
    'enhe-g2r1-rollback-app', 'enhe-g2r1-rollback-db',
    'enhe-g2r1-full-health-worker', 'enhe-g2r1-full-health-scheduler',
    'enhe-g2r1-full-health-app', 'enhe-g2r1-full-health-db',
    'enhe-full-health-scheduler-20260920050351-1155828',
    'enhe-full-health-worker-20260920050351-1155828',
    'enhe-full-health-app-20260920050351-1155828',
    'enhe-full-health-db-20260920050351-1155828',
    'enhe-candidate-app-20260920043338-1114947',
    'enhe-rollback-db-20260920043338-1114947',
)


def run(args, *, check=True, input=None, env=None):
    # Capture output: inspect/env and system configuration must not enter logs.
    result = subprocess.run(args, input=input, env=env, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(f'command failed: {args[0]} (exit {result.returncode}); inspect securely on host')
    return result


def inspect(name):
    return json.loads(run(['docker', 'inspect', name]).stdout)[0]


def save(name, value):
    target = STATE / name
    if target.exists():
        raise RuntimeError(f'journal already exists: {name}; use the recorded rollback or inspect before retry')
    target.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    target.chmod(0o600)


def read(name):
    return json.loads((STATE / name).read_text(encoding='utf-8'))


def backup_file(path, key):
    if path.is_symlink():
        raise RuntimeError(f'refusing symlink configuration: {path}')
    record = {'path': str(path), 'exists': path.exists()}
    if path.exists():
        info = path.stat()
        record.update(uid=info.st_uid, gid=info.st_gid, mode=stat.S_IMODE(info.st_mode))
        shutil.copyfile(path, STATE / (key + '.original'))
        (STATE / (key + '.original')).chmod(0o600)
    save(key + '.json', record)


def restore_file(key):
    info = read(key + '.json')
    path = Path(info['path'])
    if info['exists']:
        shutil.copyfile(STATE / (key + '.original'), path)
        os.chown(path, info['uid'], info['gid'])
        path.chmod(info['mode'])
    else:
        path.unlink(missing_ok=True)


def safe_tree(path, root):
    """Never follow a symlink, including a symlink in an ancestor."""
    if path.resolve() != path.absolute() or root.resolve() != root.absolute():
        raise RuntimeError('symlink or noncanonical operation path')
    if path != root and root not in path.parents:
        raise RuntimeError('operation target escapes its authorized root')
    if not path.exists():
        return []
    files = [path]
    for parent, dirs, names in os.walk(path, followlinks=False):
        for name in dirs + names:
            child = Path(parent) / name
            if child.is_symlink():
                raise RuntimeError('symlink found in scoped permission tree; manual review required')
            files.append(child)
    return files


def healthy():
    result = run(['curl', '-fsS', '--max-time', '15', 'http://127.0.0.1:3001/api/health'])
    if json.loads(result.stdout).get('status') != 'ok':
        raise RuntimeError('application health did not return ok')


def route_status(path):
    return run(['curl', '-sS', '--max-time', '15', '--resolve',
                'www.enhe-tech.com.cn:443:127.0.0.1', '-o', '/dev/null', '-w', '%{http_code}',
                'https://www.enhe-tech.com.cn' + path]).stdout.strip()


def promotion_baseline():
    result = {}
    for path in PROMOTION_PATHS:
        edge_status = route_status(path)
        upstream_status = run(['curl', '-sS', '--max-time', '15', '-H', 'Host: www.enhe-tech.com.cn',
                               '-o', '/dev/null', '-w', '%{http_code}',
                               'http://127.0.0.1:3030' + path]).stdout.strip()
        # These existing prefix roots return404 from the3030 server itself.
        # Preserve that measured baseline; do not claim its business UI works.
        if edge_status not in ('200', '301', '302', '307', '308', '401', '403', '404') or upstream_status != edge_status:
            raise RuntimeError('promotion-manager edge/upstream baseline is unreachable or inconsistent')
        result[path] = edge_status
    return result


def prepare_runtime():
    healthy()
    deploy = APP / 'deploy/enhe-ai-tools'
    paths = []
    for name in ('uploads', 'private-uploads', 'forum-media', 'logs', 'runtime'):
        paths.extend(safe_tree(deploy / name, deploy))
    backup = APP / 'backups/db'
    backup_paths = safe_tree(backup, APP)
    # Do not change secret permissions. Prove the eventual runtime can read them.
    run(['docker', 'exec', '--user', '1000:1000', 'enhe-ai-tools-app', 'sh', '-c',
         'test -x /app/secrets || exit 1; for f in /app/secrets/*; do '
         '[ -f "$f" ] || continue; [ -r "$f" ] || exit 1; done'])
    run(['docker', 'exec', '--user', '1000:1000', 'enhe-ai-tools-seo-audit-worker',
         'test', '-r', '/app/audit-engine/site_audit.py'])
    installer = Path(__file__).resolve().parent / 'enhe-install-cron.sh'
    if not installer.is_file():
        raise RuntimeError('reviewed cron installer must accompany the operations package')
    logrotate_config = (str(APP / 'backups/*.log') + ' {\n  daily\n  rotate 14\n  compress\n  delaycompress\n'
                        '  missingok\n  notifempty\n  copytruncate\n  su root root\n}\n')
    check_config = STATE / 'logrotate.check'
    check_config.write_text(logrotate_config, encoding='utf-8')
    run(['logrotate', '-d', str(check_config)])
    # Snapshot the complete rollback set before changing any permission or cron.
    save('permissions.json', [{'path': str(p), 'uid': p.stat().st_uid, 'gid': p.stat().st_gid,
                              'mode': stat.S_IMODE(p.stat().st_mode)} for p in paths + backup_paths])
    for user in ('root', 'ubuntu'):
        result = run(['crontab', '-u', user, '-l'], check=False)
        save('cron-' + user + '.json', {'present': result.returncode == 0, 'text': result.stdout})
    backup_file(LOGROTATE, 'logrotate')
    try:
        for p in paths:
            os.chown(p, 1000, 1000)
            # Preserve existing read access; ensure the owner can write its mount.
            p.chmod(stat.S_IMODE(p.stat().st_mode) | (0o700 if p.is_dir() else 0o600))
        private = deploy / 'private-uploads'
        private.mkdir(exist_ok=True, mode=0o700)
        os.chown(private, 1000, 1000)
        private.chmod(0o700)
        for p in backup_paths:
            os.chown(p, 0, 0)
            p.chmod(0o700 if p.is_dir() else 0o600)
        run(['sh', str(installer)], env={**os.environ, 'APP_DIR': str(APP)})
        LOGROTATE.write_text(logrotate_config, encoding='utf-8')
        LOGROTATE.chmod(0o644)
    except Exception:
        rollback_runtime()
        raise
    print('prepared: scoped mount ownership, root schedules, backup permissions, bounded operation logs')


def rollback_runtime():
    for record in read('permissions.json'):
        path = Path(record['path'])
        if path.exists() and not path.is_symlink():
            os.chown(path, record['uid'], record['gid'])
            path.chmod(record['mode'])
    for user in ('root', 'ubuntu'):
        if not (STATE / ('cron-' + user + '.json')).exists():
            continue
        record = read('cron-' + user + '.json')
        if record['present']:
            run(['crontab', '-u', user, '-'], input=record['text'])
        else:
            run(['crontab', '-u', user, '-r'], check=False)
    if (STATE / 'logrotate.json').exists():
        restore_file('logrotate')
    print('restored pre-change ownership, schedules and log rotation; new business files were preserved')


def gateway_compose(image):
    return {'name': 'enhe-edge', 'services': {'nginx': {
        'image': image, 'container_name': NEW_GATEWAY, 'restart': 'unless-stopped',
        'ports': ['80:80', '443:443'], 'mem_limit': '256m', 'cpus': 1.0, 'pids_limit': 128,
        'logging': {'driver': 'json-file', 'options': {'max-size': '10m', 'max-file': '5'}},
        'volumes': [str(EDGE / 'nginx/default.conf') + ':/etc/nginx/conf.d/default.conf:ro',
                    '/etc/letsencrypt:/etc/letsencrypt:ro'], 'networks': list(NETWORKS),
    }}, 'networks': {name: {'external': True, 'name': name} for name in NETWORKS}}


def migrate_gateway():
    healthy()
    old = inspect(OLD_GATEWAY)
    if not old['State']['Running'] or set(old['NetworkSettings']['Networks']) != set(NETWORKS):
        raise RuntimeError('original gateway topology changed; re-audit before migrating')
    mounts = {m['Destination']: m['Source'] for m in old['Mounts']}
    if mounts != {'/etc/nginx/conf.d/default.conf': str(OLD_CONFIG), '/etc/letsencrypt': '/etc/letsencrypt'}:
        raise RuntimeError('gateway mounts changed; preserve additional mounts before proceeding')
    config = OLD_CONFIG.read_bytes()
    for required in (b'/promotion-manager/', b'/api/promotion-manager/', b'172.20.0.1:3030',
                     b'proxy_set_header X-Real-IP $remote_addr'):
        if required not in config:
            raise RuntimeError('expected existing route/header contract is absent')
    if EDGE.exists():
        raise RuntimeError('independent gateway directory already exists; inspect before retry')
    promotion_statuses = promotion_baseline()
    save('gateway.json', {'id': old['Id'], 'image': old['Image'],
                         'restart': old['HostConfig']['RestartPolicy'],
                         'sha256': hashlib.sha256(config).hexdigest(), 'promotion_statuses': promotion_statuses})
    backup_file(HOOK, 'certificate-hook')
    (EDGE / 'nginx').mkdir(parents=True, mode=0o755)
    (EDGE / 'nginx/default.conf').write_bytes(config)
    (EDGE / 'nginx/default.conf').chmod(0o600)
    compose = EDGE / 'compose.json'
    compose.write_text(json.dumps(gateway_compose(old['Image']), indent=2) + '\n', encoding='utf-8')
    compose.chmod(0o600)
    command = ['docker', 'compose', '-f', str(compose)]
    run(command + ['run', '--rm', '--no-deps', 'nginx', 'nginx', '-t'])
    try:
        run(['docker', 'update', '--restart=no', OLD_GATEWAY])
        run(['docker', 'stop', '--time', '20', OLD_GATEWAY])
        run(command + ['up', '-d', '--no-build'])
        for attempt in range(10):
            try:
                if route_status('/api/health') != '200' or any(route_status(path) != status for path, status in promotion_statuses.items()):
                    raise RuntimeError('gateway route verification failed')
                healthy()
                break
            except RuntimeError:
                if attempt == 9:
                    raise
                time.sleep(2)
        HOOK.write_text('#!/bin/sh\nset -eu\n'
                        'for name in enhe-edge-nginx hot-content-nginx; do\n'
                        '  if [ "$(docker inspect -f \'{{.State.Running}}\' "$name" 2>/dev/null || true)" = true ]; then\n'
                        '    docker exec "$name" nginx -t\n    docker exec "$name" nginx -s reload\n    exit 0\n'
                        '  fi\ndone\necho "No active ENHE gateway" >&2\nexit 1\n', encoding='utf-8')
        HOOK.chmod(0o755)
    except Exception:
        rollback_gateway()
        raise
    print('gateway migrated; byte-identical routes, TLS, 3030 route and app health verified; old gateway retained stopped')


def restart_argument(policy):
    return policy['Name'] + (':' + str(policy['MaximumRetryCount'])
                            if policy['Name'] == 'on-failure' and policy.get('MaximumRetryCount') else '')


def rollback_gateway():
    record = read('gateway.json')
    if inspect(OLD_GATEWAY)['Id'] != record['id']:
        raise RuntimeError('original gateway identity mismatch')
    run(['docker', 'stop', '--time', '20', NEW_GATEWAY], check=False)
    run(['docker', 'update', '--restart=no', NEW_GATEWAY], check=False)
    run(['docker', 'update', '--restart=' + restart_argument(record['restart']), OLD_GATEWAY])
    run(['docker', 'start', OLD_GATEWAY])
    restore_file('certificate-hook')
    print('gateway rollback restored original container and renewal hook')


def port_guard():
    ports = ','.join(map(str, PRIVATE_PORTS))
    return f'''#!/bin/sh
set -eu
action="${{1:-apply}}"
case "$action" in apply|remove) ;; *) exit 2 ;; esac
for tool in iptables ip6tables; do
  command -v "$tool" >/dev/null || continue
  for chain in INPUT DOCKER-USER; do
    "$tool" -w -S "$chain" >/dev/null 2>&1 || continue
    set -- -i eth0 -p tcp -m multiport --dports {ports} -m comment --comment enhe-audit-private-ports -j DROP
    if [ "$action" = apply ]; then
      "$tool" -w -C "$chain" "$@" 2>/dev/null || "$tool" -w -I "$chain" 1 "$@"
    else
      while "$tool" -w -C "$chain" "$@" 2>/dev/null; do "$tool" -w -D "$chain" "$@"; done
    fi
  done
done
'''


def assert_key_only_ssh():
    effective = dict(line.split(' ', 1) for line in run(['sshd', '-T']).stdout.splitlines() if ' ' in line)
    required = {'passwordauthentication': 'no', 'kbdinteractiveauthentication': 'no', 'pubkeyauthentication': 'yes'}
    if any(effective.get(key) != value for key, value in required.items()):
        raise RuntimeError('SSH effective configuration does not meet key-only contract')
    if effective.get('permitrootlogin') not in ('prohibit-password', 'without-password'):
        raise RuntimeError('root key-only emergency access contract was not applied')


def harden_access():
    if 'dev eth0' not in run(['ip', 'route', 'get', '1.1.1.1']).stdout:
        raise RuntimeError('external interface changed; manual review required')
    run(['sshd', '-t'])
    run(['systemctl', 'is-active', 'ssh'])
    run(['iptables', '-w', '-S', 'INPUT'])
    run(['iptables', '-w', '-S', 'DOCKER-USER'])
    for path, key in ((SSH_CONFIG, 'ssh-config'), (GUARD, 'port-guard'), (GUARD_UNIT, 'port-guard-unit')):
        backup_file(path, key)
    # A root-only, frozen copy is independent of future repository deployments.
    rollback_script = STATE / 'operations.py'
    shutil.copyfile(Path(__file__), rollback_script)
    rollback_script.chmod(0o700)
    run(['systemd-run', '--unit=' + ROLLBACK_UNIT, '--on-active=5m', '/usr/bin/python3',
         str(rollback_script), 'rollback-access'])
    try:
        SSH_CONFIG.write_text('PasswordAuthentication no\nKbdInteractiveAuthentication no\n'
                              'PubkeyAuthentication yes\nPermitRootLogin prohibit-password\n', encoding='utf-8')
        SSH_CONFIG.chmod(0o600)
        run(['sshd', '-t'])
        assert_key_only_ssh()
        GUARD.write_text(port_guard(), encoding='utf-8')
        GUARD.chmod(0o700)
        GUARD_UNIT.write_text('[Unit]\nDescription=ENHE private port ingress guard\n'
                              'After=network-online.target docker.service\nPartOf=docker.service\n'
                              '[Service]\nType=oneshot\nRemainAfterExit=yes\n'
                              'ExecStart=/usr/local/sbin/enhe-port-guard.sh apply\n'
                              '[Install]\nWantedBy=multi-user.target docker.service\n', encoding='utf-8')
        GUARD_UNIT.chmod(0o644)
        run(['systemctl', 'daemon-reload'])
        run(['systemctl', 'enable', '--now', 'enhe-port-guard.service'])
        run(['systemctl', 'reload', 'ssh'])
        healthy()
    except Exception:
        rollback_access()
        raise
    print('access restrictions active; AUTO-ROLLBACK IN 5 MINUTES. Open a fresh key-only SSH session, verify HTTPS/3030, then confirm-access')


def confirm_access():
    # The caller must use a fresh SSH connection. Do not auto-confirm in apply.
    healthy()
    if route_status('/api/health') != '200':
        raise RuntimeError('web route verification failed; timed rollback remains armed')
    current_promotion = promotion_baseline()
    if (STATE / 'gateway.json').exists() and current_promotion != read('gateway.json')['promotion_statuses']:
        raise RuntimeError('promotion route baseline changed; timed rollback remains armed')
    assert_key_only_ssh()
    run(['systemctl', 'is-active', 'enhe-port-guard.service'])
    # The timer may have fired and its service may be waiting for this same
    # project lock. Cancel both, so a queued rollback cannot undo confirmation.
    run(['systemctl', 'stop', ROLLBACK_UNIT + '.timer', ROLLBACK_UNIT + '.service'])
    print('confirmed after separate key-only connection; automatic access rollback cancelled')


def rollback_access():
    if GUARD.exists():
        run(['sh', str(GUARD), 'remove'], check=False)
    run(['systemctl', 'disable', '--now', 'enhe-port-guard.service'], check=False)
    for key in ('ssh-config', 'port-guard', 'port-guard-unit'):
        if (STATE / (key + '.json')).exists():
            restore_file(key)
    run(['sshd', '-t'])
    run(['systemctl', 'reload', 'ssh'])
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'stop', ROLLBACK_UNIT + '.timer'], check=False)
    print('SSH configuration and only the audit-owned port restrictions rolled back')


def db_target(container):
    values = dict(item.split('=', 1) for item in container['Config'].get('Env', []) if '=' in item)
    parsed = urlsplit(values.get('DATABASE_URL', ''))
    return (parsed.hostname, parsed.port or 5432, parsed.path) if parsed.hostname else None


def legacy_candidates(containers, production, nginx):
    live_mounts = {m['Source'] for c in production for m in c['Mounts']}
    live_targets = {db_target(c) for c in production if db_target(c)}
    now = datetime.datetime.now(datetime.timezone.utc)
    for c in containers:
        name = c['Name'].lstrip('/')
        if name not in LEGACY or name in nginx:
            raise RuntimeError('legacy candidate is not allowlisted or is referenced by nginx')
        if any(m['Source'] in live_mounts for m in c['Mounts']):
            raise RuntimeError('legacy candidate shares a production mount')
        if db_target(c) in live_targets:
            raise RuntimeError('legacy candidate connects to production database target')
        created = datetime.datetime.fromisoformat(c['Created'].replace('Z', '+00:00'))
        if (now - created).days < 7:
            raise RuntimeError('legacy candidate is unexpectedly recent')
    return [{'name': c['Name'].lstrip('/'), 'id': c['Id'], 'image': c['Image'],
             'running': c['State']['Running'], 'restart': c['HostConfig']['RestartPolicy']}
            for c in containers]


def retire_legacy():
    healthy()
    production = [inspect(n) for n in ('enhe-ai-tools-app', 'enhe-ai-tools-db',
                                      'enhe-ai-tools-seo-audit-worker', 'enhe-ai-tools-seo-audit-scheduler')]
    config_path = EDGE / 'nginx/default.conf' if (EDGE / 'nginx/default.conf').exists() else OLD_CONFIG
    config = config_path.read_text(encoding='utf-8')
    legacy = [inspect(n) for n in LEGACY]
    candidates = legacy_candidates(legacy, production, config)
    # Docker networking membership alone is not a dependency. Exclude linked
    # containers explicitly and preserve all stable staging / unrelated services.
    all_ids = run(['docker', 'ps', '-aq']).stdout.split()
    all_containers = json.loads(run(['docker', 'inspect', *all_ids]).stdout)
    for c in all_containers:
        if c['Name'].lstrip('/') in LEGACY:
            continue
        dependencies = ' '.join(c['HostConfig'].get('Links') or [])
        dependencies += ' '.join(c['HostConfig'].get('VolumesFrom') or [])
        dependencies += ' '.join(c['Config'].get('Env') or [])
        if any(name in dependencies for name in LEGACY):
            raise RuntimeError('a retained container references a legacy candidate')
        retained_mounts = {m['Source'] for m in c['Mounts']}
        for candidate in legacy:
            if any(m['Source'] in retained_mounts for m in candidate['Mounts']):
                raise RuntimeError('a legacy mount is shared with a retained service')
            shared_networks = set(c['NetworkSettings']['Networks']) & set(candidate['NetworkSettings']['Networks'])
            for network in shared_networks:
                aliases = candidate['NetworkSettings']['Networks'][network].get('Aliases') or []
                for entry in c['Config'].get('Env') or []:
                    value = entry.split('=', 1)[-1]
                    if '://' in value:
                        try:
                            host = urlsplit(value).hostname
                        except ValueError:
                            continue
                        if host and host in aliases:
                            raise RuntimeError('a retained service URL references a legacy network alias')
    save('legacy.json', candidates)
    try:
        for record in candidates:
            run(['docker', 'update', '--restart=no', record['name']])
            if record['running']:
                run(['docker', 'stop', '--time', '30', record['name']])
        healthy()
    except Exception:
        rollback_legacy()
        raise
    print(f'retired {len(candidates)} historical drill containers; retained stopped containers, images and volumes for recovery')


def rollback_legacy():
    for record in read('legacy.json'):
        if inspect(record['name'])['Id'] != record['id']:
            raise RuntimeError('legacy recovery container identity mismatch')
        run(['docker', 'update', '--restart=' + restart_argument(record['restart']), record['name']])
        if record['running']:
            run(['docker', 'start', record['name']])
    print('historical containers restored to their recorded running/restart states')


def plan():
    print(json.dumps({'production': str(APP), 'journal': str(STATE), 'gateway': str(EDGE),
                      'private_ports': PRIVATE_PORTS, 'external_interface': 'eth0',
                      'retirement_candidates': LEGACY, 'deletes_business_data': False}, indent=2))


def preflight(phase):
    commands = {
        'prepare-runtime': ('docker', 'curl', 'crontab', 'id', 'sh', 'logrotate'),
        'rollback-runtime': ('crontab',),
        'migrate-gateway': ('docker', 'curl'), 'rollback-gateway': ('docker',),
        'harden-access': ('docker', 'curl', 'ip', 'iptables', 'sshd', 'systemctl', 'systemd-run', 'sh'),
        'confirm-access': ('curl', 'systemctl', 'sshd'),
        'rollback-access': ('sh', 'iptables', 'sshd', 'systemctl'),
        'retire-legacy': ('docker', 'curl'), 'rollback-legacy': ('docker',),
    }
    missing = [name for name in commands.get(phase, ()) if shutil.which(name) is None]
    if missing:
        raise RuntimeError('missing required commands before mutation: ' + ', '.join(missing))


@contextmanager
def operation_lock(*, wait=False):
    # Same inode as enhe-operation-lock.sh; no separate competing ops lock.
    import fcntl
    lock = APP / 'deploy/enhe-ai-tools/runtime/enhe-operation.lock'
    if os.environ.get('ENHE_OPERATION_LOCK_HELD') == '1':
        if os.environ.get('ENHE_OPERATION_LOCK_FILE') != str(lock) or os.readlink('/proc/self/fd/9') != str(lock):
            raise RuntimeError('invalid inherited project operation lock')
        fcntl.flock(9, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    else:
        with lock.open('a') as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | (0 if wait else fcntl.LOCK_NB))
            except BlockingIOError as error:
                raise RuntimeError('another deployment/backup/operation holds the project lock') from error
            yield


def main():
    actions = {'plan': plan, 'prepare-runtime': prepare_runtime, 'rollback-runtime': rollback_runtime,
               'migrate-gateway': migrate_gateway, 'rollback-gateway': rollback_gateway,
               'harden-access': harden_access, 'confirm-access': confirm_access,
               'rollback-access': rollback_access, 'retire-legacy': retire_legacy, 'rollback-legacy': rollback_legacy}
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=actions)
    args = parser.parse_args()
    if args.phase != 'plan':
        if os.geteuid() != 0:
            parser.error('production operation requires root')
        if not APP.is_dir() or APP.resolve() != APP:
            parser.error('expected production repository is absent or redirected')
        if STATE.resolve() != STATE:
            parser.error('operation journal path is redirected')
        preflight(args.phase)
        os.umask(0o077)
        STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
        STATE.chmod(0o700)
        # A one-shot emergency timer must not lose its rollback merely because
        # a scheduled backup held the lock at that instant. Other phases stay
        # nonblocking; only access rollback waits for the current owner to exit.
        with operation_lock(wait=args.phase == 'rollback-access'):
            actions[args.phase]()
    else:
        actions[args.phase]()


if __name__ == '__main__':
    main()
