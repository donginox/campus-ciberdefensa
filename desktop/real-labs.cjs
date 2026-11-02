'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFile } = require('node:child_process');
const { id: profileId } = require('./validation.cjs');

const IMAGE = 'bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27';
const PREFIX = 'ar.campus.ciberdefensa.';
const OWNER = 'campus-ciberdefensa';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const RESOURCE_ID = /^[a-f0-9]{64}$/;
const queues = new Map();
class Unsafe extends Error {}
function defaultRunner(exe, args, options) {
  return new Promise((resolve, reject) => execFile(exe, args, options, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr })));
}
function cleanEnvironment() { return Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('DOCKER_'))); }
function localEndpoint(value) { return typeof value === 'string' && (/^unix:\/\/\/[^\0\r\n]+$/.test(value) || /^npipe:\/\/\/\/[.]\/pipe\/[A-Za-z0-9_.-]+$/.test(value)); }
function empty(value) { return value == null || (Array.isArray(value) ? value.length === 0 : typeof value === 'object' && Object.keys(value).length === 0); }
function equal(a, b) { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }
function requireSafe(condition) { if (!condition) throw new Unsafe('Configuración o propiedad no verificable.'); }
function port(value) { return typeof value === 'string' && /^\d{4,5}$/.test(value) && Number(value) >= 2000 && Number(value) <= 65535; }
function one(value) { requireSafe(Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === 'object'); return value[0]; }

