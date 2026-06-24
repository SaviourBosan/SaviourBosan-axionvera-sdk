import { PluginConfig, PluginInstance, PluginManagerConfig, PluginHooks } from './types';
import type { StellarClient, StellarClientOptions } from '../client/stellarClient';
import type { ServiceContainer, ServiceOverrides } from '../core/serviceContainer';
import type { Middleware } from '../middleware';

export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private config: PluginManagerConfig;
  private clients: Set<StellarClient> = new Set();

  constructor(config: PluginManagerConfig = {}) {
    this.config = {
      autoInstall: false,
      ...config,
    };
  }

  /**
   * Register a plugin
   */
  register(plugin: PluginConfig): PluginManager {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id "${plugin.id}" is already registered`);
    }

    const instance: PluginInstance = {
      config: plugin,
      installed: false,
    };

    this.plugins.set(plugin.id, instance);

    if (this.config.autoInstall) {
      this.install(plugin.id);
    }

    return this;
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): PluginManager {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with id "${pluginId}" not found`);
    }

    if (instance.installed) {
      this.uninstall(pluginId);
    }

    this.plugins.delete(pluginId);
    return this;
  }

  /**
   * Install a plugin
   */
  async install(pluginId: string): Promise<PluginManager> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with id "${pluginId}" not found`);
    }

    if (instance.installed) {
      return this;
    }

    if (instance.config.hooks?.onInstall) {
      await instance.config.hooks.onInstall();
    }

    instance.installed = true;

    // Apply middleware and services to existing clients
    for (const client of this.clients) {
      await this.applyPluginToClient(instance, client);
    }

    return this;
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<PluginManager> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with id "${pluginId}" not found`);
    }

    if (!instance.installed) {
      return this;
    }

    if (instance.config.hooks?.onUninstall) {
      await instance.config.hooks.onUninstall();
    }

    instance.installed = false;
    return this;
  }

  /**
   * Get a registered plugin
   */
  get(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all installed plugins
   */
  getInstalled(): PluginInstance[] {
    return this.getAll().filter(p => p.installed);
  }

  /**
   * Process client options through installed plugins
   */
  async processClientOptions(options: StellarClientOptions): Promise<StellarClientOptions> {
    let processedOptions = { ...options };

    for (const plugin of this.getInstalled()) {
      if (plugin.config.hooks?.beforeClientInit) {
        processedOptions = await plugin.config.hooks.beforeClientInit(processedOptions);
      }
    }

    return processedOptions;
  }

  /**
   * Apply all installed plugins to a client
   */
  async applyToClient(client: StellarClient): Promise<void> {
    this.clients.add(client);

    for (const plugin of this.getInstalled()) {
      await this.applyPluginToClient(plugin, client);
    }
  }

  /**
   * Get combined service overrides from all installed plugins
   */
  getServiceOverrides(): ServiceOverrides {
    const overrides: ServiceOverrides = {};

    for (const plugin of this.getInstalled()) {
      if (plugin.config.services) {
        Object.assign(overrides, plugin.config.services);
      }
    }

    return overrides;
  }

  /**
   * Get middleware from all installed plugins
   */
  getMiddleware(): Middleware[] {
    const middleware: Middleware[] = [];

    for (const plugin of this.getInstalled()) {
      if (plugin.config.middleware) {
        middleware.push(...plugin.config.middleware);
      }
    }

    return middleware;
  }

  /**
   * Apply a single plugin to a client
   */
  private async applyPluginToClient(plugin: PluginInstance, client: StellarClient): Promise<void> {
    if (plugin.config.hooks?.afterClientInit) {
      await plugin.config.hooks.afterClientInit(client);
    }

    if (plugin.config.middleware) {
      for (const mw of plugin.config.middleware) {
        client.use(mw);
      }
    }
  }
}

// Singleton instance
let defaultPluginManager: PluginManager | undefined;

/**
 * Get the default plugin manager instance
 */
export function getPluginManager(): PluginManager {
  if (!defaultPluginManager) {
    defaultPluginManager = new PluginManager();
  }
  return defaultPluginManager;
}

/**
 * Set the default plugin manager instance
 */
export function setPluginManager(manager: PluginManager): void {
  defaultPluginManager = manager;
}
