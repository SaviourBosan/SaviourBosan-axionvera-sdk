import { DefaultContractDiscoveryService, contractDiscovery } from '../../src/discovery';
import { VaultContractDescriptor } from '../../src/discovery/defaultContracts';
import { CapabilityRegistry } from '../../src/registry';
import { ValidationError } from '../../src/errors/axionveraError';

describe('smart contract discovery', () => {
  test('discovers default supported contracts dynamically', () => {
    const contracts = contractDiscovery.discoverContracts();

    expect(contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'vault',
          displayName: 'Axionvera Vault',
          capabilities: expect.arrayContaining([
            'assets:deposit',
            'assets:withdraw',
            'rewards:claim',
          ]),
        }),
      ])
    );
  });

  test('looks up capabilities and methods by contract type', () => {
    const service = new DefaultContractDiscoveryService();

    expect(service.supportsCapability('vault', 'shares:convert')).toBe(true);
    expect(service.supportsCapability('vault', 'rewards:claim')).toBe(true);
    expect(service.lookupContract('vault')?.methods.map((method) => method.name)).toEqual(
      expect.arrayContaining(['deposit', 'withdraw', 'convertToAssets', 'claimRewards'])
    );
  });

  test('registers and discovers a contract by concrete contract id', () => {
    const contractId = '0x1111111111111111111111111111111111111111';
    const registry = new CapabilityRegistry([{ ...VaultContractDescriptor, contractId }]);

    expect(registry.lookup(contractId)?.type).toBe('vault');
    expect(registry.getCapabilities(contractId)).toContain('assets:deposit');
  });

  test('validates descriptor schema before registration', () => {
    const service = new DefaultContractDiscoveryService();
    const validation = service.validateContract({
      ...VaultContractDescriptor,
      contractId: 'not-a-contract-id',
      capabilities: ['balance:read'],
      methods: [{ ...VaultContractDescriptor.methods[0], capability: 'assets:withdraw' }],
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        'contractId must be a valid EVM, Soroban, or 32-byte hex identifier',
        'method getBalance references unsupported capability assets:withdraw',
      ])
    );
  });

  test('throws a validation error for invalid registration', () => {
    expect(
      () => new CapabilityRegistry([{ ...VaultContractDescriptor, capabilities: [] }])
    ).toThrow(ValidationError);
  });
});
