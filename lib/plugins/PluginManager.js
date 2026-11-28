/**
 * PluginManager - Core plugin management system
 *
 * Based on Context7 research:
 * - Factory pattern from unplugin (/unjs/unplugin)
 * - npm workspaces best practices (/websites/npmjs)
 *
 * Features:
 * - Plugin discovery and loading
 * - Dependency resolution with peer dependencies
 * - Hook system for extensibility
 * - Metadata-driven agent registration
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

class PluginManager extends EventEmitter {
  /**
   * Validate a (possibly scoped) npm package name against npm naming rules.
   * Used to guard package names before passing them to npm via child_process.
   * @param {string} name - Package name to validate
   * @returns {boolean} True if the name is a safe npm package name
   */
  static isValidNpmPackageName(name) {
    return typeof name === 'string'
      && /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
  }

  constructor(options = {}) {
    super();

    this.options = {
      pluginDir: options.pluginDir || path.join(process.cwd(), 'node_modules'),
      agentDir: options.agentDir || path.join(process.cwd(), '.claude', 'agents'),
      scopePrefix: options.scopePrefix || '@claudeautopm',
      minCoreVersion: options.minCoreVersion || '2.8.0',
      projectRoot: options.projectRoot || process.cwd(),
      // When false, skip `npm root -g` during discovery so globally installed
      // @claudeautopm packages cannot leak into results (hermetic tests, #608)
      includeGlobal: options.includeGlobal !== false,
      ...options
    };

    // Plugin registry
    this.plugins = new Map();
    this.agents = new Map();
    this.hooks = new Map();

    // State
    this.initialized = false;
    this.loadedPlugins = new Set();

    // Registry file location (overridable so tests do not touch the real
    // ~/.claudeautopm registry, #608)
    this.registryPath = options.registryPath || path.join(
      os.homedir(),
      '.claudeautopm',
      'plugins',
      'registry.json'
    );

    // Load persistent registry
    this.registry = this.loadRegistry();
  }

  /**
   * Load plugin registry from disk
   * Based on npm workspaces pattern - maintains state across sessions
   */
  loadRegistry() {
    try {
      const registryDir = path.dirname(this.registryPath);

      // Ensure directory exists
      if (!fs.existsSync(registryDir)) {
        fs.mkdirSync(registryDir, { recursive: true });
      }

      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      }
    } catch (error) {
      this.emit('registry:load-error', { error: error.message });
    }

    // Default registry structure
    return {
      version: '1.0.0',
      installed: [],
      enabled: [],
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Save plugin registry to disk
   * Intentionally sync (#611): called from the synchronous public API
   * (enablePlugin/disablePlugin) as well as async paths.
   */
  saveRegistry() {
    try {
      this.registry.lastUpdate = new Date().toISOString();

      const registryDir = path.dirname(this.registryPath);
      if (!fs.existsSync(registryDir)) {
        fs.mkdirSync(registryDir, { recursive: true });
      }

      fs.writeFileSync(
        this.registryPath,
        JSON.stringify(this.registry, null, 2),
        'utf-8'
      );

      this.emit('registry:saved');
    } catch (error) {
      this.emit('registry:save-error', { error: error.message });
    }
  }

  /**
   * Emit a debug diagnostic for intentionally suppressed errors
   * (only when options.debug is enabled)
   */
  _debug(context, error) {
    if (this.options.debug) {
      this.emit('debug', { context, message: error && error.message ? error.message : String(error) });
    }
  }

  /**
   * Copy a file (optionally chmod it), reporting failure via
   * 'install:file-error' instead of throwing so a single bad file does not
   * abort the whole installation. If chmod fails after a successful copy the
   * target is removed again, so no half-installed file is left behind to
   * trip the "already exists" skip on the next install.
   * Returns true on success.
   *
   * Intentionally sync (#611): the #607 regression tests pin the
   * copy/chmod/rollback semantics by spying on the sync fs API
   * (fs.copyFileSync/chmodSync/unlinkSync); converting this leaf helper
   * would rewrite those behavioral pins for no functional gain.
   */
  _safeCopy(sourcePath, targetPath, info, mode) {
    try {
      fs.copyFileSync(sourcePath, targetPath);
    } catch (error) {
      this.emit('install:file-error', { ...info, file: sourcePath, target: targetPath, error: error.message });
      return false;
    }

    if (mode !== undefined) {
      try {
        fs.chmodSync(targetPath, mode);
      } catch (error) {
        try {
          fs.unlinkSync(targetPath);
        } catch (cleanupError) {
          this._debug('install:chmod-rollback', cleanupError);
        }
        this.emit('install:file-error', { ...info, file: sourcePath, target: targetPath, error: error.message });
        return false;
      }
    }

    return true;
  }

  /**
   * Unlink a file, reporting failure via 'uninstall:file-error' instead of
   * throwing so a single bad file does not abort the uninstall.
   * A missing file counts as success.
   * Returns true on success.
   *
   * Intentionally sync (#611): see _safeCopy — pinned by the #607
   * regression tests via fs.unlinkSync spies.
   */
  _safeUnlink(targetPath, info) {
    try {
      fs.unlinkSync(targetPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true;
      }
      this.emit('uninstall:file-error', { ...info, file: targetPath, error: error.message });
      return false;
    }
  }

  /**
   * Async existence check (promise-based replacement for fs.existsSync
   * inside async methods, #611)
   */
  async _pathExists(p) {
    try {
      await fsp.access(p);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // e.g. EACCES: the path may exist but be unreadable. Match the
        // historical fs.existsSync semantics (false) but surface the problem
        // unconditionally so incomplete installs are diagnosable.
        this.emit('fs:warning', { path: p, error: error.message, code: error.code });
        this._debug('path-exists', error);
      }
      return false;
    }
  }

  /**
   * Shared per-file install step used by all install* methods (#611):
   *   1. missing source        → emit 'install:missing', skip
   *   2. existing target       → emit 'install:skip' (unless emitSkip=false)
   *   3. copy via _safeCopy    → emits 'install:file-error' on failure
   *
   * @param {Object} spec
   * @param {string} spec.type - Resource type label ('agent'|'command'|'rule'|'hook'|'script')
   * @param {string} spec.name - Resource name for event payloads
   * @param {string} [spec.file] - Original (relative) file name; included in
   *   missing/skip payloads when set (multi-file resources: hooks, script collections)
   * @param {string} spec.sourcePath - Absolute source path
   * @param {string} spec.targetPath - Absolute target path
   * @param {number} [spec.mode] - chmod mode applied after copy (e.g. 0o755)
   * @param {boolean} [spec.checkMissing=true] - Emit 'install:missing' for absent sources
   * @param {boolean} [spec.emitSkip=true] - Emit 'install:skip' for existing targets
   * @param {boolean} [spec.ensureTargetDir=false] - Create dirname(targetPath) first
   * @returns {Promise<boolean>} true when the file was copied
   */
  async _installResourceFile({ type, name, file, sourcePath, targetPath, mode, checkMissing = true, emitSkip = true, ensureTargetDir = false }) {
    if (checkMissing && !(await this._pathExists(sourcePath))) {
      const payload = { type, name };
      if (file !== undefined) payload.file = file;
      payload.path = sourcePath;
      this.emit('install:missing', payload);
      return false;
    }

    if (ensureTargetDir) {
      await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    }

    if (await this._pathExists(targetPath)) {
      if (emitSkip) {
        const payload = { type, name };
        if (file !== undefined) payload.file = file;
        payload.reason = 'Already exists';
        this.emit('install:skip', payload);
      }
      return false;
    }

    return this._safeCopy(sourcePath, targetPath, { type, name }, mode);
  }

  /**
   * Generic resource installer shared by installAgents/installCommands/
   * installRules/installHooks/installScripts (#611).
   *
   * Each metadata item expands (via mapItem) into zero or more "units".
   * A unit owns one or more files and produces exactly one entry in the
   * returned array plus one emitted event — but only when at least one of
   * its files was actually copied (matching the historical per-method
   * behavior for both single-file and multi-file resources).
   *
   * @param {Iterable} items - Resource entries (metadata list or agent registry values)
   * @param {Object} opts
   * @param {string} opts.targetDir - Base target directory (created up front)
   * @param {Function} opts.mapItem - (item) => Promise<Array<unit>> | Array<unit> where unit is:
   *   {
   *     ensureDir?: string,                 // extra directory created before copying
   *     files: Array<spec>,                 // specs for _installResourceFile
   *     result: (copiedPaths) => Object,    // entry pushed to the returned array
   *     event: (copiedPaths) => [name, payload] // event emitted after result
   *   }
   * @returns {Promise<Array<Object>>} installed resource descriptors
   */
  async installResources(items, { targetDir, mapItem }) {
    await fsp.mkdir(targetDir, { recursive: true });

    const installed = [];

    for (const item of items) {
      const units = await mapItem(item);

      for (const unit of units) {
        if (unit.ensureDir && unit.ensureDir !== targetDir) {
          await fsp.mkdir(unit.ensureDir, { recursive: true });
        }

        const copied = [];
        for (const spec of unit.files) {
          if (await this._installResourceFile(spec)) {
            copied.push(spec.targetPath);
          }
        }

        if (copied.length > 0) {
          installed.push(unit.result(copied));
          const [eventName, payload] = unit.event(copied);
          this.emit(eventName, payload);
        }
      }
    }

    return installed;
  }

  /**
   * Initialize the plugin system
   * Discovers and validates all installed plugins
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.emit('init:start');

    try {
      await this.discoverPlugins();
      await this.validatePlugins();

      this.initialized = true;
      this.emit('init:complete', {
        pluginCount: this.plugins.size,
        agentCount: this.agents.size
      });
    } catch (error) {
      this.emit('init:error', error);
      throw error;
    }
  }

  /**
   * Discover all installed plugins in node_modules (local, global, and bundled)
   * Based on npm workspaces pattern from Context7
   */
  async discoverPlugins() {
    // Check multiple locations: local node_modules, global npm prefix, bundled packages/
    const searchPaths = [this.options.pluginDir];

    // Add global npm path (skipped when includeGlobal is false)
    if (this.options.includeGlobal) {
      try {
        const { execSync } = require('child_process');
        const globalPath = execSync('npm root -g', { encoding: 'utf8' }).trim();
        if (globalPath && !searchPaths.includes(globalPath)) {
          searchPaths.push(globalPath);
        }
      } catch (error) {
        // npm not available or error — skip global
        this._debug('discover:global-npm-root', error);
      }
    }

    // Add bundled packages/ directory (for development / autopm source repo)
    const bundledPath = path.join(this.options.projectRoot, 'packages');
    if (await this._pathExists(bundledPath)) {
      // Bundled plugins are at packages/plugin-*/.claude-plugin/plugin.json (not under @claudeautopm scope)
      try {
        const entries = await fsp.readdir(bundledPath);
        for (const entry of entries) {
          if (!entry.startsWith('plugin-')) continue;
          if (!PluginManager.manifestPath(path.join(bundledPath, entry))) continue;

          try {
            const metadata = PluginManager.readManifest(path.join(bundledPath, entry));
            const fullName = `${this.options.scopePrefix}/${entry}`;
            if (!this.plugins.has(fullName)) {
              this.plugins.set(fullName, {
                name: fullName,
                path: path.join(bundledPath, entry),
                metadata,
                loaded: false
              });
              this.emit('discover:found', { name: fullName, source: 'bundled' });
            }
          } catch (error) {
            // skip invalid plugin.json
            this._debug(`discover:bundled-invalid:${entry}`, error);
          }
        }
      } catch (error) {
        // skip unreadable packages/ directory
        this._debug('discover:bundled-unreadable', error);
      }
    }

    for (const nodeModulesPath of searchPaths) {
      try {
        // Check if scoped directory exists
        const scopePath = path.join(nodeModulesPath, this.options.scopePrefix);

        if (!(await this._pathExists(scopePath))) {
          continue;
        }

        const scopedPackages = await fsp.readdir(scopePath);

        for (const packageName of scopedPackages) {
          if (!packageName.startsWith('plugin-')) {
            continue;
          }

          const pluginPath = path.join(scopePath, packageName);
          if (!PluginManager.manifestPath(pluginPath)) {
            this.emit('discover:skip', {
              package: packageName,
              reason: 'No .claude-plugin/plugin.json (or legacy plugin.json) found'
            });
            continue;
          }

          try {
            const metadata = PluginManager.readManifest(pluginPath);
            const fullName = `${this.options.scopePrefix}/${packageName}`;

            this.plugins.set(fullName, {
              name: fullName,
              path: pluginPath,
              metadata,
              loaded: false
            });

            this.emit('discover:found', { name: fullName, metadata });
          } catch (error) {
            this.emit('discover:error', {
              package: packageName,
              error: error.message
            });
          }
        }
      } catch (error) {
        this.emit('discover:error', { error: error.message });
        // Continue to next search path instead of failing
      }
    }
  }

  /**
   * Validate plugin compatibility with core version
   * Uses peer dependency pattern from Context7 npm docs
   */
  async validatePlugins() {
    const coreVersion = this.getCoreVersion();

    for (const [name, plugin] of this.plugins.entries()) {
      const { metadata } = plugin;

      // Check compatibility
      if (!this.isCompatible(coreVersion, metadata.compatibleWith)) {
        this.emit('validate:incompatible', {
          name,
          required: metadata.compatibleWith,
          current: coreVersion
        });

        plugin.compatible = false;
        plugin.incompatibilityReason = `Requires core version ${metadata.compatibleWith}, but ${coreVersion} is installed`;
        continue;
      }

      plugin.compatible = true;
      this.emit('validate:compatible', { name, metadata });
    }
  }

  /**
   * Load a specific plugin and register its agents
   * Implements factory pattern from unplugin Context7 research
   */
  async loadPlugin(pluginName) {
    let plugin = this.plugins.get(pluginName);
    if (!plugin && !pluginName.includes('/')) {
      plugin = this.plugins.get(`${this.options.scopePrefix}/${pluginName}`);
    }

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    if (plugin.loaded) {
      this.emit('load:already-loaded', { name: pluginName });
      return plugin;
    }

    if (!plugin.compatible) {
      throw new Error(`Plugin incompatible: ${plugin.incompatibilityReason}`);
    }

    this.emit('load:start', { name: pluginName });

    try {
      // Register agents from plugin metadata
      await this.registerAgents(plugin);

      // Execute plugin hooks if defined
      await this.executePluginHooks(plugin, 'onLoad');

      plugin.loaded = true;
      this.loadedPlugins.add(pluginName);

      this.emit('load:complete', {
        name: pluginName,
        agentCount: (plugin.metadata.agents || []).length
      });

      return plugin;
    } catch (error) {
      this.emit('load:error', { name: pluginName, error: error.message });
      throw error;
    }
  }

  /**
   * Register agents from plugin metadata
   */
  async registerAgents(plugin) {
    const { metadata, path: pluginPath } = plugin;

    for (const agentMeta of (metadata.agents || [])) {
      const agentId = `${plugin.name}:${agentMeta.name}`;
      const agentFilePath = path.join(pluginPath, agentMeta.file);

      if (!(await this._pathExists(agentFilePath))) {
        this.emit('agent:missing', {
          agentId,
          path: agentFilePath
        });
        continue;
      }

      this.agents.set(agentId, {
        id: agentId,
        name: agentMeta.name,
        plugin: plugin.name,
        description: agentMeta.description,
        tags: agentMeta.tags || [],
        filePath: agentFilePath,
        metadata: agentMeta
      });

      this.emit('agent:registered', {
        agentId,
        plugin: plugin.name
      });
    }
  }

  /**
   * Install plugin resources to project directories
   * Supports: agents, commands, rules, hooks, scripts (Schema v2.0)
   */
  async installPlugin(pluginName) {
    // Normalize name: accept both "plugin-obsidian" and "@claudeautopm/plugin-obsidian"
    let plugin = this.plugins.get(pluginName);
    if (!plugin && !pluginName.includes('/')) {
      plugin = this.plugins.get(`${this.options.scopePrefix}/${pluginName}`);
    }

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    // Ensure plugin is loaded
    if (!plugin.loaded) {
      await this.loadPlugin(pluginName);
    }

    this.emit('install:start', { name: pluginName });

    try {
      const { metadata, path: pluginPath } = plugin;
      const results = {
        agents: [],
        commands: [],
        rules: [],
        hooks: [],
        scripts: []
      };

      // Install agents (existing logic)
      if (metadata.agents && metadata.agents.length > 0) {
        results.agents = await this.installAgents(plugin, pluginPath);
      }

      // Install commands (Schema v2.0)
      if (metadata.commands && metadata.commands.length > 0) {
        results.commands = await this.installCommands(plugin, pluginPath);
      }

      // Install rules (Schema v2.0)
      if (metadata.rules && metadata.rules.length > 0) {
        results.rules = await this.installRules(plugin, pluginPath);
      }

      // Install hooks (Schema v2.0)
      if (metadata.hooks && metadata.hooks.length > 0) {
        results.hooks = await this.installHooks(plugin, pluginPath);
      }

      // Install scripts (Schema v2.0)
      if (metadata.scripts && metadata.scripts.length > 0) {
        results.scripts = await this.installScripts(plugin, pluginPath);
      }

      // Update registry
      const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '');
      if (!this.registry.installed.includes(shortName)) {
        this.registry.installed.push(shortName);
      }
      if (!this.registry.enabled.includes(shortName)) {
        this.registry.enabled.push(shortName);
      }
      this.saveRegistry();

      this.emit('install:complete', {
        name: pluginName,
        results
      });

      return {
        success: true,
        pluginName: shortName,
        displayName: metadata.displayName,
        category: metadata.category,
        agentsInstalled: results.agents.length,
        commandsInstalled: results.commands.length,
        rulesInstalled: results.rules.length,
        hooksInstalled: results.hooks.length,
        scriptsInstalled: results.scripts.length,
        agents: results.agents,
        commands: results.commands,
        rules: results.rules,
        hooks: results.hooks,
        scripts: results.scripts
      };
    } catch (error) {
      this.emit('install:error', {
        name: pluginName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Install agents from plugin
   * Thin wrapper over installResources (#611)
   */
  async installAgents(plugin, pluginPath) {
    const { metadata } = plugin;
    if (!metadata.category) {
      // Without a category the target would silently become .../agents/undefined
      // Group-level skip: 'agents' (plural) + plugin field, so consumers
      // keying install:skip on per-resource `name` are not misled. Also warn
      // loudly — this indicates a broken plugin manifest, not a normal skip.
      console.warn(`Plugin ${plugin.name}: metadata is missing "category" — agents not installed`);
      this.emit('install:skip', {
        type: 'agents',
        plugin: plugin.name,
        reason: 'Plugin metadata is missing "category" — agents not installed'
      });
      return [];
    }
    const targetDir = path.join(this.options.agentDir, metadata.category);
    const agents = Array.from(this.agents.values()).filter(a => a.plugin === plugin.name);

    return this.installResources(agents, {
      targetDir,
      mapItem: (agent) => {
        const targetPath = path.join(targetDir, path.basename(agent.filePath));
        return [{
          // registerAgents already verified the source file exists
          files: [{ type: 'agent', name: agent.name, sourcePath: agent.filePath, targetPath, checkMissing: false }],
          result: () => ({ name: agent.name, file: targetPath, description: agent.description }),
          event: () => ['install:agent', { agent: agent.name, path: targetPath }]
        }];
      }
    });
  }

  /**
   * Install commands from plugin
   * Thin wrapper over installResources (#611)
   */
  async installCommands(plugin, pluginPath) {
    const { metadata } = plugin;
    const targetDir = path.join(this.options.projectRoot, '.claude', 'commands');

    return this.installResources(metadata.commands, {
      targetDir,
      mapItem: async (command) => {
        // Auto-discovery from subdirectory: one unit per discovered .md file,
        // silently skipped when the target already exists (historical behavior)
        if (command.subdirectory && command.discovery === 'auto') {
          const commandsSourceDir = path.join(pluginPath, command.subdirectory);
          if (!(await this._pathExists(commandsSourceDir))) {
            return [];
          }
          let files;
          try {
            files = (await fsp.readdir(commandsSourceDir)).filter(f => f.endsWith('.md'));
          } catch (error) {
            // An unreadable discovery dir should not abort the whole install
            this.emit('install:file-error', {
              type: 'command', name: command.name, file: command.subdirectory, error: error.message
            });
            return [];
          }
          // namePrefix (#904): files stored without their namespace
          // (commands/issue-start.md) install under it (pm:issue-start.md)
          const prefix = command.namePrefix;
          return files.map(file => {
            const sourcePath = path.join(commandsSourceDir, file);
            const targetName = prefix && !file.includes(':') ? `${prefix}:${file}` : file;
            const targetPath = path.join(targetDir, targetName);
            return {
              files: [{ type: 'command', name: targetName, sourcePath, targetPath, checkMissing: false, emitSkip: false }],
              result: () => ({ name: targetName.replace('.md', ''), file: targetPath }),
              event: () => ['install:command', { command: targetName, path: targetPath }]
            };
          });
        }

        // Individual command files
        if (!command.file) return [];
        const sourcePath = path.join(pluginPath, command.file);
        const targetPath = path.join(targetDir, path.basename(command.file));
        return [{
          files: [{ type: 'command', name: command.name, sourcePath, targetPath }],
          result: () => ({ name: command.name, file: targetPath, description: command.description }),
          event: () => ['install:command', { command: command.name, path: targetPath }]
        }];
      }
    });
  }

  /**
   * Install rules from plugin
   * Thin wrapper over installResources (#611)
   */
  async installRules(plugin, pluginPath) {
    const { metadata } = plugin;
    const targetDir = path.join(this.options.projectRoot, '.claude', 'rules');

    return this.installResources(metadata.rules, {
      targetDir,
      mapItem: (rule) => {
        const sourcePath = path.join(pluginPath, rule.file);
        const targetPath = path.join(targetDir, path.basename(rule.file));
        return [{
          files: [{ type: 'rule', name: rule.name, sourcePath, targetPath }],
          result: () => ({ name: rule.name, file: targetPath, priority: rule.priority, description: rule.description }),
          event: () => ['install:rule', { rule: rule.name, priority: rule.priority, path: targetPath }]
        }];
      }
    });
  }

  /**
   * Install hooks from plugin
   * Supports both single-file and dual-language hooks
   * Thin wrapper over installResources (#611)
   */
  async installHooks(plugin, pluginPath) {
    const { metadata } = plugin;
    const targetDir = path.join(this.options.projectRoot, '.claude', 'hooks');

    return this.installResources(metadata.hooks, {
      targetDir,
      mapItem: (hook) => {
        const files = (hook.dual && hook.files ? hook.files : [hook.file]).map(file => ({
          type: 'hook',
          name: hook.name,
          file,
          sourcePath: path.join(pluginPath, file),
          targetPath: path.join(targetDir, path.basename(file)),
          mode: file.endsWith('.sh') ? 0o755 : undefined
        }));
        return [{
          files,
          result: (copied) => ({
            name: hook.name,
            type: hook.type,
            files: copied,
            dual: hook.dual || false,
            blocking: hook.blocking,
            description: hook.description
          }),
          event: (copied) => ['install:hook', { hook: hook.name, type: hook.type, paths: copied, dual: hook.dual }]
        }];
      }
    });
  }

  /**
   * Install scripts from plugin
   * Supports both single scripts and script collections (subdirectories)
   * Thin wrapper over installResources (#611)
   */
  async installScripts(plugin, pluginPath) {
    const { metadata } = plugin;
    const targetBaseDir = path.join(this.options.projectRoot, '.claude', 'scripts');

    return this.installResources(metadata.scripts, {
      targetDir: targetBaseDir,
      mapItem: (script) => {
        // Script collection (subdirectory)
        if (script.subdirectory && script.files) {
          // Remove 'scripts/' prefix from subdirectory if present
          const cleanSubdir = script.subdirectory.replace(/^scripts\//, '');
          const targetDir = path.join(targetBaseDir, cleanSubdir);
          return [{
            ensureDir: targetDir,
            files: script.files.map(file => ({
              type: 'script',
              name: script.name,
              file,
              sourcePath: path.join(pluginPath, script.subdirectory, file),
              targetPath: path.join(targetDir, file),
              mode: file.endsWith('.sh') ? 0o755 : undefined
            })),
            result: (copied) => ({
              name: script.name,
              type: script.type,
              subdirectory: script.subdirectory,
              files: copied,
              exported: script.exported,
              description: script.description
            }),
            event: (copied) => ['install:script-collection', {
              script: script.name,
              subdirectory: script.subdirectory,
              paths: copied
            }]
          }];
        }

        // Single script
        if (!script.file) return [];
        const sourcePath = path.join(pluginPath, script.file);
        // Remove 'scripts/' prefix from file path if present
        const cleanFile = script.file.replace(/^scripts\//, '');
        const targetPath = path.join(targetBaseDir, cleanFile);
        return [{
          files: [{
            type: 'script',
            name: script.name,
            sourcePath,
            targetPath,
            mode: script.file.endsWith('.sh') ? 0o755 : undefined,
            ensureTargetDir: true // create subdirectories if needed (e.g., lib/)
          }],
          result: () => ({
            name: script.name,
            type: script.type,
            file: targetPath,
            exported: script.exported,
            description: script.description
          }),
          event: () => ['install:script', { script: script.name, path: targetPath }]
        }];
      }
    });
  }

  /**
   * Uninstall plugin - remove all resources and update registry
   * Supports: agents, commands, rules, hooks, scripts (Schema v2.0)
   */
  async uninstallPlugin(pluginName) {
    const fullName = pluginName.includes('/') ? pluginName : `${this.options.scopePrefix}/${pluginName}`;
    const plugin = this.plugins.get(fullName);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    this.emit('uninstall:start', { name: fullName });

    try {
      const { metadata } = plugin;
      const results = {
        agents: [],
        commands: [],
        rules: [],
        hooks: [],
        scripts: []
      };

      // Remove agents (same category guard as installAgents). For plugins
      // without a category, fall back to the legacy 'undefined' directory so
      // agents installed by older versions (which built that path) still get
      // cleaned up.
      if (metadata.agents && metadata.agents.length > 0) {
        const targetDir = path.join(this.options.agentDir, metadata.category || 'undefined');
        for (const agent of metadata.agents) {
          const targetPath = path.join(targetDir, path.basename(agent.file));
          if ((await this._pathExists(targetPath)) && this._safeUnlink(targetPath, { type: 'agent', name: agent.name })) {
            results.agents.push(agent.name);
          }
        }

        // Remove empty category directory
        try {
          if ((await this._pathExists(targetDir)) && (await fsp.readdir(targetDir)).length === 0) {
            await fsp.rmdir(targetDir);
          }
        } catch (error) {
          this._debug('uninstall:rmdir-agents', error);
        }
      }

      // Remove commands
      if (metadata.commands && metadata.commands.length > 0) {
        const targetDir = path.join(this.options.projectRoot, '.claude', 'commands');
        for (const command of metadata.commands) {
          const targetPath = path.join(targetDir, path.basename(command.file));
          if ((await this._pathExists(targetPath)) && this._safeUnlink(targetPath, { type: 'command', name: command.name })) {
            results.commands.push(command.name);
          }
        }
      }

      // Remove rules
      if (metadata.rules && metadata.rules.length > 0) {
        const targetDir = path.join(this.options.projectRoot, '.claude', 'rules');
        for (const rule of metadata.rules) {
          const targetPath = path.join(targetDir, path.basename(rule.file));
          if ((await this._pathExists(targetPath)) && this._safeUnlink(targetPath, { type: 'rule', name: rule.name })) {
            results.rules.push(rule.name);
          }
        }
      }

      // Remove hooks
      if (metadata.hooks && metadata.hooks.length > 0) {
        const targetDir = path.join(this.options.projectRoot, '.claude', 'hooks');
        for (const hook of metadata.hooks) {
          const files = hook.dual && hook.files ? hook.files : [hook.file];
          let allRemoved = true;
          for (const file of files) {
            const targetPath = path.join(targetDir, path.basename(file));
            if (!this._safeUnlink(targetPath, { type: 'hook', name: hook.name })) {
              allRemoved = false;
            }
          }
          if (allRemoved) {
            results.hooks.push(hook.name);
          }
        }
      }

      // Remove scripts (same target as installScripts: .claude/scripts)
      if (metadata.scripts && metadata.scripts.length > 0) {
        const targetBaseDir = path.join(this.options.projectRoot, '.claude', 'scripts');
        for (const script of metadata.scripts) {
          let allRemoved = true;
          if (script.subdirectory && script.files) {
            // Remove 'scripts/' prefix from subdirectory if present
            const cleanSubdir = script.subdirectory.replace(/^scripts\//, '');
            const targetDir = path.join(targetBaseDir, cleanSubdir);
            for (const file of script.files) {
              const targetPath = path.join(targetDir, file);
              if (!this._safeUnlink(targetPath, { type: 'script', name: script.name })) {
                allRemoved = false;
              }
            }

            // Remove empty subdirectory
            try {
              if ((await this._pathExists(targetDir)) && (await fsp.readdir(targetDir)).length === 0) {
                await fsp.rmdir(targetDir);
              }
            } catch (error) {
              this._debug('uninstall:rmdir-scripts', error);
            }
          } else if (script.file) {
            // Remove 'scripts/' prefix from file path if present
            const cleanFile = script.file.replace(/^scripts\//, '');
            const targetPath = path.join(targetBaseDir, cleanFile);
            if (!this._safeUnlink(targetPath, { type: 'script', name: script.name })) {
              allRemoved = false;
            }
          }
          if (allRemoved) {
            results.scripts.push(script.name);
          }
        }
      }

      // Update registry
      const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '');
      this.registry.installed = this.registry.installed.filter(p => p !== shortName);
      this.registry.enabled = this.registry.enabled.filter(p => p !== shortName);
      this.saveRegistry();

      this.emit('uninstall:complete', {
        name: fullName,
        results
      });

      return {
        success: true,
        pluginName: shortName,
        agentsRemoved: results.agents.length,
        commandsRemoved: results.commands.length,
        rulesRemoved: results.rules.length,
        hooksRemoved: results.hooks.length,
        scriptsRemoved: results.scripts.length,
        agents: results.agents,
        commands: results.commands,
        rules: results.rules,
        hooks: results.hooks,
        scripts: results.scripts
      };
    } catch (error) {
      this.emit('uninstall:error', {
        name: fullName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update an installed plugin to the latest version
   * @param {string} pluginName - Plugin name (with or without scope)
   * @param {Object} options - Update options
   * @param {boolean} options.verbose - Show detailed output
   * @param {boolean} options.force - Force update even if versions match
   * @returns {Promise<Object>} Update result
   */
  async updatePlugin(pluginName, options = {}) {
    const { verbose = false, force = false } = options;
    const { execFileSync } = require('child_process');

    const fullName = pluginName.includes('/') ? pluginName : `${this.options.scopePrefix}/${pluginName}`;
    const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '');

    // Guard against shell/command injection via crafted plugin names
    if (!PluginManager.isValidNpmPackageName(fullName)) {
      throw new Error(`Invalid plugin package name: ${fullName}`);
    }

    this.emit('update:start', { name: fullName });

    try {
      // Check if plugin is installed
      if (!this.isInstalled(shortName)) {
        throw new Error(`Plugin ${shortName} is not installed. Use 'autopm plugin install ${shortName}' to install it.`);
      }

      // Get current installed version from plugin.json
      const plugin = this.plugins.get(fullName);
      if (!plugin || !plugin.loaded) {
        await this.loadPlugin(fullName);
      }

      const currentMetadata = this.plugins.get(fullName)?.metadata;
      const currentVersion = currentMetadata?.version || 'unknown';

      // Check npm for available version
      let availableVersion;
      try {
        const npmInfo = execFileSync('npm', ['view', fullName, 'version'], { encoding: 'utf-8' }).trim();
        availableVersion = npmInfo;
      } catch (error) {
        throw new Error(`Failed to check npm for ${fullName}: ${error.message}`);
      }

      // Compare versions
      if (currentVersion === availableVersion && !force) {
        this.emit('update:skipped', {
          name: fullName,
          reason: 'Already up to date',
          version: currentVersion
        });

        return {
          upToDate: true,
          currentVersion,
          updated: false
        };
      }

      if (verbose) {
        console.log(`  Current version: ${currentVersion}`);
        console.log(`  Available version: ${availableVersion}`);
      }

      // Uninstall old version
      if (verbose) {
        console.log(`  Removing old version...`);
      }

      const wasEnabled = this.isEnabled(shortName);
      await this.uninstallPlugin(fullName);

      // Update npm package globally
      if (verbose) {
        console.log(`  Updating npm package...`);
      }

      try {
        execFileSync('npm', ['update', '-g', fullName], {
          stdio: verbose ? 'inherit' : 'ignore'
        });
      } catch (error) {
        throw new Error(`Failed to update npm package: ${error.message}`);
      }

      // Reload plugin metadata from updated package
      await this.discoverPlugins();

      // Reinstall with new version
      if (verbose) {
        console.log(`  Installing new version...`);
      }

      const installResult = await this.installPlugin(fullName);

      // Restore enabled state
      if (wasEnabled) {
        this.enablePlugin(shortName);
      }

      this.emit('update:complete', {
        name: fullName,
        oldVersion: currentVersion,
        newVersion: availableVersion,
        stats: {
          agents: installResult.agentsInstalled,
          commands: installResult.commandsInstalled,
          rules: installResult.rulesInstalled,
          hooks: installResult.hooksInstalled,
          scripts: installResult.scriptsInstalled
        }
      });

      return {
        updated: true,
        oldVersion: currentVersion,
        newVersion: availableVersion,
        stats: {
          agents: installResult.agentsInstalled,
          commands: installResult.commandsInstalled,
          rules: installResult.rulesInstalled,
          hooks: installResult.hooksInstalled,
          scripts: installResult.scriptsInstalled
        }
      };
    } catch (error) {
      this.emit('update:error', {
        name: fullName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get list of installed plugins (from registry)
   */
  getInstalledPlugins() {
    return this.registry.installed;
  }

  /**
   * Get list of enabled plugins (from registry)
   */
  getEnabledPlugins() {
    return this.registry.enabled;
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(pluginName) {
    const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '').replace('plugin-', '');
    return this.registry.installed.some(p => p === shortName || p === `plugin-${shortName}`);
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginName) {
    const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '').replace('plugin-', '');
    return this.registry.enabled.some(p => p === shortName || p === `plugin-${shortName}`);
  }

  /**
   * Enable plugin
   */
  enablePlugin(pluginName) {
    const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '');

    if (!this.isInstalled(shortName)) {
      throw new Error(`Plugin not installed: ${pluginName}`);
    }

    if (!this.registry.enabled.includes(shortName)) {
      this.registry.enabled.push(shortName);
      this.saveRegistry();
      this.emit('plugin:enabled', { name: shortName });
    }
  }

  /**
   * Disable plugin
   */
  disablePlugin(pluginName) {
    const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '');
    this.registry.enabled = this.registry.enabled.filter(p => p !== shortName);
    this.saveRegistry();
    this.emit('plugin:disabled', { name: shortName });
  }

  /**
   * Search plugins by keyword
   */
  async searchPlugins(keyword) {
    await this.initialize();

    const lowerKeyword = keyword.toLowerCase();
    const results = [];

    for (const [name, plugin] of this.plugins.entries()) {
      const { metadata } = plugin;

      // Search in name
      if (name.toLowerCase().includes(lowerKeyword)) {
        results.push(this.formatPluginForSearch(name, plugin));
        continue;
      }

      // Search in display name
      if (metadata.displayName.toLowerCase().includes(lowerKeyword)) {
        results.push(this.formatPluginForSearch(name, plugin));
        continue;
      }

      // Search in description
      if (metadata.description.toLowerCase().includes(lowerKeyword)) {
        results.push(this.formatPluginForSearch(name, plugin));
        continue;
      }

      // Search in keywords
      if (metadata.keywords && metadata.keywords.some(k => k.toLowerCase().includes(lowerKeyword))) {
        results.push(this.formatPluginForSearch(name, plugin));
        continue;
      }

      // Search in agent names
      if (metadata.agents.some(a => a.name.toLowerCase().includes(lowerKeyword))) {
        results.push(this.formatPluginForSearch(name, plugin));
        continue;
      }
    }

    return results;
  }

  /**
   * Format plugin for search results
   */
  formatPluginForSearch(name, plugin) {
    const shortName = name.replace(`${this.options.scopePrefix}/`, '');
    return {
      pluginName: shortName,
      displayName: plugin.metadata.displayName,
      description: plugin.metadata.description,
      category: plugin.metadata.category,
      agents: plugin.metadata.agents,
      keywords: plugin.metadata.keywords || []
    };
  }

  /**
   * Get plugin info with status
   */
  async getPluginInfo(pluginName) {
    const fullName = pluginName.includes('/') ? pluginName : `${this.options.scopePrefix}/${pluginName}`;

    // Ensure plugin is discovered
    if (!this.initialized) {
      await this.initialize();
    }

    const plugin = this.plugins.get(fullName);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    const shortName = fullName.replace(`${this.options.scopePrefix}/`, '');

    return {
      ...plugin.metadata,
      pluginName: shortName,
      path: plugin.path,
      installed: this.isInstalled(shortName),
      enabled: this.isEnabled(shortName),
      compatible: plugin.compatible
    };
  }

  /**
   * Load plugin metadata (for CLI compatibility)
   */
  async loadPluginMetadata(pluginName) {
    const fullName = pluginName.includes('/') ? pluginName : `${this.options.scopePrefix}/${pluginName}`;

    if (!this.initialized) {
      await this.initialize();
    }

    const plugin = this.plugins.get(fullName);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    return {
      ...plugin.metadata,
      pluginName: pluginName.replace(`${this.options.scopePrefix}/`, ''),
      path: plugin.path
    };
  }

  /**
   * List all available plugins
   */
  listPlugins(options = {}) {
    const {
      loaded = null,
      compatible = null,
      category = null
    } = options;

    let plugins = Array.from(this.plugins.values());

    // Apply filters
    if (loaded !== null) {
      plugins = plugins.filter(p => p.loaded === loaded);
    }

    if (compatible !== null) {
      plugins = plugins.filter(p => p.compatible === compatible);
    }

    if (category !== null) {
      plugins = plugins.filter(p => p.metadata.category === category);
    }

    return plugins.map(p => ({
      name: p.name,
      displayName: p.metadata.displayName,
      description: p.metadata.description,
      category: p.metadata.category,
      agentCount: p.metadata.agents.length,
      loaded: p.loaded,
      compatible: p.compatible,
      version: p.metadata.version
    }));
  }

  /**
   * List all registered agents
   */
  listAgents(options = {}) {
    const { plugin = null, tags = null } = options;

    let agents = Array.from(this.agents.values());

    // Apply filters
    if (plugin) {
      agents = agents.filter(a => a.plugin === plugin);
    }

    if (tags && tags.length > 0) {
      agents = agents.filter(a =>
        tags.some(tag => a.tags.includes(tag))
      );
    }

    return agents.map(a => ({
      id: a.id,
      name: a.name,
      plugin: a.plugin,
      description: a.description,
      tags: a.tags,
      filePath: a.filePath
    }));
  }

  /**
   * Register a hook for plugin extensibility
   * Based on unplugin hooks pattern
   */
  registerHook(hookName, handler) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push(handler);

    this.emit('hook:registered', { hookName });
  }

  /**
   * Execute plugin hooks
   */
  async executePluginHooks(plugin, hookName, data = {}) {
    const hooks = this.hooks.get(hookName) || [];

    for (const hook of hooks) {
      try {
        await hook(plugin, data);
      } catch (error) {
        this.emit('hook:error', {
          hookName,
          plugin: plugin.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Get core version from package.json
   */
  getCoreVersion() {
    // Read autopm framework version, not the user's project version
    try {
      // First try: autopm's own package.json (two levels up from lib/plugins/)
      const autopmPkgPath = path.join(__dirname, '..', '..', 'package.json');
      if (fs.existsSync(autopmPkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(autopmPkgPath, 'utf-8'));
        if (pkg.name === 'claude-autopm') {
          return pkg.version;
        }
      }
    } catch (error) {
      // fall through to global npm lookup
      this._debug('core-version:local-package', error);
    }

    try {
      // Fallback: check global npm install
      const { execSync } = require('child_process');
      const version = execSync('npm list -g claude-autopm --depth=0 2>/dev/null | grep claude-autopm', { encoding: 'utf8' });
      const match = version.match(/@(\d+\.\d+\.\d+)/);
      if (match) return match[1];
    } catch (error) {
      // fall through to configured minimum
      this._debug('core-version:global-npm', error);
    }

    return this.options.minCoreVersion;
  }

  /**
   * Check version compatibility
   * Supports semver range syntax: >=, >, <=, <, ^ (same major),
   * ~ (same major.minor). A bare version is treated as >= for
   * backward compatibility with existing plugin manifests.
   */
  isCompatible(currentVersion, requiredVersion) {
    const match = String(requiredVersion).trim().match(/^(>=|<=|>|<|\^|~)?\s*(\d+(?:\.\d+){0,2})/);
    if (!match) return false;

    const operator = match[1] || '>=';
    const baseVersion = match[2];
    const cmp = this.compareVersions(currentVersion, baseVersion);
    const [curMajor, curMinor] = currentVersion.split('.').map(Number);
    const reqParts = baseVersion.split('.').map(Number);
    const reqMajor = reqParts[0];
    const reqMinor = reqParts.length > 1 ? reqParts[1] : undefined;
    const reqPatch = reqParts.length > 2 ? reqParts[2] : undefined;

    switch (operator) {
      case '>': return cmp > 0;
      case '<': return cmp < 0;
      case '<=': return cmp <= 0;
      case '^':
        if (cmp < 0) return false;
        if (reqMajor > 0) return curMajor === reqMajor;
        // ^0 → any 0.x
        if (reqMinor === undefined) return curMajor === 0;
        // ^0.minor / ^0.minor (no patch) → same minor
        if (reqMinor > 0 || reqPatch === undefined) return curMajor === 0 && curMinor === reqMinor;
        // ^0.0.patch → only the exact version
        return cmp === 0;
      case '~':
        if (cmp < 0) return false;
        // ~major → any minor within the major
        if (reqMinor === undefined) return curMajor === reqMajor;
        return curMajor === reqMajor && curMinor === reqMinor;
      case '>=':
      default:
        return cmp >= 0;
    }
  }

  /**
   * Compare semantic versions
   * Returns: -1 (less), 0 (equal), 1 (greater)
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      loadedPlugins: this.loadedPlugins.size,
      totalAgents: this.agents.size,
      compatiblePlugins: Array.from(this.plugins.values())
        .filter(p => p.compatible).length,
      categories: Array.from(
        new Set(
          Array.from(this.plugins.values())
            .map(p => p.metadata.category)
        )
      )
    };
  }

  /**
   * Find which plugin contains a specific agent
   * @param {string} agentFileName - Agent file name (e.g., "react-ui-expert.md")
   * @returns {Object|null} - Plugin info or null if not found
   */
  async findPluginForAgent(agentFileName) {
    // Ensure plugins are discovered
    if (!this.initialized) {
      await this.initialize();
    }

    // Normalize agent filename
    const normalizedName = agentFileName.endsWith('.md') ? agentFileName : `${agentFileName}.md`;

    // Search through all plugins
    for (const [pluginName, plugin] of this.plugins.entries()) {
      const { metadata } = plugin;

      // Skip if plugin has no agents
      if (!metadata.agents || !Array.isArray(metadata.agents)) {
        continue;
      }

      // Check if any agent in this plugin matches
      const matchingAgent = metadata.agents.find(agent => {
        const agentFile = path.basename(agent.file);
        return agentFile === normalizedName;
      });

      if (matchingAgent) {
        const shortName = pluginName.replace(`${this.options.scopePrefix}/`, '');
        return {
          pluginName: shortName,
          fullPluginName: pluginName,
          displayName: metadata.displayName,
          category: metadata.category,
          agent: matchingAgent,
          installed: this.isInstalled(shortName),
          enabled: this.isEnabled(shortName)
        };
      }
    }

    return null;
  }

  /**
   * Find plugins for multiple agents
   * @param {Array<string>} agentFileNames - Array of agent file names
   * @returns {Object} - Map of agents to plugin info, plus missing agents
   */
  async findPluginsForAgents(agentFileNames) {
    const result = {
      found: new Map(), // agentFileName -> plugin info
      missing: [], // agents not found in any plugin
      byPlugin: new Map() // pluginName -> [agentFileNames]
    };

    for (const agentFileName of agentFileNames) {
      const pluginInfo = await this.findPluginForAgent(agentFileName);

      if (pluginInfo) {
        result.found.set(agentFileName, pluginInfo);

        // Group by plugin
        if (!result.byPlugin.has(pluginInfo.pluginName)) {
          result.byPlugin.set(pluginInfo.pluginName, {
            ...pluginInfo,
            agents: []
          });
        }
        result.byPlugin.get(pluginInfo.pluginName).agents.push(agentFileName);
      } else {
        result.missing.push(agentFileName);
      }
    }

    return result;
  }
}

/**
 * Path of a plugin's manifest: `.claude-plugin/plugin.json` (Claude Code plugin format, #903),
 * else a legacy root `plugin.json` (npm packages published before #903). Null if neither exists.
 * @param {string} pluginDir
 * @returns {string|null}
 */
PluginManager.manifestPath = function manifestPath(pluginDir) {
  for (const rel of [path.join('.claude-plugin', 'plugin.json'), 'plugin.json']) {
    const p = path.join(pluginDir, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
};

/**
 * Read a plugin manifest as the flat metadata object the rest of autopm uses.
 * A Claude Code manifest keeps the homemade keys (agents, commands, rules, hooks, scripts,
 * category, features, compatibleWith, ...) under `metadata`; they are lifted to the top level,
 * and `name` stays the npm package name (`metadata.packageName`) with the plugin name in `pluginName`.
 * A legacy manifest (top-level `schemaVersion`) is returned unchanged.
 * @param {string} pluginDir
 * @returns {Object|null} null if the plugin has no manifest; throws on invalid JSON
 */
PluginManager.readManifest = function readManifest(pluginDir) {
  const file = PluginManager.manifestPath(pluginDir);
  if (!file) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
  if (raw.schemaVersion !== undefined || !raw.metadata || typeof raw.metadata !== 'object') return raw;
  const { metadata, ...top } = raw;
  const { packageName, ...homemade } = metadata;
  return { ...top, ...homemade, pluginName: top.name, name: packageName || top.name };
};

module.exports = PluginManager;