class RealLabManager {
  constructor({ dataDir, runner = defaultRunner, platform = process.platform }) {
    if (typeof dataDir !== 'string' || !path.isAbsolute(dataDir) || typeof runner !== 'function') throw new Error('Configuración del laboratorio inválida.');
    this.dataDir = path.resolve(dataDir); this.runner = runner; this.platform = platform;
  }
  _serialize(operation) {
    const previous = queues.get(this.dataDir) || Promise.resolve();
    const next = previous.catch(() => {}).then(operation); queues.set(this.dataDir, next);
    next.finally(() => { if (queues.get(this.dataDir) === next) queues.delete(this.dataDir); }).catch(() => {});
    return next;
  }
  async _run(args, { context, timeout = 15000, json = false, lines = false } = {}) {
    const result = await this.runner('docker', context ? ['--context', context, ...args] : args, { shell: false, windowsHide: true, timeout, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8', env: cleanEnvironment() });
    if (!result || typeof result.stdout !== 'string' || Buffer.byteLength(result.stdout) > 2 * 1024 * 1024) throw new Error('Respuesta inválida del motor.');
    if (!json) return result.stdout.trim();
    try { return lines ? result.stdout.trim().split(/\r?\n/).filter(Boolean).flatMap(line => { const value = JSON.parse(line); return Array.isArray(value) ? value : [value]; }) : JSON.parse(result.stdout); }
    catch { throw new Error('Respuesta inválida del motor.'); }
  }
  _setupUrl() { return this.platform === 'win32' ? 'https://docs.docker.com/desktop/setup/install/windows-install/' : this.platform === 'darwin' ? 'https://docs.docker.com/desktop/setup/install/mac-install/' : 'https://docs.docker.com/engine/install/'; }
  async _doctor() {
    const result = (ready, code, message, extra = {}) => ({ ready, code, message, setupUrl: this._setupUrl(), ...extra });
    try {
      const dockerEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase().startsWith('DOCKER_')).map(([key, value]) => [key.toUpperCase(), value]));
      if (dockerEnv.DOCKER_HOST && !localEndpoint(dockerEnv.DOCKER_HOST)) return { doctor: result(false, 'unsafe_context', 'Solo se permiten motores Docker locales por npipe o Unix socket.') };
      const context = dockerEnv.DOCKER_CONTEXT || await this._run(['context', 'show']);
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(context)) return { doctor: result(false, 'unsafe_context', 'El contexto Docker no es válido.') };
      const contexts = await this._run(['context', 'inspect', context], { json: true });
      const selected = one(contexts);
      if (selected.Name !== context || !localEndpoint(selected.Endpoints?.docker?.Host)) return { doctor: result(false, 'unsafe_context', 'El contexto Docker debe usar un motor local por npipe o Unix socket.') };
      const server = await this._run(['version', '--format', '{{json .Server}}'], { context, json: true });
      if (typeof server?.Version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9_.-]+)?$/.test(server.Version) || Number(server.Version.split('.')[0]) < 28 || server.Os !== 'linux') return { doctor: result(false, 'unsupported_engine', 'Se necesita Docker Engine 28 o posterior con contenedores Linux.') };
      return { context, doctor: result(true, 'ready', 'Docker local disponible. El objetivo se ejecuta en un contenedor Linux.', { version: server.Version }) };
    } catch (error) {
      return { doctor: error?.code === 'ENOENT' ? result(false, 'docker_missing', 'Docker no está instalado o no se encuentra en PATH.') : result(false, 'engine_unavailable', 'No se pudo comprobar el motor Docker local. Comprueba que esté iniciado.') };
    }
  }
  doctor() { return this._serialize(async () => (await this._doctor()).doctor); }
  async _resources(profile) {
    await fs.mkdir(this.dataDir, { recursive: true });
    const file = path.join(this.dataDir, 'real-labs-instance.json');
    let value;
    try { value = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw new Unsafe('Identidad local inválida.');
      const fresh = { version: 1, instanceId: randomUUID() };
      try { await fs.writeFile(file, JSON.stringify(fresh), { flag: 'wx', mode: 0o600 }); value = fresh; }
      catch (writeError) { if (writeError.code !== 'EEXIST') throw writeError; try { value = JSON.parse(await fs.readFile(file, 'utf8')); } catch { throw new Unsafe('Identidad local inválida.'); } }
    }
    requireSafe(value?.version === 1 && UUID.test(value.instanceId));
    const stem = `campus-${value.instanceId}-${profile}`;
    return { container: `${stem}-juice-shop`, network: `${stem}-internal`, labels: { [PREFIX + 'owner']: OWNER, [PREFIX + 'instance']: value.instanceId, [PREFIX + 'profile']: profile, [PREFIX + 'lab']: 'juice-shop' } };
  }
  _labels(actual, expected) { requireSafe(actual && Object.entries(expected).every(([key, value]) => actual[key] === value)); }
  async _lookup(type, name, context) {
    const list = await this._run([type, 'ls', ...(type === 'container' ? ['--all', '--no-trunc'] : ['--no-trunc']), '--filter', `name=^${type === 'container' ? '/' : ''}${name}$`, '--format', '{{json .}}'], { context, json: true, lines: true });
    requireSafe(Array.isArray(list));
    const matches = list.filter(item => (type === 'container' ? item.Names : item.Name) === name);
    requireSafe(matches.length <= 1);
    if (!matches.length) { requireSafe(list.length === 0); return null; }
    const identity = matches[0].ID; requireSafe(typeof identity === 'string' && RESOURCE_ID.test(identity));
    const inspected = one(await this._run([type, 'inspect', identity], { context, json: true }));
    requireSafe(inspected.Id === identity && inspected.Name === (type === 'container' ? '/' : '') + name);
    return inspected;
  }
  _network(network, resources, container) {
    this._labels(network.Labels, resources.labels);
    requireSafe(network.Driver === 'bridge' && network.Scope === 'local' && network.Internal === true && network.EnableIPv6 === false && network.Ingress === false && !network.ConfigOnly && empty(network.Options));
    requireSafe(network.Containers && typeof network.Containers === 'object' && !Array.isArray(network.Containers));
    requireSafe(Object.keys(network.Containers).every(identity => identity === container?.Id));
  }
  async _container(container, network, resources, context) {
    this._labels(container.Config?.Labels, resources.labels);
    requireSafe(container.Config?.Image === IMAGE && RESOURCE_ID.test(container.Id));
    const image = one(await this._run(['image', 'inspect', IMAGE], { context, json: true }));
    requireSafe(image.Id === container.Image && Array.isArray(image.RepoDigests) && image.RepoDigests.includes(IMAGE) && image.Config);
    for (const key of ['Cmd', 'Entrypoint', 'User', 'WorkingDir']) requireSafe(equal(container.Config[key], image.Config[key]));
    requireSafe(equal([...(container.Config.Env || [])].sort(), [...(image.Config.Env || [])].sort()));
    requireSafe(Array.isArray(container.Mounts) && container.Mounts.length === 0 && empty(container.Config.Volumes));
    const host = container.HostConfig;
    requireSafe(host && host.Privileged === false && host.PublishAllPorts === false && host.AutoRemove === false);
    requireSafe(host.Memory === 805306368 && host.MemorySwap === 805306368 && host.NanoCpus === 1000000000 && host.PidsLimit === 256);
    requireSafe(equal(host.CapDrop, ['ALL']) && empty(host.CapAdd) && equal(host.SecurityOpt, ['no-new-privileges:true']));
    requireSafe(host.RestartPolicy?.Name === 'no' && host.RestartPolicy.MaximumRetryCount === 0);
    requireSafe(host.PidMode === '' && host.IpcMode === 'private' && host.UTSMode === '' && host.UsernsMode === '');
    requireSafe(['', 'private'].includes(host.CgroupnsMode) && ['', 'runc'].includes(host.Runtime) && ['', 'default'].includes(host.Isolation));
    for (const key of ['Binds', 'Mounts', 'VolumesFrom', 'Devices', 'DeviceRequests', 'DeviceCgroupRules', 'Links', 'ExtraHosts', 'Dns', 'DnsOptions', 'DnsSearch', 'GroupAdd', 'Sysctls', 'StorageOpt', 'Ulimits']) requireSafe(empty(host[key]));
    requireSafe(!host.CgroupParent && !host.CpusetCpus && !host.CpusetMems && !host.ContainerIDFile && !host.VolumeDriver);
    requireSafe(!host.CpuQuota && !host.CpuPeriod && !host.CpuShares && !host.OomKillDisable && !host.MemoryReservation);
    const bindings = host.PortBindings;
    requireSafe(bindings && equal(Object.keys(bindings), ['3000/tcp']));
    const binding = one(bindings['3000/tcp']);
    requireSafe(binding.HostIp === '127.0.0.1' && (binding.HostPort === '' || binding.HostPort === '0' || port(binding.HostPort)));
    const connections = container.NetworkSettings?.Networks;
    requireSafe(connections && equal(Object.keys(connections), [resources.network]));
    const endpointId = connections[resources.network].NetworkID;
    // Docker has not joined the endpoint yet after `container create`.
    requireSafe(endpointId === network.Id || (endpointId === '' && container.State?.Status === 'created' && container.State.Running === false && host.NetworkMode === resources.network));
    requireSafe([resources.network, network.Id].includes(host.NetworkMode));
    const effective = container.NetworkSettings?.Ports;
    requireSafe(empty(effective) || equal(Object.keys(effective), ['3000/tcp']));
    let published;
    if (!empty(effective) && effective['3000/tcp'] !== null) {
      published = one(effective['3000/tcp']); requireSafe(published.HostIp === '127.0.0.1' && port(published.HostPort));
      requireSafe(binding.HostPort === '' || binding.HostPort === '0' || binding.HostPort === published.HostPort);
    }
    requireSafe(container.State && typeof container.State.Running === 'boolean' && typeof container.State.Status === 'string');
    if (container.State.Running) requireSafe(published);
    return published?.HostPort;
  }
  async _read(resources, context) {
    const container = await this._lookup('container', resources.container, context);
    const network = await this._lookup('network', resources.network, context);
    requireSafe(!container || network);
    if (network) this._network(network, resources, container);
    const published = container ? await this._container(container, network, resources, context) : undefined;
    return { container, network, published };
  }
  _snapshot(current, engine) {
    const snapshot = { id: 'juice-shop', state: 'missing', message: 'El objetivo aún no se creó.', imageVersion: '20.3.0', engine: engine.version };
    if (!current.container) return snapshot;
    const state = current.container.State;
    if (state.Dead || state.Status === 'dead') return { ...snapshot, state: 'error', canReset: true, message: 'El contenedor no puede iniciarse. Restablece el objetivo para volver a crearlo.' };
    if (state.Paused || state.Restarting || state.Status === 'restarting') return { ...snapshot, state: 'starting', message: 'El contenedor no está disponible para abrir.' };
    return state.Running ? { ...snapshot, state: 'running', message: 'Contenedor Linux encendido; puede seguir activo al cerrar el campus.', url: `http://127.0.0.1:${current.published}/` } : { ...snapshot, state: 'stopped', message: 'Objetivo detenido. Conserva su estado hasta restablecerlo.' };
  }
  _operation(profile, operation) {
    // Validate before scheduling any subprocess or filesystem access.
    try { profileId(profile); } catch { return Promise.reject(new Error('Identificador de perfil inválido.')); }
    return this._serialize(async () => {
      const base = { id: 'juice-shop', imageVersion: '20.3.0' };
      const { doctor, context } = await this._doctor();
      if (!doctor.ready) return { ...base, state: 'unavailable', message: doctor.message };
      try {
        const resources = await this._resources(profile);
        let current = await this._read(resources, context);
        if (operation === 'status') return this._snapshot(current, doctor);
        if (operation === 'stop') {
          if (current.container?.State.Running) await this._run(['container', 'stop', '--time', '10', current.container.Id], { context, timeout: 25000 });
          return this._snapshot(await this._read(resources, context), doctor);
        }
        if (operation === 'reset' && current.container) {
          if (current.container.State.Running) await this._run(['container', 'stop', '--time', '10', current.container.Id], { context, timeout: 25000 });
          current = await this._read(resources, context);
          requireSafe(current.container && current.container.State.Running === false);
          await this._run(['container', 'rm', current.container.Id], { context });
          current = await this._read(resources, context);
        }
        if (!current.network) {
          const labels = Object.entries(resources.labels).flatMap(([key, value]) => ['--label', `${key}=${value}`]);
          await this._run(['network', 'create', '--driver', 'bridge', '--internal', ...labels, resources.network], { context });
          current = await this._read(resources, context);
          requireSafe(current.network);
        }
        if (!current.container) {
          await this._run(['image', 'pull', '--platform', 'linux/amd64', IMAGE], { context, timeout: 180000 });
          current = await this._read(resources, context); requireSafe(!current.container && current.network);
          const labels = Object.entries(resources.labels).flatMap(([key, value]) => ['--label', `${key}=${value}`]);
          await this._run(['container', 'create', '--name', resources.container, '--platform', 'linux/amd64', '--network', resources.network, '--publish', '127.0.0.1::3000', '--restart', 'no', '--memory', '768m', '--memory-swap', '768m', '--cpus', '1', '--pids-limit', '256', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', ...labels, IMAGE], { context, timeout: 30000 });
          current = await this._read(resources, context); requireSafe(current.container);
        }
        if (!current.container.State.Running) {
          requireSafe(!current.container.State.Dead && !current.container.State.Paused && !current.container.State.Restarting);
          await this._run(['container', 'start', current.container.Id], { context, timeout: 30000 });
        }
        return this._snapshot(await this._read(resources, context), doctor);
      } catch (error) {
        return { ...base, state: error instanceof Unsafe ? 'unsafe' : 'error', message: error instanceof Unsafe ? 'No se pudo verificar la propiedad y configuración segura del objetivo. No se modificaron los recursos no verificados.' : 'La operación de Docker no pudo completarse. Comprueba el motor y vuelve a intentar.' };
      }
    });
  }
  status(profile) { return this._operation(profile, 'status'); }
  start(profile) { return this._operation(profile, 'start'); }
  stop(profile) { return this._operation(profile, 'stop'); }
  reset(profile) { return this._operation(profile, 'reset'); }
}
module.exports = { RealLabManager };
