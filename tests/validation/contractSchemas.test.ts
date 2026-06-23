import {
  VAULT_CONTRACT_ID,
  VaultBalanceResultSchema,
  VaultDepositParamsSchema,
  VaultInfoResultSchema,
  VaultWithdrawParamsSchema,
} from '../../src/contracts/contractSchemas';
import { defaultValidationEngine } from '../../src/validation/engine';
import { SchemaValidationError } from '../../src/errors/axionveraError';

describe('contractSchemas registration', () => {
  it('registers a params schema for Vault.deposit on import', () => {
    expect(defaultValidationEngine.hasSchema(VAULT_CONTRACT_ID, 'deposit')).toBe(true);
    expect(defaultValidationEngine.getSchema(VAULT_CONTRACT_ID, 'deposit')?.params).toBe(
      VaultDepositParamsSchema
    );
  });

  it('registers a params schema for Vault.withdraw on import', () => {
    expect(defaultValidationEngine.hasSchema(VAULT_CONTRACT_ID, 'withdraw')).toBe(true);
    expect(defaultValidationEngine.getSchema(VAULT_CONTRACT_ID, 'withdraw')?.params).toBe(
      VaultWithdrawParamsSchema
    );
  });

  it('registers a result schema for Vault.getVaultInfo on import', () => {
    expect(defaultValidationEngine.hasSchema(VAULT_CONTRACT_ID, 'getVaultInfo')).toBe(true);
    expect(defaultValidationEngine.getSchema(VAULT_CONTRACT_ID, 'getVaultInfo')?.result).toBe(
      VaultInfoResultSchema
    );
  });

  it('registers a result schema for Vault.getBalance on import', () => {
    expect(defaultValidationEngine.hasSchema(VAULT_CONTRACT_ID, 'getBalance')).toBe(true);
    expect(defaultValidationEngine.getSchema(VAULT_CONTRACT_ID, 'getBalance')?.result).toBe(
      VaultBalanceResultSchema
    );
  });
});

describe('Vault.deposit params validation', () => {
  it('accepts a valid deposit with only the required amount', () => {
    const result = defaultValidationEngine.validateParams<{ amount: bigint }>(
      VAULT_CONTRACT_ID,
      'deposit',
      { amount: 1_000n }
    );
    expect(result.amount).toBe(1_000n);
  });

  it('accepts an optional asset and referralCode', () => {
    const result = defaultValidationEngine.validateParams<{
      amount: bigint;
      asset?: string;
      referralCode?: string;
    }>(VAULT_CONTRACT_ID, 'deposit', { amount: 1_000n, asset: 'USDC', referralCode: 'abc' });

    expect(result).toEqual({ amount: 1_000n, asset: 'USDC', referralCode: 'abc' });
  });

  it('rejects a zero amount', () => {
    expect(() =>
      defaultValidationEngine.validateParams(VAULT_CONTRACT_ID, 'deposit', { amount: 0n })
    ).toThrow(SchemaValidationError);
  });

  it('rejects a negative amount', () => {
    expect(() =>
      defaultValidationEngine.validateParams(VAULT_CONTRACT_ID, 'deposit', { amount: -5n })
    ).toThrow(SchemaValidationError);
  });

  it('rejects a non-bigint amount', () => {
    expect(() =>
      defaultValidationEngine.validateParams(VAULT_CONTRACT_ID, 'deposit', { amount: 100 })
    ).toThrow(SchemaValidationError);
  });

  it('rejects an empty-string asset', () => {
    expect(() =>
      defaultValidationEngine.validateParams(VAULT_CONTRACT_ID, 'deposit', {
        amount: 100n,
        asset: '',
      })
    ).toThrow(SchemaValidationError);
  });
});

describe('Vault.withdraw params validation', () => {
  it('accepts a valid withdraw amount', () => {
    const result = defaultValidationEngine.validateParams<{ amount: bigint }>(
      VAULT_CONTRACT_ID,
      'withdraw',
      { amount: 250n }
    );
    expect(result.amount).toBe(250n);
  });

  it('rejects a zero amount', () => {
    expect(() =>
      defaultValidationEngine.validateParams(VAULT_CONTRACT_ID, 'withdraw', { amount: 0n })
    ).toThrow(SchemaValidationError);
  });
});

describe('Vault.getVaultInfo result validation', () => {
  it('accepts a well-formed VaultInfo result', () => {
    const result = defaultValidationEngine.validateResult(VAULT_CONTRACT_ID, 'getVaultInfo', {
      totalAssets: 1_000_000n,
      totalSupply: 900_000n,
      apy: 5.25,
      lockPeriod: 30,
    });
    expect(result).toEqual({
      totalAssets: 1_000_000n,
      totalSupply: 900_000n,
      apy: 5.25,
      lockPeriod: 30,
    });
  });

  it('rejects a negative apy', () => {
    expect(() =>
      defaultValidationEngine.validateResult(VAULT_CONTRACT_ID, 'getVaultInfo', {
        totalAssets: 1n,
        totalSupply: 1n,
        apy: -1,
        lockPeriod: 30,
      })
    ).toThrow(SchemaValidationError);
  });

  it('rejects a non-integer lockPeriod', () => {
    expect(() =>
      defaultValidationEngine.validateResult(VAULT_CONTRACT_ID, 'getVaultInfo', {
        totalAssets: 1n,
        totalSupply: 1n,
        apy: 1,
        lockPeriod: 1.5,
      })
    ).toThrow(SchemaValidationError);
  });

  it('rejects a missing field with a descriptive error', () => {
    try {
      defaultValidationEngine.validateResult(VAULT_CONTRACT_ID, 'getVaultInfo', {
        totalAssets: 1n,
        apy: 1,
        lockPeriod: 1,
      });
      throw new Error('expected validateResult to throw');
    } catch (err) {
      const schemaErr = err as SchemaValidationError;
      expect(schemaErr).toBeInstanceOf(SchemaValidationError);
      expect(schemaErr.method).toBe('getVaultInfo');
      expect(schemaErr.kind).toBe('result');
      expect(schemaErr.issues.some((issue) => issue.path === 'totalSupply')).toBe(true);
    }
  });
});

describe('Vault.getBalance result validation', () => {
  it('accepts a bigint balance', () => {
    expect(defaultValidationEngine.validateResult(VAULT_CONTRACT_ID, 'getBalance', 42n)).toBe(42n);
  });

  it('rejects a non-bigint balance', () => {
    expect(() =>
      defaultValidationEngine.validateResult(VAULT_CONTRACT_ID, 'getBalance', 42)
    ).toThrow(SchemaValidationError);
  });
});
