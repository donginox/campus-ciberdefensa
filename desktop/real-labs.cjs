'use strict';
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const http = require('node:http');
const { execFile } = require('node:child_process');
const { id: profileId } = require('./validation.cjs');
const { getRecipe, catalog, capabilities } = require('./lab-recipes.cjs');

const IMAGE = 'bkimminich/juice-shop@sha256:cea5a4af4aacee498c491491af0408934ec81d004035c0a02ef3e54395e3bf27';
const PREFIX = 'ar.campus.ciberdefensa.';
const OWNER = 'campus-ciberdefensa';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const RESOURCE_ID = /^[a-f0-9]{64}$/;
const queues = new Map();
class Unsafe extends Error {}
class AssetsUnavailable extends Error {}
const IMAGE_ID = /^sha256:[a-f0-9]{64}$/;
const CASE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const ACTORS = new Set(['sonda', 'visitante', 'operador']);
const HTTP_PATHS = new Set(['/health', '/api/case', '/api/events', '/login', '/catalog', '/admin', '/api/query', '/api/assess', '/api/control']);
const MAX_RESPONSE = 512 * 1024;
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
  constructor({ dataDir, runner = defaultRunner, platform = process.platform, runtimeDir = path.join(__dirname, '..', '.local', 'lab-runtime') }) {
    if (typeof dataDir !== 'string' || !path.isAbsolute(dataDir) || typeof runner !== 'function' || typeof runtimeDir !== 'string' || !path.isAbsolute(runtimeDir)) throw new Error('Configuración del laboratorio inválida.');
    this.dataDir = path.resolve(dataDir); this.runner = runner; this.platform = platform; this.runtimeDir = path.resolve(runtimeDir);
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
  catalog() { return catalog(); }
  async _resources(profile, recipe) {
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
    const seed = createHash('sha256').update(`${profile}:${recipe.id}`).digest().readUInt32BE(0) % 2147483647 + 1;
    return { container: `${stem}-${recipe.id}`, network: recipe.id === 'juice-shop' ? `${stem}-internal` : `${stem}-${recipe.id}-internal`, seed, labels: { [PREFIX + 'owner']: OWNER, [PREFIX + 'instance']: value.instanceId, [PREFIX + 'profile']: profile, [PREFIX + 'lab']: recipe.id } };
  }
  async _hash(file) {
    const hash = createHash('sha256'); let size = 0;
    for await (const chunk of createReadStream(file)) { size += chunk.length; if (size > 1024 * 1024 * 1024) throw new AssetsUnavailable(); hash.update(chunk); }
    return { size, sha256: hash.digest('hex') };
  }
  async _assets() {
    try {
      const file = path.join(this.runtimeDir, 'manifest.json'); const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.size > 16384) throw new AssetsUnavailable();
      const m = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!this._validManifest(m)) throw new AssetsUnavailable();
      const archivePath = path.join(this.runtimeDir, 'runtime.tar.gz'); const archiveStat = await fs.lstat(archivePath);
      if (!archiveStat.isFile() || archiveStat.size !== m.size) throw new AssetsUnavailable();
      const actual = await this._hash(archivePath);
      if (actual.size !== m.size || actual.sha256 !== m.sha256) throw new AssetsUnavailable();
      return { ...m, archivePath };
    } catch { throw new AssetsUnavailable(); }
  }
  _validManifest(m) {
    return Boolean(m && m.schemaVersion === 1 && typeof m.version === 'string' && m.version.length <= 128 && /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(m.version) && m.imageTag === `campus-lab-runtime:${m.version}` && IMAGE_ID.test(m.imageId) && m.archive === 'runtime.tar.gz' && /^[a-f0-9]{64}$/.test(m.sha256) && Number.isSafeInteger(m.size) && m.size >= 1 && m.size <= 1024 * 1024 * 1024);
  }
  _imageContract(config) {
    return { Cmd: config.Cmd, Entrypoint: config.Entrypoint, User: config.User, WorkingDir: config.WorkingDir, Env: config.Env, Volumes: config.Volumes ?? null, ExposedPorts: config.ExposedPorts };
  }
  async _runtimeHistory(resources) {
    const file = path.join(this.dataDir, 'real-labs-runtime-history.json');
    try {
      const stat = await fs.lstat(file); requireSafe(stat.isFile() && stat.size <= 1024 * 1024);
      const value = JSON.parse(await fs.readFile(file, 'utf8'));
      requireSafe(value?.schemaVersion === 1 && value.instanceId === resources.labels[PREFIX + 'instance'] && Array.isArray(value.images) && value.images.length <= 128);
      const ids = new Set();
      for (const record of value.images) {
        requireSafe(this._validManifest(record) && record.config && !ids.has(record.imageId)); ids.add(record.imageId);
        this._runtimeImage({ Id: record.imageId, Os: 'linux', Architecture: 'amd64', Config: record.config }, record);
      }
      return value;
    } catch (error) {
      if (error.code === 'ENOENT') return { schemaVersion: 1, instanceId: resources.labels[PREFIX + 'instance'], images: [] };
      throw new Unsafe('Historial local de runtimes inválido.');
    }
  }
  async _rememberRuntime(assets, image, resources) {
    const history = await this._runtimeHistory(resources);
    const existing = history.images.find(record => record.imageId === assets.imageId);
    if (existing) { requireSafe(equal(existing.config, this._imageContract(image.Config))); return; }
    requireSafe(history.images.length < 128);
    // Only called after verifying bundled bytes and the loaded immutable image.
    // This private history remains the authority for safe removal after updates;
    // Docker labels or a same-name container never create a trusted history entry.
    history.images.push({ schemaVersion: 1, version: assets.version, imageId: assets.imageId, imageTag: assets.imageTag, archive: assets.archive, sha256: assets.sha256, size: assets.size, config: this._imageContract(image.Config) });
    const file = path.join(this.dataDir, 'real-labs-runtime-history.json'), temp = path.join(this.dataDir, `runtime-history-${randomUUID()}.tmp`);
    try { await fs.writeFile(temp, JSON.stringify(history), { flag: 'wx', mode: 0o600 }); await fs.rename(temp, file); }
    finally { await fs.rm(temp, { force: true }).catch(() => {}); }
  }
  async _runtimeForContainer(container, assets, resources) {
    requireSafe(IMAGE_ID.test(container.Image) && container.Config?.Image === container.Image);
    if (container.Image === assets.imageId) return assets;
    const history = await this._runtimeHistory(resources), previous = history.images.find(record => record.imageId === container.Image);
    requireSafe(previous); return previous;
  }
  async _load(assets, context, resources) {
    // Copy into private app data before hashing again: Docker never loads an
    // unverified renderer-selected path or a partially copied bundle.
    const directory = path.join(this.dataDir, 'lab-runtime-cache'); await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temp = path.join(directory, `${randomUUID()}.tmp`); const archive = path.join(directory, `${assets.sha256}.tar.gz`);
    try {
      await fs.copyFile(assets.archivePath, temp, require('node:fs').constants.COPYFILE_EXCL); await fs.chmod(temp, 0o600);
      const verified = await this._hash(temp); if (verified.size !== assets.size || verified.sha256 !== assets.sha256) throw new AssetsUnavailable();
      await fs.rename(temp, archive);
      await this._run(['image', 'load', '--input', archive], { context, timeout: 180000 });
      const image = one(await this._run(['image', 'inspect', assets.imageId], { context, json: true })); this._runtimeImage(image, assets);
      await this._rememberRuntime(assets, image, resources);
    } finally { await fs.rm(temp, { force: true }).catch(() => {}); }
  }
  _runtimeImage(image, assets) {
    requireSafe(image.Id === assets.imageId && image.Os === 'linux' && image.Architecture === 'amd64' && image.Config);
    const c = image.Config;
    requireSafe(equal(c.Cmd, ['python', '/app/server.py']) && c.Entrypoint === null && c.User === '10001:10001' && c.WorkingDir === '/app' && empty(c.Volumes) && equal(Object.keys(c.ExposedPorts || {}), ['8080/tcp']));
    requireSafe(Array.isArray(c.Env) && c.Env.every(e => typeof e === 'string' && /^[A-Za-z_][A-Za-z0-9_]*=/.test(e)));
    const keys = c.Env.map(e => e.split('=')[0]); requireSafe(new Set(keys).size === keys.length);
    for (const value of ['PYTHONDONTWRITEBYTECODE=1', 'PYTHONUNBUFFERED=1', 'CAMPUS_LAB_MODE=soc', 'CAMPUS_SEED=1']) requireSafe(c.Env.includes(value));
    if (assets.config) requireSafe(equal(this._imageContract(c), assets.config));
  }
  _environment(image, recipe, resources) {
    return image.Config.Env.filter(value => !value.startsWith('CAMPUS_LAB_MODE=') && !value.startsWith('CAMPUS_SEED=')).concat(`CAMPUS_LAB_MODE=${recipe.mode}`, `CAMPUS_SEED=${resources.seed}`);
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
  async _container(container, network, resources, context, recipe, assets) {
    this._labels(container.Config?.Labels, resources.labels);
    const reference = recipe.mode ? assets.imageId : IMAGE;
    requireSafe(container.Config?.Image === reference && RESOURCE_ID.test(container.Id));
    const image = one(await this._run(['image', 'inspect', reference], { context, json: true }));
    if (recipe.mode) this._runtimeImage(image, assets);
    else requireSafe(Array.isArray(image.RepoDigests) && image.RepoDigests.includes(IMAGE) && image.Config);
    requireSafe(image.Id === container.Image);
    for (const key of ['Cmd', 'Entrypoint', 'User', 'WorkingDir']) requireSafe(equal(container.Config[key], image.Config[key]));
    const expectedEnv = recipe.mode ? this._environment(image, recipe, resources) : image.Config.Env || [];
    requireSafe(equal([...(container.Config.Env || [])].sort(), [...expectedEnv].sort()));
    requireSafe(Array.isArray(container.Mounts) && container.Mounts.length === 0 && empty(container.Config.Volumes));
    const host = container.HostConfig;
    requireSafe(host && host.Privileged === false && host.PublishAllPorts === false && host.AutoRemove === false);
    requireSafe(host.ReadonlyRootfs === Boolean(recipe.mode));
    requireSafe(host.Memory === recipe.memoryBytes && host.MemorySwap === recipe.memoryBytes && host.NanoCpus === 1000000000 && host.PidsLimit === recipe.pids);
    requireSafe(equal(host.CapDrop, ['ALL']) && empty(host.CapAdd) && equal(host.SecurityOpt, ['no-new-privileges:true']));
    requireSafe(host.RestartPolicy?.Name === 'no' && host.RestartPolicy.MaximumRetryCount === 0);
    requireSafe(host.PidMode === '' && host.IpcMode === 'private' && host.UTSMode === '' && host.UsernsMode === '');
    requireSafe(['', 'private'].includes(host.CgroupnsMode) && ['', 'runc'].includes(host.Runtime) && ['', 'default'].includes(host.Isolation));
    for (const key of ['Binds', 'Mounts', 'VolumesFrom', 'Devices', 'DeviceRequests', 'DeviceCgroupRules', 'Links', 'ExtraHosts', 'Dns', 'DnsOptions', 'DnsSearch', 'GroupAdd', 'Sysctls', 'StorageOpt', 'Ulimits']) requireSafe(empty(host[key]));
    requireSafe(!host.CgroupParent && !host.CpusetCpus && !host.CpusetMems && !host.ContainerIDFile && !host.VolumeDriver);
    requireSafe(!host.CpuQuota && !host.CpuPeriod && !host.CpuShares && !host.OomKillDisable && !host.MemoryReservation);
    const bindings = host.PortBindings;
    const servicePort = `${recipe.port}/tcp`;
    requireSafe(bindings && equal(Object.keys(bindings), [servicePort]));
    const binding = one(bindings[servicePort]);
    requireSafe(binding.HostIp === '127.0.0.1' && (binding.HostPort === '' || binding.HostPort === '0' || port(binding.HostPort)));
    const connections = container.NetworkSettings?.Networks;
    requireSafe(connections && equal(Object.keys(connections), [resources.network]));
    const endpointId = connections[resources.network].NetworkID;
    // Docker has not joined the endpoint yet after `container create`.
    requireSafe(endpointId === network.Id || (endpointId === '' && container.State?.Status === 'created' && container.State.Running === false && host.NetworkMode === resources.network));
    requireSafe([resources.network, network.Id].includes(host.NetworkMode));
    const effective = container.NetworkSettings?.Ports;
    requireSafe(empty(effective) || equal(Object.keys(effective), [servicePort]));
    let published;
    if (!empty(effective) && effective[servicePort] !== null) {
      published = one(effective[servicePort]); requireSafe(published.HostIp === '127.0.0.1' && port(published.HostPort));
      requireSafe(binding.HostPort === '' || binding.HostPort === '0' || binding.HostPort === published.HostPort);
    }
    requireSafe(container.State && typeof container.State.Running === 'boolean' && typeof container.State.Status === 'string');
    if (container.State.Running) requireSafe(published);
    return published?.HostPort;
  }
  async _read(resources, context, recipe, assets) {
    const container = await this._lookup('container', resources.container, context);
    const network = await this._lookup('network', resources.network, context);
    requireSafe(!container || network);
    if (network) this._network(network, resources, container);
    const runtime = container && recipe.mode ? await this._runtimeForContainer(container, assets, resources) : assets;
    const published = container ? await this._container(container, network, resources, context, recipe, runtime) : undefined;
    return { container, network, published, runtime, outdated: Boolean(container && recipe.mode && runtime.imageId !== assets.imageId) };
  }
  async _snapshot(current, engine, recipe, assets) {
    const snapshot = { id: recipe.id, state: 'missing', message: 'El objetivo aún no se creó.', imageVersion: assets?.version || recipe.imageVersion, engine: engine.version };
    const withCapabilities = value => ({ ...value, capabilities: capabilities(recipe, value.state) });
    if (!current.container) return withCapabilities(snapshot);
    const state = current.container.State;
    if (current.outdated) return { ...snapshot, state: 'runtime_update', imageVersion: current.runtime.version, availableVersion: assets.version, canReset: true, message: 'Hay un runtime incluido más reciente. Restablece este objetivo para practicar con la versión actual; las evidencias guardadas se conservan.', capabilities: { ...capabilities(recipe, 'unsafe', false), stop: state.Running, reset: true } };
    if (state.Dead || state.Status === 'dead') return withCapabilities({ ...snapshot, state: 'error', canReset: true, message: 'El contenedor no puede iniciarse. Restablece el objetivo para volver a crearlo.' });
    if (state.Paused || state.Restarting || state.Status === 'restarting') return withCapabilities({ ...snapshot, state: 'starting', message: 'El contenedor no está disponible para abrir.' });
    if (!state.Running) return withCapabilities({ ...snapshot, state: 'stopped', message: recipe.ephemeral ? 'Objetivo detenido. La sesión en memoria se reinicia al arrancar; las evidencias guardadas se conservan.' : 'Objetivo detenido. Conserva su estado hasta restablecerlo.' });
    let serviceHealth;
    if (recipe.mode) {
      try { serviceHealth = await this._health(current.published, recipe); }
      catch (error) { if (error instanceof Unsafe) throw error; return withCapabilities({ ...snapshot, state: 'starting', serviceHealth: { ready: false }, message: 'El contenedor está encendido; el servicio todavía no está listo.' }); }
    }
    return withCapabilities({ ...snapshot, state: 'running', message: 'Contenedor Linux encendido; puede seguir activo al cerrar el campus.', url: `http://127.0.0.1:${current.published}/`, ...(serviceHealth ? { serviceHealth } : {}) });
  }
  _operation(profile, operation, labId = 'juice-shop') {
    // Validate before scheduling any subprocess or filesystem access.
    let recipe; try { profileId(profile); recipe = getRecipe(labId); } catch { return Promise.reject(new Error('Identificador de perfil o laboratorio inválido.')); }
    return this._serialize(async () => {
      const base = { id: recipe.id, imageVersion: recipe.imageVersion, capabilities: capabilities(recipe, 'unsafe', false) };
      const { doctor, context } = await this._doctor();
      if (!doctor.ready) return { ...base, state: 'unavailable', message: doctor.message };
      try {
        const assets = recipe.mode ? await this._assets() : null;
        const resources = await this._resources(profile, recipe);
        let current = await this._read(resources, context, recipe, assets);
        if (operation === 'status') return await this._snapshot(current, doctor, recipe, assets);
        if (operation === 'start' && current.outdated) return await this._snapshot(current, doctor, recipe, assets);
        // A mismatched service identity must not authorize a subsequent mutation.
        if (current.container?.State.Running && recipe.mode && !current.outdated) await this._snapshot(current, doctor, recipe, assets);
        if (operation === 'stop') {
          if (current.container?.State.Running) await this._run(['container', 'stop', '--time', '10', current.container.Id], { context, timeout: 25000 });
          return await this._snapshot(await this._read(resources, context, recipe, assets), doctor, recipe, assets);
        }
        if (operation === 'reset' && current.container) {
          if (current.container.State.Running) await this._run(['container', 'stop', '--time', '10', current.container.Id], { context, timeout: 25000 });
          current = await this._read(resources, context, recipe, assets);
          requireSafe(current.container && current.container.State.Running === false);
          await this._run(['container', 'rm', current.container.Id], { context });
          current = await this._read(resources, context, recipe, assets);
        }
        if (!current.container && recipe.mode) await this._load(assets, context, resources);
        if (!current.network) {
          const labels = Object.entries(resources.labels).flatMap(([key, value]) => ['--label', `${key}=${value}`]);
          await this._run(['network', 'create', '--driver', 'bridge', '--internal', ...labels, resources.network], { context });
          current = await this._read(resources, context, recipe, assets);
          requireSafe(current.network);
        }
        if (!current.container) {
          if (!recipe.mode) await this._run(['image', 'pull', '--platform', 'linux/amd64', IMAGE], { context, timeout: 180000 });
          current = await this._read(resources, context, recipe, assets); requireSafe(!current.container && current.network);
          const labels = Object.entries(resources.labels).flatMap(([key, value]) => ['--label', `${key}=${value}`]);
          const runtime = recipe.mode ? ['--read-only', '--env', `CAMPUS_LAB_MODE=${recipe.mode}`, '--env', `CAMPUS_SEED=${resources.seed}`] : [];
          await this._run(['container', 'create', '--name', resources.container, '--platform', 'linux/amd64', '--network', resources.network, '--publish', `127.0.0.1::${recipe.port}`, '--restart', 'no', '--memory', recipe.memory, '--memory-swap', recipe.memory, '--cpus', '1', '--pids-limit', String(recipe.pids), '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', ...runtime, ...labels, recipe.mode ? assets.imageId : IMAGE], { context, timeout: 30000 });
          current = await this._read(resources, context, recipe, assets); requireSafe(current.container);
        }
        if (!current.container.State.Running) {
          requireSafe(!current.container.State.Dead && !current.container.State.Paused && !current.container.State.Restarting);
          await this._run(['container', 'start', current.container.Id], { context, timeout: 30000 });
        }
        return await this._snapshot(await this._read(resources, context, recipe, assets), doctor, recipe, assets);
      } catch (error) {
        return { ...base, state: error instanceof AssetsUnavailable ? 'unavailable_assets' : error instanceof Unsafe ? 'unsafe' : 'error', message: error instanceof AssetsUnavailable ? 'El runtime incluido falta o no supera la verificación. Reinstala o vuelve a preparar los archivos del laboratorio.' : error instanceof Unsafe ? 'No se pudo verificar la propiedad y configuración segura del objetivo. No se modificaron los recursos no verificados.' : 'La operación de Docker no pudo completarse. Comprueba el motor y vuelve a intentar.' };
      }
    });
  }
  status(profile, labId = 'juice-shop') { return this._operation(profile, 'status', labId); }
  start(profile, labId = 'juice-shop') { return this._operation(profile, 'start', labId); }
  stop(profile, labId = 'juice-shop') { return this._operation(profile, 'stop', labId); }
  reset(profile, labId = 'juice-shop') { return this._operation(profile, 'reset', labId); }

  _request(published, endpoint, { method = 'GET', body, actor, allowUnauthorized = false } = {}) {
    requireSafe(port(published) && HTTP_PATHS.has(endpoint) && ['GET', 'POST'].includes(method) && (!actor || ACTORS.has(actor)));
    const content = body === undefined ? undefined : JSON.stringify(body);
    if (content && Buffer.byteLength(content) > 16384) return Promise.reject(new Error('La petición supera el límite.'));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(new Error('No se pudo consultar el servicio local.')) : resolve(value); };
      const host = `127.0.0.1:${published}`;
      const req = http.request({ hostname: '127.0.0.1', port: Number(published), path: endpoint, method, agent: false, headers: { Host: host, Origin: `http://${host}`, Accept: 'application/json', Connection: 'close', ...(content ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(content) } : {}), ...(actor ? { 'X-Campus-Actor': actor } : {}) } }, res => {
        const validStatus = res.statusCode >= 200 && res.statusCode < 300 || allowUnauthorized && [401, 403].includes(res.statusCode);
        if (!validStatus || !/^application\/json(?:\s*;|$)/i.test(res.headers['content-type'] || '') || Number(res.headers['content-length'] || 0) > MAX_RESPONSE) { res.destroy(); return finish(new Error()); }
        const chunks = []; let length = 0;
        res.on('data', chunk => { length += chunk.length; if (length > MAX_RESPONSE) { res.destroy(); return finish(new Error()); } chunks.push(chunk); });
        res.on('end', () => { try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); finish(null, parsed); } catch { finish(new Error()); } });
        res.on('error', () => finish(new Error())); res.on('aborted', () => finish(new Error()));
      });
      const timer = setTimeout(() => { req.destroy(); finish(new Error()); }, 3000);
      req.on('error', () => finish(new Error())); if (content) req.write(content); req.end();
    });
  }
  async _health(published, recipe) {
    const value = await this._request(published, '/health');
    requireSafe(value.service === 'campus-lab-runtime' && value.protocolVersion === 1 && value.mode === recipe.mode && typeof value.caseId === 'string' && CASE_ID.test(value.caseId));
    if (value.ready === false) throw new Error('El servicio todavía no está listo.');
    return { ready: true, service: value.service, protocolVersion: value.protocolVersion, mode: value.mode, caseId: value.caseId, ...(typeof value.runId === 'string' && CASE_ID.test(value.runId) ? { runId: value.runId } : {}) };
  }
  _service(profile, labId, action, validate = () => {}) {
    let recipe;
    try { profileId(profile); recipe = getRecipe(labId); if (!recipe.mode) throw new Error(); validate(recipe); }
    catch { return Promise.reject(new Error('Solicitud de laboratorio inválida.')); }
    return this._serialize(async () => {
      try {
        const { doctor, context } = await this._doctor(); if (!doctor.ready) throw new Error();
        const assets = await this._assets(), resources = await this._resources(profile, recipe);
        const current = await this._read(resources, context, recipe, assets);
        const snapshot = await this._snapshot(current, doctor, recipe, assets); if (snapshot.state !== 'running') throw new Error();
        const health = snapshot.serviceHealth;
        const checked = value => { requireSafe(value.caseId === health.caseId); return value; };
        const result = await action({ published: current.published, checked, health });
        const verified = await this._read(resources, context, recipe, assets);
        requireSafe(verified.container?.Id === current.container.Id && verified.container.State.Running && !verified.container.State.Paused && !verified.container.State.Restarting && verified.published === current.published);
        const after = await this._health(current.published, recipe);
        requireSafe(after.caseId === health.caseId && after.runId === health.runId);
        return result;
      } catch { throw new Error('El laboratorio no está listo o la petición no pudo verificarse.'); }
    });
  }
  _events(value) {
    requireSafe(Array.isArray(value.events) && value.events.length <= 300);
    for (const e of value.events) requireSafe(e && Number.isSafeInteger(e.id) && e.id >= 1 && typeof e.time === 'string' && e.time.length <= 64 && ACTORS.has(e.actor) && typeof e.peer === 'string' && e.peer.length <= 128 && ['GET', 'POST'].includes(e.method) && typeof e.path === 'string' && e.path.length <= 256 && typeof e.outcome === 'string' && e.outcome.length <= 64 && Number.isInteger(e.status) && e.status >= 100 && e.status <= 599);
    return value;
  }
  events(profile, labId) { return this._service(profile, labId, async ({ published, checked }) => this._events(checked(await this._request(published, '/api/events')))); }
  replay(profile, labId) {
    return this._service(profile, labId, async ({ published, checked }) => {
      const scenario = checked(await this._request(published, '/api/case'));
      const account = scenario.trainingAccount;
      requireSafe(account?.username === 'analista' && account.password === 'campus-practica' && Array.isArray(scenario.actors) && scenario.actors.includes('sonda'));
      const actor = 'sonda';
      for (let i = 0; i < 3; i++) await this._request(published, '/login', { method: 'POST', body: { username: account.username, password: 'intento-de-practica-incorrecto' }, actor, allowUnauthorized: true });
      await this._request(published, '/catalog', { actor, allowUnauthorized: true });
      await this._request(published, '/login', { method: 'POST', body: account, actor, allowUnauthorized: true });
      await this._request(published, '/admin', { actor, allowUnauthorized: true });
      const result = this._events(checked(await this._request(published, '/api/events')));
      return { caseId: result.caseId, generated: 6, events: result.events };
    }, recipe => { if (recipe.mode !== 'soc') throw new Error(); });
  }
  query(profile, labId, query) {
    return this._service(profile, labId, async ({ published, checked }) => {
      const value = checked(await this._request(published, '/api/query', { method: 'POST', body: { query } }));
      requireSafe(Array.isArray(value.columns) && value.columns.length <= 64 && value.columns.every(c => typeof c === 'string' && c.length <= 4096) && Array.isArray(value.rows) && value.rows.length <= 200 && Number.isSafeInteger(value.rowCount) && value.rowCount === value.rows.length && typeof value.truncated === 'boolean' && typeof value.elapsedMs === 'number' && Number.isFinite(value.elapsedMs) && typeof value.assessment?.passed === 'boolean' && typeof value.assessment.feedback === 'string' && value.assessment.feedback.length <= 4000);
      requireSafe(value.rows.every(row => Array.isArray(row) && row.length === value.columns.length && row.every(cell => cell === null || typeof cell === 'number' && Number.isFinite(cell) || typeof cell === 'string' && cell.length <= 4096)));
      return value;
    }, recipe => { if (recipe.mode !== 'database' || typeof query !== 'string' || !query.trim() || Buffer.byteLength(query) > 8192 || query.includes('\0')) throw new Error(); });
  }
  assess(profile, labId, input) {
    return this._service(profile, labId, async ({ published, checked }) => {
      const value = checked(await this._request(published, '/api/assess', { method: 'POST', body: { actor: input.actor, failures: input.failures } }));
      requireSafe(typeof value.passed === 'boolean' && typeof value.feedback === 'string' && value.feedback.length <= 4000); return value;
    }, recipe => { if (recipe.mode !== 'soc' || !input || !ACTORS.has(input.actor) || !Number.isSafeInteger(input.failures) || input.failures < 0 || input.failures > 300) throw new Error(); });
  }
  contain(profile, labId, actor) {
    return this._service(profile, labId, async ({ published, checked }) => {
      const value = checked(await this._request(published, '/api/control', { method: 'POST', body: { action: 'block', actor } }));
      requireSafe(value.action === 'block' && value.actor === actor && value.blocked === true && typeof value.feedback === 'string' && value.feedback.length <= 4000); return value;
    }, recipe => { if (recipe.mode !== 'soc' || !ACTORS.has(actor)) throw new Error(); });
  }
}
module.exports = { RealLabManager };
