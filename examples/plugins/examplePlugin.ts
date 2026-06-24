import { PluginConfig, getPluginManager } from '../../src/plugin';
import type { StellarClient } from '../../src/client/stellarClient';

export const examplePlugin: PluginConfig = {
  id: 'example-plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating the plugin architecture',
  
  hooks: {
    onInstall: () => {
      console.log('Example plugin installed!');
    },
    
    beforeClientInit: (options) => {
      console.log('Example plugin: before client init', options);
      // Modify options if needed
      return {
        ...options,
        feeBufferMultiplier: 1.2,
      };
    },
    
    afterClientInit: (client: StellarClient) => {
      console.log('Example plugin: after client init', client);
      
      // Add event listeners, register additional functionality, etc.
      client.use({
        name: 'example-middleware',
        workflow: 'request',
        stage: 'pre',
        order: 10,
        handler: async (ctx, next) => {
          console.log('Example middleware: before request', ctx.operation);
          const result = await next(ctx);
          console.log('Example middleware: after request', ctx.operation, result);
          return result;
        },
      });
    },
    
    onUninstall: () => {
      console.log('Example plugin uninstalled!');
    },
  },
};

// Auto-register the plugin
getPluginManager().register(examplePlugin).install(examplePlugin.id);
