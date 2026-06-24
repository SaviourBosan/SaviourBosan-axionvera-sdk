import { ContractMetadata, ContractMetadataRegistry } from '../../src/registry';

const vaultMetadata: ContractMetadata = {
  name: 'Vault',
  version: '1.2.0',
  capabilities: ['read', 'write', 'events'],
  supportedFeatures: ['deposits', 'withdrawals', 'rewards'],
  abiName: 'VaultABI',
  deployments: [
    {
      environment: 'testnet',
      address: 'CBIELZJOO4Z5WQG6FPUV2A5BB3V4T6EULJMYNN2WJNQ57WJQG5KTEST',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    },
    {
      environment: 'mainnet',
      address: 'CBIELZJOO4Z5WQG6FPUV2A5BB3V4T6EULJMYNN2WJNQ57WJQG5KMAIN',
    },
  ],
};

describe('ContractMetadataRegistry', () => {
  it('stores and retrieves contract metadata', () => {
    const registry = new ContractMetadataRegistry([vaultMetadata]);

    expect(registry.has('Vault')).toBe(true);
    expect(registry.get('Vault')).toEqual(vaultMetadata);
  });

  it('supports environment-specific deployment lookups', () => {
    const registry = new ContractMetadataRegistry([vaultMetadata]);

    expect(registry.getDeployment('Vault', 'testnet')).toEqual(vaultMetadata.deployments[0]);
    expect(registry.get('Vault', { environment: 'mainnet' })?.deployments).toHaveLength(2);
    expect(registry.get('Vault', { environment: 'futurenet' })).toBeUndefined();
  });

  it('filters registered contracts by capability and feature', () => {
    const registry = new ContractMetadataRegistry([
      vaultMetadata,
      {
        name: 'ReadOnlyOracle',
        version: '0.1.0',
        capabilities: ['read'],
        supportedFeatures: ['prices'],
        deployments: [{ environment: 'testnet', address: 'CORACLEADDRESS' }],
      },
    ]);

    expect(registry.list({ capability: 'write' }).map((entry) => entry.name)).toEqual(['Vault']);
    expect(registry.list({ feature: 'prices' }).map((entry) => entry.name)).toEqual([
      'ReadOnlyOracle',
    ]);
  });

  it('validates required fields and duplicate environments', () => {
    const registry = new ContractMetadataRegistry();
    const invalidMetadata: ContractMetadata = {
      name: 'Broken',
      version: '',
      capabilities: [],
      deployments: [
        { environment: 'testnet', address: '' },
        { environment: 'testnet', address: 'CDUPLICATE', blockHeight: -1 },
      ],
    };

    expect(registry.validate(invalidMetadata)).toEqual({
      valid: false,
      errors: [
        'version is required',
        'at least one capability is required',
        'deployments[0].address is required',
        'duplicate deployment environment: testnet',
        'deployments[1].blockHeight must be non-negative',
      ],
    });
    expect(() => registry.register(invalidMetadata)).toThrow(
      'Invalid contract metadata for Broken'
    );
  });

  it('returns defensive copies of registry data', () => {
    const registry = new ContractMetadataRegistry([vaultMetadata]);
    const stored = registry.get('Vault');

    stored?.capabilities.push('admin');
    stored?.deployments.push({ environment: 'futurenet', address: 'CFUTURE' });

    expect(registry.get('Vault')?.capabilities).toEqual(['read', 'write', 'events']);
    expect(registry.get('Vault')?.deployments).toHaveLength(2);
  });
});
