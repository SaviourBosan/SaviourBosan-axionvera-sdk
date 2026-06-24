import type { StellarClient, StellarClientOptions } from '../client/stellarClient';
import type { ServiceContainer, ServiceOverrides } from '../core/serviceContainer';
import type { Middleware } from '../middleware';

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  /**
   * Called when the plugin is installed
   */
  onInstall?: () => void | Promise<void>;

  /**
   * Called before the StellarClient is initialized
   * Can modify the client options
   */
  beforeClientInit?: (options: StellarClientOptions) => StellarClientOptions | Promise<StellarClientOptions>;

  /**
   * Called after the StellarClient is initialized
   * Can register middleware, event listeners, etc.
   */
  afterClientInit?: (client: StellarClient) => void | Promise<void>;

  /**
   * Called when the plugin is uninstalled
   */
  onUninstall?: () => void | Promise<void>;
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /** Unique plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin lifecycle hooks */
  hooks?: PluginHooks;
  /** Service overrides for dependency injection */
  services?: ServiceOverrides;
  /** Middleware to register */
  middleware?: Middleware[];
}

/**
 * Plugin instance
 */
export interface PluginInstance {
  config: PluginConfig;
  installed: boolean;
}

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
  /** Auto-install plugins when registered */
  autoInstall?: boolean;
}
