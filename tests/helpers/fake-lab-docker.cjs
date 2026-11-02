'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const IMAGE = 'bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27';
const JUICE_ID = 'sha256:590a451634fe564eff575ecb353a0e67ed6b3abef77005b223281663abda867e';
const RUNTIME_ID = 'sha256:' + '7'.repeat(64), NEXT_ID = 'sha256:' + '9'.repeat(64), PREFIX = 'ar.campus.ciberdefensa.';
const clone = value => structuredClone(value);
async function writeRuntimeBundle(dir, updated = false) {
  await fs.mkdir(dir, { recursive: true }); const bytes = Buffer.from(updated ? 'approved runtime updated' : 'approved runtime archive');
  const version = updated ? '1.1.0' : '1.0.0';
  const manifest = { schemaVersion: 1, version, imageId: updated ? NEXT_ID : RUNTIME_ID, imageTag: 'campus-lab-runtime:' + version, archive: 'runtime.tar.gz', sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
  await fs.writeFile(path.join(dir, 'runtime.tar.gz'), bytes); await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest)); return manifest;
}
function createDockerEngine(publishedPort) {
  const state = { calls: [], containers: new Map(), networks: new Map(), images: new Map(), ports: { 'juice-shop': publishedPort, 'soc-response': publishedPort, 'database-fundamentals': publishedPort }, proxyHealth: null, proxyHealthByPort: new Map(), fail: null, delay: 0, version: '28.5.1', os: 'linux', endpoint: 'npipe:////./pipe/dockerDesktopLinuxEngine', wrongImage: false, nextId: 10 };
  const runtime = { Id: RUNTIME_ID, Os: 'linux', Architecture: 'amd64', RepoTags: ['campus-lab-runtime:1.0.0'], RepoDigests: [], Config: { Cmd: ['python', '/app/server.py'], Entrypoint: null, Env: ['PATH=/usr/local/bin:/usr/bin:/bin', 'PYTHON_VERSION=3.13.18', 'PYTHONDONTWRITEBYTECODE=1', 'PYTHONUNBUFFERED=1', 'CAMPUS_LAB_MODE=soc', 'CAMPUS_SEED=1'], User: '10001:10001', WorkingDir: '/app', Volumes: null, ExposedPorts: { '8080/tcp': {}, '8081/tcp': {} } } };
  const juice = { Id: JUICE_ID, Os: 'linux', Architecture: 'amd64', RepoDigests: [IMAGE], Config: { Cmd: ['/nodejs/bin/node', '/juice-shop/build/app.js'], Entrypoint: null, Env: ['NODE_ENV=production'], User: '65532', WorkingDir: '/juice-shop', Volumes: null, ExposedPorts: { '3000/tcp': {} } } };
  Object.defineProperties(state, {
    container: { get() { return [...state.containers.values()].find(c => c.Config.Labels[PREFIX + 'role'] !== 'proxy') || null; }, set(value) { const previous = state.container; if (previous) state.containers.delete(previous.Name.slice(1)); if (value) state.containers.set(value.Name.slice(1), value); } },
    proxy: { get() { return [...state.containers.values()].find(c => c.Config.Labels[PREFIX + 'role'] === 'proxy') || null; } },
    net: { get() { return [...state.networks.values()].find(n => n.Internal) || null; } },
    edge: { get() { return [...state.networks.values()].find(n => !n.Internal) || null; } }
  });
  state.runner = async (exe, argv, options) => {
    assert.equal(exe, 'docker'); assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    assert.ok(options.timeout > 0 && options.timeout <= 180000); assert.ok(options.maxBuffer <= 2 * 1024 * 1024);
    assert.equal(Object.keys(options.env).some(k => k.toUpperCase().startsWith('DOCKER_')), false);
    state.calls.push([...argv]); if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.fail) throw Object.assign(new Error('sensitive-password /secret/path'), { code: state.fail });
    let a = [...argv]; if (a[0] === '--context') { assert.equal(a[1], 'desktop-linux'); a = a.slice(2); }
    const out = value => ({ stdout: JSON.stringify(value) }), flag = name => a[a.indexOf(name) + 1];
    if (a[0] === 'context' && a[1] === 'show') return { stdout: 'desktop-linux' };
    if (a[0] === 'context' && a[1] === 'inspect') return out([{ Name: 'desktop-linux', Endpoints: { docker: { Host: state.endpoint } } }]);
    if (a[0] === 'version') return out({ Version: state.version, Os: state.os });
    if (a[0] === 'image' && a[1] === 'load') { const contents = await fs.readFile(flag('--input'), 'utf8'), id = { 'approved runtime archive': RUNTIME_ID, 'approved runtime updated': NEXT_ID }[contents]; assert.ok(id, 'only known fixture bytes may load'); const image = { ...clone(runtime), Id: id }; if (id === NEXT_ID) image.Config.Env = image.Config.Env.map(e => e === 'PYTHON_VERSION=3.13.18' ? 'PYTHON_VERSION=3.13.19' : e); state.images.set(id, image); return { stdout: 'Loaded image' }; }
    if (a[0] === 'image' && a[1] === 'pull') { assert.equal(a.at(-1), IMAGE); state.images.set(IMAGE, clone(juice)); return { stdout: 'Digest: fixed' }; }
    if (a[0] === 'image' && a[1] === 'inspect') { const image = state.images.get(a[2]); if (!image) throw Error('image not found'); return out([{ ...clone(image), Id: state.wrongImage ? 'sha256:' + '8'.repeat(64) : image.Id }]); }
    if (['container', 'network'].includes(a[0]) && a[1] === 'ls') { const name = flag('--filter').slice(6, -1).replace(/^\//, ''), map = a[0] === 'container' ? state.containers : state.networks, value = map.get(name); return out(value ? [a[0] === 'container' ? { ID: value.Id, Names: name } : { ID: value.Id, Name: name }] : []); }
    if (['container', 'network'].includes(a[0]) && a[1] === 'inspect') { const map = a[0] === 'container' ? state.containers : state.networks; return out([clone([...map.values()].find(v => v.Id === a[2]))]); }
    if (a[0] === 'network' && a[1] === 'create') { const labels = {}; for (let i = 0; i < a.length; i++) if (a[i] === '--label') { const at = a[++i].indexOf('='); labels[a[i].slice(0, at)] = a[i].slice(at + 1); } const n = { Id: (state.nextId++).toString(16).padStart(64, '0'), Name: a.at(-1), Driver: flag('--driver'), Scope: 'local', Internal: a.includes('--internal'), EnableIPv6: false, Ingress: false, ConfigOnly: false, Options: {}, Containers: {}, Labels: labels }; state.networks.set(n.Name, n); return { stdout: n.Id }; }
    if (a[0] === 'container' && a[1] === 'create') {
      const image = state.images.get(a.at(-1)); assert.ok(image, 'container must use an inspected image reference'); const labels = {}, overrides = [], networks = [];
      for (let i = 0; i < a.length; i++) { if (a[i] === '--label') { const at = a[++i].indexOf('='); labels[a[i].slice(0, at)] = a[i].slice(at + 1); } else if (a[i] === '--env') overrides.push(a[++i]); else if (a[i] === '--network') networks.push(a[++i]); }
      const env = image.Config.Env.filter(e => !overrides.some(o => o.split('=')[0] === e.split('=')[0])).concat(overrides), binding = a.includes('--publish') ? flag('--publish').split(':') : null;
      const c = { Id: (state.nextId++).toString(16).padStart(64, '0'), Name: '/' + flag('--name'), Image: image.Id, Config: { ...clone(image.Config), Env: env, Image: a.at(-1), Labels: labels }, Mounts: [], State: { Running: false, Status: 'created', Dead: false, Paused: false, Restarting: false }, HostConfig: { Privileged: false, PublishAllPorts: false, AutoRemove: false, ReadonlyRootfs: a.includes('--read-only'), Memory: flag('--memory') === '512m' ? 536870912 : flag('--memory') === '768m' ? 805306368 : 0, MemorySwap: flag('--memory-swap') === '512m' ? 536870912 : flag('--memory-swap') === '768m' ? 805306368 : 0, NanoCpus: Number(flag('--cpus')) * 1e9, PidsLimit: Number(flag('--pids-limit')), CapDrop: [flag('--cap-drop')], CapAdd: null, SecurityOpt: [flag('--security-opt')], RestartPolicy: { Name: flag('--restart'), MaximumRetryCount: 0 }, PidMode: '', IpcMode: 'private', UTSMode: '', UsernsMode: '', CgroupnsMode: 'private', Runtime: 'runc', Isolation: '', NetworkMode: networks[0], PortBindings: binding ? { [binding[2] + '/tcp']: [{ HostIp: binding[0], HostPort: binding[1] }] } : {}, Binds: null, Mounts: null, VolumesFrom: null, Devices: [], DeviceRequests: null, DeviceCgroupRules: null, Links: null, ExtraHosts: null, Dns: [], DnsOptions: [], DnsSearch: [], GroupAdd: null, Sysctls: null, StorageOpt: null, Ulimits: null, CgroupParent: '', CpusetCpus: '', CpusetMems: '', ContainerIDFile: '', VolumeDriver: '', CpuQuota: 0, CpuPeriod: 0, CpuShares: 0, OomKillDisable: false, MemoryReservation: 0 }, NetworkSettings: { Ports: {}, Networks: Object.fromEntries(networks.map(n => [n, { NetworkID: '', Aliases: a.includes('--network-alias') ? [flag('--network-alias')] : null, Links: null, IPAMConfig: null, DriverOpts: null }])) } };
      state.containers.set(c.Name.slice(1), c); return { stdout: c.Id };
    }
    const c = [...state.containers.values()].find(v => v.Id === a.at(-1));
    if (a[0] === 'container' && a[1] === 'start') {
      assert.ok(c); c.State.Running = true; c.State.Status = 'running'; c.NetworkSettings.Ports = Object.fromEntries(Object.keys(c.Config.ExposedPorts).map(k => [k, null]));
      for (const [name, endpoint] of Object.entries(c.NetworkSettings.Networks)) { const n = state.networks.get(name); endpoint.NetworkID = n.Id; n.Containers[c.Id] = { Name: c.Name.slice(1) }; }
      for (const [servicePort, bindings] of Object.entries(c.HostConfig.PortBindings)) c.NetworkSettings.Ports[servicePort] = [{ HostIp: bindings[0].HostIp, HostPort: String(state.ports[c.Config.Labels[PREFIX + 'lab']]) }];
      if (c.Config.Labels[PREFIX + 'role'] === 'proxy') { const env = Object.fromEntries(c.Config.Env.map(e => { const i = e.indexOf('='); return [e.slice(0, i), e.slice(i + 1)]; })); state.proxyHealth = { service: 'campus-lab-proxy', protocolVersion: 1, targetName: env.CAMPUS_TARGET_NAME, targetPort: Number(env.CAMPUS_TARGET_PORT), targetMode: env.CAMPUS_TARGET_MODE, ready: true, backendReady: true }; state.proxyHealthByPort.set(state.ports[c.Config.Labels[PREFIX + 'lab']], state.proxyHealth); }
      return { stdout: c.Id };
    }
    if (a[0] === 'container' && a[1] === 'stop') { assert.ok(c); c.State.Running = false; c.State.Status = 'exited'; c.NetworkSettings.Ports = {}; return { stdout: c.Id }; }
    if (a[0] === 'container' && a[1] === 'rm') { assert.ok(c); for (const name of Object.keys(c.NetworkSettings.Networks)) delete state.networks.get(name).Containers[c.Id]; state.containers.delete(c.Name.slice(1)); return { stdout: c.Id }; }
    throw Error('Unexpected Docker operation ' + JSON.stringify(a));
  }; return state;
}
module.exports = { createDockerEngine, writeRuntimeBundle, IMAGE, JUICE_ID, RUNTIME_ID, NEXT_ID };
