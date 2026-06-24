import { createServiceContainer, ServiceContainer } from '../../src/core/serviceContainer';
import { StellarClient } from '../../src/client/stellarClient';
import { Logger } from '../../src/utils/logger';

describe('ServiceContainer', () => {
  it('resolves explicitly injected singleton services', () => {
    const logger = new Logger('none');
    const httpClient = { get: jest.fn() } as any;
    const rpcClient = { getHealth: jest.fn() } as any;
    const webSocketManager = { connect: jest.fn() } as any;

    const container = createServiceContainer({
      logger,
      httpClient,
      rpcClient,
      webSocketManager,
    });

    expect(container.getLogger()).toBe(logger);
    expect(container.getHttpClient({})).toBe(httpClient);
    expect(
      container.getRpcClient({
        rpcUrl: 'https://example.com',
        allowHttp: false,
        concurrencyEnabled: false,
        concurrencyConfig: {} as any,
      })
    ).toBe(rpcClient);
    expect(
      container.getWebSocketManager({
        rpcUrl: 'https://example.com',
        config: {},
        logger,
      })
    ).toBe(webSocketManager);
  });

  it('allows StellarClient dependencies to be injected at runtime', async () => {
    const rpcClient = {
      getHealth: jest.fn().mockResolvedValue({ status: 'healthy', version: 'test' }),
    } as any;
    const httpClient = { get: jest.fn() } as any;
    const logger = new Logger('none');

    const client = new StellarClient({
      network: 'testnet',
      services: {
        rpcClient,
        httpClient,
        logger,
      },
    });

    await expect(client.getHealth()).resolves.toEqual({ status: 'healthy', version: 'test' });
    expect(client.rpc).toBe(rpcClient);
    expect(client.httpClient).toBe(httpClient);
    expect(client.logger).toBe(logger);
  });

  it('can extend a container without mutating the original registration graph', () => {
    const logger = new Logger('none');
    const base = new ServiceContainer({ logger });
    const httpClient = { get: jest.fn() } as any;
    const extended = base.extend({ httpClient });

    expect(base.getLogger()).toBe(logger);
    expect(extended.getLogger()).toBe(logger);
    expect(extended.getHttpClient({})).toBe(httpClient);
    expect(base.getHttpClient({})).not.toBe(httpClient);
  });
});
