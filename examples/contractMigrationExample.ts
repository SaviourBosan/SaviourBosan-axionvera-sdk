/**
 * Contract Migration Support Toolkit example.
 *
 * Demonstrates resolving and running a multi-hop Vault state migration
 * (v1 -> v2 -> v3), inspecting the resulting report, and recovering from a
 * failed step via rollback. Run with: npx ts-node examples/contractMigrationExample.ts
 */

import { defaultMigrationRegistry } from '../src/migrations/migrationRegistry';
import { defaultMigrationStateValidator } from '../src/migrations/stateValidator';
import { MigrationRunner } from '../src/migrations/migrationRunner';
import { summarizeMigrationReport } from '../src/migrations/migrationReporter';
import { VAULT_MIGRATION_CONTRACT_ID, VaultStateV1 } from '../src/contracts/contractMigrations';

async function main(): Promise<void> {
  const runner = new MigrationRunner(defaultMigrationRegistry, defaultMigrationStateValidator);

  const initialState: VaultStateV1 = { totalAssets: 1_000_000n, totalSupply: 900_000n };

  console.log('=== Migrating Vault state from v1 to v3 ===');
  const { state, report } = await runner.migrate(
    VAULT_MIGRATION_CONTRACT_ID,
    initialState,
    'v1',
    'v3'
  );

  console.log(summarizeMigrationReport(report));
  console.log('\nFinal state:', state);

  console.log('\n=== Dry-running the same migration (no state mutation) ===');
  const { state: unchanged, report: dryRunReport } = await runner.migrate(
    VAULT_MIGRATION_CONTRACT_ID,
    initialState,
    'v1',
    'v3',
    { dryRun: true }
  );
  console.log(summarizeMigrationReport(dryRunReport));
  console.log('State after dry run equals the input:', unchanged === initialState);

  console.log('\n=== Recovering from a failed step via rollback ===');
  defaultMigrationRegistry.register(VAULT_MIGRATION_CONTRACT_ID, {
    id: 'vault-v3-to-v4-broken',
    fromVersion: 'v3',
    toVersion: 'v4',
    migrate: () => {
      throw new Error('v4 migration is not implemented yet');
    },
  });

  const { state: rolledBackState, report: rollbackReport } = await runner.migrate(
    VAULT_MIGRATION_CONTRACT_ID,
    initialState,
    'v1',
    'v4',
    { rollbackOnFailure: true }
  );
  console.log(summarizeMigrationReport(rollbackReport));
  console.log('State after rollback:', rolledBackState);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { main };
