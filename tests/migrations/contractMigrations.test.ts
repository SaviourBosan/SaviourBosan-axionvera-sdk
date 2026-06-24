import {
  VAULT_MIGRATION_CONTRACT_ID,
  vaultV1ToV2Migration,
  vaultV2ToV3Migration,
} from '../../src/contracts/contractMigrations';
import { defaultMigrationRegistry } from '../../src/migrations/migrationRegistry';
import { defaultMigrationStateValidator } from '../../src/migrations/stateValidator';
import { MigrationRunner } from '../../src/migrations/migrationRunner';
import { MigrationStatus } from '../../src/types/migration';
import { MigrationStateValidationError } from '../../src/errors/axionveraError';

describe('contractMigrations registration', () => {
  it('registers the v1->v2 and v2->v3 steps on the default registry', () => {
    const steps = defaultMigrationRegistry.listSteps(VAULT_MIGRATION_CONTRACT_ID);
    expect(steps.map((s) => s.id)).toEqual(
      expect.arrayContaining(['vault-v1-to-v2', 'vault-v2-to-v3'])
    );
  });

  it('registers state schemas for v1, v2, and v3 on the default validator', () => {
    expect(defaultMigrationStateValidator.hasStateSchema(VAULT_MIGRATION_CONTRACT_ID, 'v1')).toBe(
      true
    );
    expect(defaultMigrationStateValidator.hasStateSchema(VAULT_MIGRATION_CONTRACT_ID, 'v2')).toBe(
      true
    );
    expect(defaultMigrationStateValidator.hasStateSchema(VAULT_MIGRATION_CONTRACT_ID, 'v3')).toBe(
      true
    );
  });

  it('resolves a multi-hop plan from v1 to v3 via the default registry', () => {
    const plan = defaultMigrationRegistry.resolvePath(VAULT_MIGRATION_CONTRACT_ID, 'v1', 'v3');
    expect(plan.steps.map((s) => s.id)).toEqual(['vault-v1-to-v2', 'vault-v2-to-v3']);
  });
});

describe('Vault migration steps', () => {
  it('vaultV1ToV2Migration adds default apy/lockPeriod fields', async () => {
    const next = await vaultV1ToV2Migration.migrate(
      { totalAssets: 1_000n, totalSupply: 900n },
      { contractId: VAULT_MIGRATION_CONTRACT_ID, dryRun: false }
    );
    expect(next).toEqual({ totalAssets: 1_000n, totalSupply: 900n, apy: 0, lockPeriod: 0 });
  });

  it('vaultV1ToV2Migration.rollback removes the v2-only fields', async () => {
    const rolledBack = await vaultV1ToV2Migration.rollback?.(
      { totalAssets: 1_000n, totalSupply: 900n, apy: 5, lockPeriod: 30 },
      { contractId: VAULT_MIGRATION_CONTRACT_ID, dryRun: false }
    );
    expect(rolledBack).toEqual({ totalAssets: 1_000n, totalSupply: 900n });
  });

  it('vaultV2ToV3Migration adds a default feeBps field', async () => {
    const next = await vaultV2ToV3Migration.migrate(
      { totalAssets: 1_000n, totalSupply: 900n, apy: 5, lockPeriod: 30 },
      { contractId: VAULT_MIGRATION_CONTRACT_ID, dryRun: false }
    );
    expect(next).toMatchObject({ feeBps: 0 });
  });

  it('vaultV2ToV3Migration.rollback removes the v3-only field', async () => {
    const rolledBack = await vaultV2ToV3Migration.rollback?.(
      { totalAssets: 1_000n, totalSupply: 900n, apy: 5, lockPeriod: 30, feeBps: 25 },
      { contractId: VAULT_MIGRATION_CONTRACT_ID, dryRun: false }
    );
    expect(rolledBack).toEqual({ totalAssets: 1_000n, totalSupply: 900n, apy: 5, lockPeriod: 30 });
  });
});

describe('end-to-end run via MigrationRunner', () => {
  it('migrates a v1 Vault state all the way to v3 using the default singletons', async () => {
    const runner = new MigrationRunner(defaultMigrationRegistry, defaultMigrationStateValidator);

    const { state, report } = await runner.migrate(
      VAULT_MIGRATION_CONTRACT_ID,
      { totalAssets: 5_000n, totalSupply: 4_500n },
      'v1',
      'v3'
    );

    expect(report.status).toBe(MigrationStatus.COMPLETED);
    expect(state).toEqual({
      totalAssets: 5_000n,
      totalSupply: 4_500n,
      apy: 0,
      lockPeriod: 0,
      feeBps: 0,
    });
  });

  it('rejects a v1 state with a negative totalAssets before any step runs', async () => {
    const runner = new MigrationRunner(defaultMigrationRegistry, defaultMigrationStateValidator);

    expect(() =>
      defaultMigrationStateValidator.validateState(VAULT_MIGRATION_CONTRACT_ID, 'v1', {
        totalAssets: -1n,
        totalSupply: 0n,
      })
    ).toThrow(MigrationStateValidationError);

    const { report } = await runner.migrate(
      VAULT_MIGRATION_CONTRACT_ID,
      { totalAssets: -1n, totalSupply: 0n },
      'v1',
      'v2'
    );
    expect(report.status).toBe(MigrationStatus.FAILED);
  });
});
