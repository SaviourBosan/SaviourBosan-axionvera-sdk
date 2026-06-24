import { AdapterRegistry } from '../../src/adapters/adapterRegistry';
import { ContractAdapter } from '../../src/adapters/types';

function mockAdapter(name: string, supports = true): ContractAdapter {
  return {
    name,
    version: '1.0.0',
    supports: async () => supports,
    read: async () => ({ data: name }),
    write: async () => 'tx_' + name + '_123',
  };
}

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it('registers and retrieves an adapter', () => {
    const adapter = mockAdapter('vault');
    registry.register(adapter);
    expect(registry.get('vault')).toBe(adapter);
  });

  it('returns undefined for unknown adapter', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('sets first registered as default', () => {
    registry.register(mockAdapter('vault'));
    registry.register(mockAdapter('token'));
    expect(registry.getDefault()?.name).toBe('vault');
  });

  it('unregisters adapters', () => {
    const adapter = mockAdapter('vault');
    registry.register(adapter);
    registry.unregister('vault');
    expect(registry.get('vault')).toBeUndefined();
  });

  it('finds adapter by contract support', async () => {
    const vault = mockAdapter('vault', true);
    const token = mockAdapter('token', false);
    registry.register(vault);
    registry.register(token);

    const found = await registry.findAdapter('CABC123');
    expect(found?.name).toBe('vault');
  });

  it('lists all registered adapters', () => {
    registry.register(mockAdapter('a'));
    registry.register(mockAdapter('b'));
    expect(registry.list()).toHaveLength(2);
  });

  it('returns correct count', () => {
    registry.register(mockAdapter('a'));
    registry.register(mockAdapter('b'));
    expect(registry.count()).toBe(2);
  });

  it('throws when setting default to unregistered adapter', () => {
    expect(() => registry.setDefault('nonexistent')).toThrow('not registered');
  });

  it('uses constructor default', () => {
    const adapter = mockAdapter('custom');
    const r = new AdapterRegistry({ defaultAdapter: 'custom' });
    r.register(adapter);
    expect(r.getDefault()?.name).toBe('custom');
  });
});
