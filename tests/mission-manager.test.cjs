'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { RealLabManager } = require('../desktop/real-labs.cjs');
const PROFILE = 'b1ec24b4-0a98-4876-a61e-23bd18d31285';
const IMAGE_ID = 'sha256:' + '7'.repeat(64);
const NEXT_IMAGE_ID = 'sha256:' + '9'.repeat(64);
const PREFIX = 'ar.campus.ciberdefensa.';
const clone = value => structuredClone(value);

// Docker is external and unavailable on this host. This boundary fake models inspect
// evidence and CLI state transitions; service requests below use actual loopback HTTP.
function engine(publishedPort) {
  const state = { calls: [], containers: new Map(), networks: new Map(), images: new Map(), ports: { 'soc-response': publishedPort, 'database-fundamentals': publishedPort }, loaded: false, wrongImage: false, nextId: 10 };
  const image = { Id: IMAGE_ID, Os: 'linux', Architecture: 'amd64', RepoTags: ['campus-lab-runtime:1.0.0'], RepoDigests: [], Config: { Cmd: ['python', '/app/server.py'], Entrypoint: null, Env: ['PATH=/usr/local/bin:/usr/bin:/bin', 'PYTHON_VERSION=3.13.18', 'PYTHONDONTWRITEBYTECODE=1', 'PYTHONUNBUFFERED=1', 'CAMPUS_LAB_MODE=soc', 'CAMPUS_SEED=1'], User: '10001:10001', WorkingDir: '/app', Volumes: null, ExposedPorts: { '8080/tcp': {} } } };
  state.runner = async (exe, argv, options) => {
    assert.equal(exe, 'docker'); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    assert.equal(Object.keys(options.env).some(k => k.toUpperCase().startsWith('DOCKER_')), false);
    state.calls.push([...argv]); let args = [...argv]; if (args[0] === '--context') args = args.slice(2);
    const out = value => ({ stdout: JSON.stringify(value) });
    const flag = name => args[args.indexOf(name) + 1];
    if (args[0] === 'context' && args[1] === 'show') return { stdout: 'desktop-linux' };
    if (args[0] === 'context' && args[1] === 'inspect') return out([{ Name: 'desktop-linux', Endpoints: { docker: { Host: 'npipe:////./pipe/dockerDesktopLinuxEngine' } } }]);
    if (args[0] === 'version') return out({ Version: '28.5.1', Os: 'linux' });
    if (args[0] === 'image' && args[1] === 'load') {
      const contents = await fs.readFile(flag('--input'), 'utf8');
      const id = { 'approved runtime archive': IMAGE_ID, 'approved runtime updated': NEXT_IMAGE_ID }[contents]; assert.ok(id, 'only test bundle bytes can load an image');
      const loaded = { ...clone(image), Id: id };
      if (id === NEXT_IMAGE_ID) loaded.Config.Env = loaded.Config.Env.map(e => e === 'PYTHON_VERSION=3.13.18' ? 'PYTHON_VERSION=3.13.19' : e);
      state.images.set(id, loaded); state.loaded = true; return { stdout: 'Loaded image' };
    }
    if (args[0] === 'image' && args[1] === 'inspect') { const loaded = state.images.get(args[2]); if (!loaded) throw Error('not found'); return out([{ ...clone(loaded), Id: state.wrongImage ? 'sha256:' + '8'.repeat(64) : loaded.Id }]); }
    if (['container', 'network'].includes(args[0]) && args[1] === 'ls') {
      const name = flag('--filter').slice(6, -1).replace(/^\//, ''); const map = args[0] === 'container' ? state.containers : state.networks; const value = map.get(name);
      return out(value ? [args[0] === 'container' ? { ID: value.Id, Names: name } : { ID: value.Id, Name: name }] : []);
    }
    if (['container', 'network'].includes(args[0]) && args[1] === 'inspect') {
      const map = args[0] === 'container' ? state.containers : state.networks;
      return out([clone([...map.values()].find(v => v.Id === args[2]))]);
    }
    if (args[0] === 'network' && args[1] === 'create') {
      const labels = {}; for (let i = 0; i < args.length; i++) if (args[i] === '--label') { const [k, v] = args[++i].split('='); labels[k] = v; }
      const network = { Id: (state.networks.size + 1).toString(16).repeat(64), Name: args.at(-1), Driver: flag('--driver'), Scope: 'local', Internal: args.includes('--internal'), EnableIPv6: false, Ingress: false, ConfigOnly: false, Options: {}, Containers: {}, Labels: labels };
      state.networks.set(network.Name, network); return { stdout: network.Id };
    }
    if (args[0] === 'container' && args[1] === 'create') {
      const source = state.images.get(args.at(-1)); assert.ok(source, 'container must use a loaded image ID'); const labels = {}; const overrides = [];
      for (let i = 0; i < args.length; i++) { if (args[i] === '--label') { const [k, v] = args[++i].split('='); labels[k] = v; } else if (args[i] === '--env') overrides.push(args[++i]); }
      const env = source.Config.Env.filter(e => !overrides.some(o => o.split('=')[0] === e.split('=')[0])).concat(overrides);
      const network = state.networks.get(flag('--network')); const binding = flag('--publish').split(':');
      const c = { Id: (state.nextId++).toString(16).padStart(64, '0'), Name: '/' + flag('--name'), Image: source.Id, Config: { ...clone(source.Config), Env: env, Image: source.Id, Labels: labels }, Mounts: [], State: { Running: false, Status: 'created', Dead: false, Paused: false, Restarting: false },
        HostConfig: { Privileged: false, PublishAllPorts: false, AutoRemove: false, ReadonlyRootfs: args.includes('--read-only'), Memory: flag('--memory') === '512m' ? 536870912 : 0, MemorySwap: flag('--memory-swap') === '512m' ? 536870912 : 0, NanoCpus: Number(flag('--cpus')) * 1e9, PidsLimit: Number(flag('--pids-limit')), CapDrop: [flag('--cap-drop')], CapAdd: null, SecurityOpt: [flag('--security-opt')], RestartPolicy: { Name: flag('--restart'), MaximumRetryCount: 0 }, PidMode: '', IpcMode: 'private', UTSMode: '', UsernsMode: '', CgroupnsMode: 'private', Runtime: 'runc', Isolation: '', NetworkMode: network.Name, PortBindings: { [binding[2] + '/tcp']: [{ HostIp: binding[0], HostPort: binding[1] }] }, Binds: null, Mounts: null, VolumesFrom: null, Devices: [], DeviceRequests: null, DeviceCgroupRules: null, Links: null, ExtraHosts: null, Dns: [], DnsOptions: [], DnsSearch: [], GroupAdd: null, Sysctls: null, StorageOpt: null, Ulimits: null, CgroupParent: '', CpusetCpus: '', CpusetMems: '', ContainerIDFile: '', VolumeDriver: '', CpuQuota: 0, CpuPeriod: 0, CpuShares: 0, OomKillDisable: false, MemoryReservation: 0 },
        NetworkSettings: { Ports: {}, Networks: { [network.Name]: { NetworkID: '', Aliases: null, Links: null, IPAMConfig: null, DriverOpts: null } } } };
      state.containers.set(c.Name.slice(1), c); return { stdout: c.Id };
    }
    const c = [...state.containers.values()].find(v => v.Id === args.at(-1));
    if (args[0] === 'container' && args[1] === 'start') { assert.ok(c); const n = state.networks.get(c.HostConfig.NetworkMode); c.State.Running = true; c.State.Status = 'running'; c.NetworkSettings.Ports = { '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: String(state.ports[c.Config.Labels[PREFIX + 'lab']]) }] }; c.NetworkSettings.Networks[n.Name].NetworkID = n.Id; n.Containers[c.Id] = { Name: c.Name.slice(1) }; return { stdout: c.Id }; }
    if (args[0] === 'container' && args[1] === 'stop') { assert.ok(c); c.State.Running = false; c.State.Status = 'exited'; c.NetworkSettings.Ports = {}; return { stdout: c.Id }; }
    if (args[0] === 'container' && args[1] === 'rm') { assert.ok(c); delete state.networks.get(c.HostConfig.NetworkMode).Containers[c.Id]; state.containers.delete(c.Name.slice(1)); return { stdout: c.Id }; }
    throw Error('Unexpected Docker operation ' + JSON.stringify(args));
  };
  return state;
}
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'campus-mission-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const runtimeDir = path.join(dir, 'assets'); await fs.mkdir(runtimeDir);
  const bytes = Buffer.from('approved runtime archive');
  const manifest = { schemaVersion: 1, version: '1.0.0', imageId: IMAGE_ID, imageTag: 'campus-lab-runtime:1.0.0', archive: 'runtime.tar.gz', sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
  await fs.writeFile(path.join(runtimeDir, 'runtime.tar.gz'), bytes); await fs.writeFile(path.join(runtimeDir, 'manifest.json'), JSON.stringify(manifest));
  const service = { mode: 'soc', ready: true, healthReady: true, redirects: false, oversized: false, events: [], calls: [], caseId: 'case-1', onRequest: null, invalidControl: false };
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk; const body = raw ? JSON.parse(raw) : null; service.calls.push({ method: req.method, path: req.url, body, headers: req.headers });
    if (service.onRequest) service.onRequest(req.url);
    const send = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (service.redirects) { res.statusCode = 302; res.setHeader('Location', 'http://example.invalid/private'); return res.end(); }
    if (service.oversized) return res.end('x'.repeat(530000));
    if (req.url === '/health') { if (!service.ready) { res.statusCode = 503; return send({ error: 'starting' }); } return send({ service: 'campus-lab-runtime', protocolVersion: 1, mode: service.mode, caseId: service.caseId, ready: service.healthReady }); }
    if (req.url === '/api/case') return send({ caseId: service.caseId, mode: service.mode, title: 'Caso', trainingAccount: { username: 'analista', password: 'campus-practica' }, actors: ['sonda', 'visitante', 'operador'] });
    if (req.url === '/api/events') return send({ caseId: service.caseId, events: service.events });
    if (['/login', '/catalog', '/admin'].includes(req.url)) { service.events.push({ id: service.events.length + 1, time: '2026-11-02T00:00:00Z', actor: req.headers['x-campus-actor'], peer: '127.0.0.1', method: req.method, path: req.url, outcome: req.url === '/login' && body.password !== 'campus-practica' ? 'failure' : 'success', status: req.url === '/login' && body.password !== 'campus-practica' ? 401 : 200 }); res.statusCode = service.events.at(-1).status; return send({ ok: res.statusCode === 200 }); }
    if (req.url === '/api/assess') return send({ caseId: service.caseId, passed: true, feedback: 'Evidencia verificada.' });
    if (req.url === '/api/control') return send({ caseId: service.caseId, action: 'block', blocked: service.invalidControl ? 'yes' : true, actor: body.actor, feedback: 'Regla local aplicada.' });
    if (req.url === '/api/query') return send({ caseId: service.caseId, columns: ['source_ip', 'failures'], rows: [['192.0.2.14', 3]], rowCount: 1, truncated: false, elapsedMs: 0.8, assessment: { passed: true, feedback: 'Coincide.' } });
    res.statusCode = 404; send({ error: 'missing' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const docker = engine(server.address().port);
  const manager = new RealLabManager({ dataDir: path.join(dir, 'data'), runtimeDir, runner: docker.runner, platform: 'win32' });
  return { dir, runtimeDir, manifest, docker, manager, service, serverPort: server.address().port };
}
const mutations = docker => docker.calls.filter(a => ['create', 'start', 'stop', 'rm', 'pull', 'load'].some(x => a.includes(x)));
async function upgradeBundle(runtimeDir, manifest) {
  const bytes = Buffer.from('approved runtime updated');
  const next = { ...manifest, version: '1.1.0', imageId: NEXT_IMAGE_ID, imageTag: 'campus-lab-runtime:1.1.0', sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
  await fs.writeFile(path.join(runtimeDir, 'runtime.tar.gz'), bytes); await fs.writeFile(path.join(runtimeDir, 'manifest.json'), JSON.stringify(next));
}

test('catalog exposes three independent recipes and rejects unknown recipe before Docker', async t => {
  const { manager, docker } = await fixture(t);
  assert.deepEqual(manager.catalog().map(r => r.id), ['juice-shop', 'soc-response', 'database-fundamentals']);
  await assert.rejects(manager.start(PROFILE, 'other-image')); assert.equal(docker.calls.length, 0);
});
test('runtime archive is verified, loaded by exact ImageID and started with isolated bounded configuration', async t => {
  const { manager, docker, service } = await fixture(t);
  const running = await manager.start(PROFILE, 'soc-response');
  assert.equal(running.state, 'running'); assert.equal(running.id, 'soc-response'); assert.equal(running.serviceHealth.caseId, 'case-1'); assert.equal(running.capabilities.replay, true); assert.equal(running.capabilities.query, false);
  const c = [...docker.containers.values()][0]; const n = [...docker.networks.values()][0];
  assert.equal(c.Config.Image, IMAGE_ID); assert.equal(c.Config.User, '10001:10001'); assert.equal(c.HostConfig.ReadonlyRootfs, true); assert.equal(c.HostConfig.Memory, 536870912); assert.equal(c.HostConfig.PidsLimit, 128); assert.equal(n.Internal, true); assert.equal(c.Config.Labels[PREFIX + 'lab'], 'soc-response'); assert.match(c.Name, /-soc-response$/); assert.match(n.Name, /-soc-response-internal$/);
  assert.ok(c.Config.Env.includes('CAMPUS_LAB_MODE=soc')); assert.match(c.Config.Env.find(e => e.startsWith('CAMPUS_SEED=')), /^CAMPUS_SEED=[1-9]\d*$/);
  assert.equal(docker.calls.some(a => a.includes('pull')), false); assert.equal(service.calls[0].path, '/health');
});
test('missing or altered bundled assets refuse load and creation without disabling legacy recipe catalog', async t => {
  const { manager, runtimeDir, docker } = await fixture(t);
  await fs.writeFile(path.join(runtimeDir, 'runtime.tar.gz'), 'tampered runtime archive');
  assert.equal((await manager.start(PROFILE, 'soc-response')).state, 'unavailable_assets');
  assert.equal(mutations(docker).length, 0);
  await fs.rm(path.join(runtimeDir, 'manifest.json')); assert.equal((await manager.start(PROFILE, 'database-fundamentals')).state, 'unavailable_assets');
  assert.equal(manager.catalog()[0].id, 'juice-shop');
});
test('a loaded image with mismatched identity never creates any container', async t => {
  const { manager, docker } = await fixture(t); docker.wrongImage = true;
  assert.equal((await manager.start(PROFILE, 'soc-response')).state, 'unsafe');
  assert.equal(docker.containers.size, 0);
});
test('health readiness and identity gate open and evidence capabilities independently of Docker running', async t => {
  const { manager, service, docker } = await fixture(t); service.ready = false;
  const waiting = await manager.start(PROFILE, 'soc-response'); assert.equal(waiting.state, 'starting'); assert.equal(waiting.url, undefined); assert.equal(waiting.capabilities.open, false); assert.equal(waiting.capabilities.stop, true);
  service.ready = true; assert.equal((await manager.status(PROFILE, 'soc-response')).state, 'running');
  service.mode = 'database'; const wrong = await manager.status(PROFILE, 'soc-response'); assert.equal(wrong.state, 'unsafe'); assert.equal(wrong.url, undefined); assert.ok(Object.values(wrong.capabilities).every(v => v === false));
  const before = mutations(docker).length; await assert.rejects(manager.replay(PROFILE, 'soc-response')); assert.equal(mutations(docker).length, before);
});
test('replay makes fixed HTTP traffic and controls derive evidence from the verified service', async t => {
  const { manager, service } = await fixture(t); await manager.start(PROFILE, 'soc-response');
  const result = await manager.replay(PROFILE, 'soc-response'); assert.equal(result.caseId, 'case-1'); assert.equal(result.generated, 6); assert.equal(result.events.length, 6);
  assert.deepEqual(service.calls.filter(c => ['/login', '/catalog', '/admin'].includes(c.path)).map(c => [c.method, c.path]), [['POST', '/login'], ['POST', '/login'], ['POST', '/login'], ['GET', '/catalog'], ['POST', '/login'], ['GET', '/admin']]);
  const assessment = await manager.assess(PROFILE, 'soc-response', { actor: 'sonda', failures: 3 }); assert.equal(assessment.passed, true);
  assert.equal((await manager.contain(PROFILE, 'soc-response', 'sonda')).blocked, true); assert.equal((await manager.events(PROFILE, 'soc-response')).events.length, 6);
  assert.ok(service.calls.every(c => c.headers.host.startsWith('127.0.0.1:') && c.headers.origin === 'http://' + c.headers.host));
});
test('SQL uses the database recipe only and invalid input never reaches a service or Docker', async t => {
  const { manager, service, docker } = await fixture(t); service.mode = 'database'; await manager.start(PROFILE, 'database-fundamentals');
  const result = await manager.query(PROFILE, 'database-fundamentals', 'SELECT source_ip, COUNT(*) AS failures FROM auth_events GROUP BY source_ip'); assert.deepEqual(result.rows, [['192.0.2.14', 3]]); assert.equal(result.assessment.passed, true);
  const calls = docker.calls.length, requests = service.calls.length;
  for (const operation of [() => manager.query(PROFILE, 'soc-response', 'SELECT 1'), () => manager.query(PROFILE, 'database-fundamentals', 'x'.repeat(8193)), () => manager.assess(PROFILE, 'soc-response', { actor: 'foreign', failures: 3 }), () => manager.contain(PROFILE, 'soc-response', '../actor'), () => manager.replay('../profile', 'soc-response')]) await assert.rejects(operation());
  assert.equal(docker.calls.length, calls); assert.equal(service.calls.length, requests);
});
test('recipe ownership drift blocks every mutation and service request; dead validated target only permits reset', async t => {
  const { manager, docker, service } = await fixture(t); await manager.start(PROFILE, 'soc-response');
  const c = [...docker.containers.values()][0]; c.Config.Env.push('UNAPPROVED=1'); const before = mutations(docker).length, requests = service.calls.length;
  for (const method of ['status', 'start', 'stop', 'reset']) { const result = await manager[method](PROFILE, 'soc-response'); assert.equal(result.state, 'unsafe'); assert.equal(result.url, undefined); assert.ok(Object.values(result.capabilities).every(v => !v)); }
  await assert.rejects(manager.events(PROFILE, 'soc-response')); assert.equal(mutations(docker).length, before); assert.equal(service.calls.length, requests);
  c.Config.Env.pop(); c.State.Running = false; c.State.Dead = true; c.State.Status = 'dead'; c.NetworkSettings.Ports = {};
  const dead = await manager.status(PROFILE, 'soc-response'); assert.equal(dead.capabilities.reset, true); assert.equal(dead.capabilities.start, false); assert.equal((await manager.reset(PROFILE, 'soc-response')).state, 'running');
});
test('redirects, oversized responses and changed case identity cannot publish ready evidence', async t => {
  const { manager, service } = await fixture(t); await manager.start(PROFILE, 'soc-response');
  service.redirects = true; assert.equal((await manager.status(PROFILE, 'soc-response')).state, 'starting'); await assert.rejects(manager.events(PROFILE, 'soc-response'));
  service.redirects = false; service.oversized = true; assert.equal((await manager.status(PROFILE, 'soc-response')).state, 'starting');
  service.oversized = false; service.onRequest = endpoint => { if (endpoint === '/api/events') { service.caseId = 'other-case'; } };
  await assert.rejects(manager.events(PROFILE, 'soc-response'));
});
test('explicit health ready false cannot advertise a running service or opening capability', async t => {
  const { manager, service } = await fixture(t); service.healthReady = false;
  const snapshot = await manager.start(PROFILE, 'soc-response'); assert.equal(snapshot.state, 'starting'); assert.equal(snapshot.capabilities.open, false); assert.equal(snapshot.serviceHealth.ready, false);
});
test('ownership changed during a service operation discards its response', async t => {
  const { manager, service, docker } = await fixture(t); service.mode = 'database'; await manager.start(PROFILE, 'database-fundamentals');
  service.onRequest = endpoint => { if (endpoint === '/api/query') [...docker.containers.values()][0].HostConfig.Privileged = true; };
  await assert.rejects(manager.query(PROFILE, 'database-fundamentals', 'SELECT 1'));
});
test('contain requires a typed acknowledgement of the requested actor', async t => {
  const { manager, service } = await fixture(t); await manager.start(PROFILE, 'soc-response'); service.invalidControl = true;
  await assert.rejects(manager.contain(PROFILE, 'soc-response', 'sonda'));
});
test('SOC and SQLite resources stay separate and resetting one preserves the other session', async t => {
  const soc = await fixture(t), db = await fixture(t); db.service.mode = 'database'; soc.docker.ports['database-fundamentals'] = db.serverPort;
  const { manager, docker } = soc;
  await manager.start(PROFILE, 'soc-response'); await manager.start(PROFILE, 'database-fundamentals');
  const resources = [...docker.containers.values()]; const socContainer = resources.find(c => c.Config.Labels[PREFIX + 'lab'] === 'soc-response'); const dbContainer = resources.find(c => c.Config.Labels[PREFIX + 'lab'] === 'database-fundamentals');
  assert.notEqual(socContainer.HostConfig.NetworkMode, dbContainer.HostConfig.NetworkMode); assert.notEqual(socContainer.Id, dbContainer.Id);
  const dbId = dbContainer.Id; const before = mutations(docker).length;
  assert.equal((await manager.reset(PROFILE, 'soc-response')).state, 'running'); assert.equal((await manager.status(PROFILE, 'database-fundamentals')).state, 'running');
  const changed = mutations(docker).slice(before); assert.equal(changed.some(a => a.includes(dbId)), false); assert.equal([...docker.containers.values()].find(c => c.Id === dbId).State.Running, true);
  assert.deepEqual(Object.keys(docker.networks.get(dbContainer.HostConfig.NetworkMode).Containers), [dbId]);
});
test('a bundled runtime update keeps verified old targets stoppable and resets only that target onto the new image', async t => {
  const { manager, docker, runtimeDir, manifest, service } = await fixture(t);
  await manager.start(PROFILE, 'soc-response'); const old = [...docker.containers.values()][0];
  await upgradeBundle(runtimeDir, manifest);
  const updated = new RealLabManager({ dataDir: manager.dataDir, runtimeDir, runner: docker.runner });
  const snapshot = await updated.status(PROFILE, 'soc-response');
  assert.equal(snapshot.state, 'runtime_update'); assert.equal(snapshot.imageVersion, '1.0.0'); assert.equal(snapshot.availableVersion, '1.1.0'); assert.equal(snapshot.capabilities.stop, true); assert.equal(snapshot.capabilities.reset, true); assert.equal(snapshot.capabilities.open, false); assert.equal(snapshot.capabilities.replay, false); assert.equal(snapshot.url, undefined);
  const before = mutations(docker).length, requests = service.calls.length;
  await assert.rejects(updated.replay(PROFILE, 'soc-response')); assert.equal((await updated.start(PROFILE, 'soc-response')).state, 'runtime_update'); assert.equal(mutations(docker).length, before); assert.equal(service.calls.length, requests);
  const stopped = await updated.stop(PROFILE, 'soc-response'); assert.equal(stopped.state, 'runtime_update'); assert.equal(stopped.capabilities.stop, false); assert.equal(stopped.capabilities.reset, true);
  const reset = await updated.reset(PROFILE, 'soc-response'); assert.equal(reset.state, 'running'); assert.equal(reset.imageVersion, '1.1.0');
  const replacement = [...docker.containers.values()][0]; assert.notEqual(replacement.Id, old.Id); assert.equal(replacement.Image, NEXT_IMAGE_ID); assert.ok(replacement.Config.Env.includes('PYTHON_VERSION=3.13.19'));
  assert.equal(mutations(docker).filter(a => a.includes('rm')).length, 1);
});
test('runtime updates never adopt an old image ID without recorded prior verification', async t => {
  const { manager, docker, runtimeDir, manifest } = await fixture(t); await manager.start(PROFILE, 'soc-response'); await upgradeBundle(runtimeDir, manifest);
  await fs.rm(path.join(manager.dataDir, 'real-labs-runtime-history.json'), { force: true });
  const updated = new RealLabManager({ dataDir: manager.dataDir, runtimeDir, runner: docker.runner }); const before = mutations(docker).length;
  for (const method of ['status', 'start', 'stop', 'reset']) { const result = await updated[method](PROFILE, 'soc-response'); assert.equal(result.state, 'unsafe'); assert.ok(Object.values(result.capabilities).every(v => !v)); }
  assert.equal(mutations(docker).length, before);
});
test('old runtime ownership or configuration drift stays unsafe even with trusted runtime history', async t => {
  const { manager, docker, runtimeDir, manifest } = await fixture(t); await manager.start(PROFILE, 'soc-response'); await upgradeBundle(runtimeDir, manifest);
  [...docker.containers.values()][0].Config.Env.push('UNAPPROVED=1'); const before = mutations(docker).length;
  for (const method of ['status', 'stop', 'reset']) assert.equal((await manager[method](PROFILE, 'soc-response')).state, 'unsafe');
  assert.equal(mutations(docker).length, before);
});
test('corrupt or foreign-instance runtime history never grants recovery control', async t => {
  const { manager, docker, runtimeDir, manifest } = await fixture(t); await manager.start(PROFILE, 'soc-response'); await upgradeBundle(runtimeDir, manifest);
  const file = path.join(manager.dataDir, 'real-labs-runtime-history.json'); const approved = JSON.parse(await fs.readFile(file, 'utf8')); const before = mutations(docker).length;
  for (const contents of ['{', JSON.stringify({ ...approved, instanceId: '00000000-0000-4000-8000-000000000000' }), JSON.stringify({ ...approved, images: [{ ...approved.images[0], config: { ...approved.images[0].config, User: '0' } }] })]) {
    await fs.writeFile(file, contents);
    for (const method of ['status', 'stop', 'reset']) { const result = await manager[method](PROFILE, 'soc-response'); assert.equal(result.state, 'unsafe'); assert.equal(result.capabilities.reset, false); }
  }
  assert.equal(mutations(docker).length, before);
});
