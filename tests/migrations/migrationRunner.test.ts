import * as v from 'valibot';
import { MigrationRegistry } from '../../src/migrations/migrationRegistry';
import { MigrationStateValidator } from '../../src/migrations/stateValidator';
import { MigrationRunner } from '../../src/migrations/migrationRunner';
import { MigrationStatus, MigrationStepStatus } from '../../src/types/migration';
import {
  MigrationPathNotFoundError,
  MigrationStateValidationError,
} from '../../src/errors/axionveraError';
import type { MigrationContext, MigrationStepDefinition } from '../../src/types/migration';

interface StateV1 {
  totalAssets: bigint;
}
interface StateV2 extends StateV1 {
  apy: number;
}
interface StateV3 extends StateV2 {
  feeBps: number;
}

function buildRunner() {
  const registry = new MigrationRegistry();
  const stateValidator = new MigrationStateValidator();
  const runner = new MigrationRunner(registry, stateValidator);
  return { registry, stateValidator, runner };
}

const v1ToV2: MigrationStepDefinition<StateV1, StateV2> = {
  id: 'v1-to-v2',
  fromVersion: 'v1',
  toVersion: 'v2',
  migrate: (state) => ({ ...state, apy: 5 }),
  rollback: (state) => {
    const { apy, ...rest } = state;
    void apy;
    return rest;
  },
};

const v2ToV3: MigrationStepDefinition<StateV2, StateV3> = {
  id: 'v2-to-v3',
  fromVersion: 'v2',
  toVersion: 'v3',
  migrate: (state) => ({ ...state, feeBps: 25 }),
  rollback: (state) => {
    const { feeBps, ...rest } = state;
    void feeBps;
    return rest;
  },
};

describe('MigrationRunner', () => {
  describe('run / migrate — success', () => {
    it('runs a single-step migration to completion', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);

      const { state, report } = await runner.migrate<StateV1 | StateV2>(
        'Vault',
        { totalAssets: 100n },
        'v1',
        'v2'
      );

      expect(state).toEqual({ totalAssets: 100n, apy: 5 });
      expect(report.status).toBe(MigrationStatus.COMPLETED);
      expect(report.totalSteps).toBe(1);
      expect(report.succeededSteps).toBe(1);
      expect(report.failedSteps).toBe(0);
      expect(report.steps[0]).toMatchObject({
        stepId: 'v1-to-v2',
        status: MigrationStepStatus.SUCCEEDED,
        fromVersion: 'v1',
        toVersion: 'v2',
      });
    });

    it('runs a resolved multi-hop chain end to end', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);
      registry.register('Vault', v2ToV3);

      const { state, report } = await runner.migrate<StateV1 | StateV2 | StateV3>(
        'Vault',
        { totalAssets: 100n },
        'v1',
        'v3'
      );

      expect(state).toEqual({ totalAssets: 100n, apy: 5, feeBps: 25 });
      expect(report.totalSteps).toBe(2);
      expect(report.succeededSteps).toBe(2);
      expect(report.steps.map((s) => s.stepId)).toEqual(['v1-to-v2', 'v2-to-v3']);
    });

    it('returns a zero-step completed report when fromVersion equals toVersion', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);

      const initial = { totalAssets: 1n };
      const { state, report } = await runner.migrate('Vault', initial, 'v1', 'v1');

      expect(state).toBe(initial);
      expect(report.status).toBe(MigrationStatus.COMPLETED);
      expect(report.totalSteps).toBe(0);
    });

    it('forwards metadata to every step via the migration context', async () => {
      const { registry, runner } = buildRunner();
      const migrate = jest.fn((state: StateV1, context: MigrationContext) => ({
        ...state,
        apy: 0,
        seen: context.metadata,
      }));
      registry.register('Vault', { id: 's', fromVersion: 'v1', toVersion: 'v2', migrate });

      await runner.migrate('Vault', { totalAssets: 1n }, 'v1', 'v2', {
        metadata: { triggeredBy: 'cli' },
      });

      expect(migrate).toHaveBeenCalledWith(
        { totalAssets: 1n },
        expect.objectContaining({
          contractId: 'Vault',
          dryRun: false,
          metadata: { triggeredBy: 'cli' },
        })
      );
    });
  });

  describe('dryRun', () => {
    it('reports success without mutating the returned state', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);

      const initial = { totalAssets: 100n };
      const { state, report } = await runner.migrate('Vault', initial, 'v1', 'v2', {
        dryRun: true,
      });

      expect(state).toBe(initial);
      expect(report.dryRun).toBe(true);
      expect(report.status).toBe(MigrationStatus.COMPLETED);
      expect(report.succeededSteps).toBe(1);
    });

    it('threads simulated state through a multi-hop chain so later steps validate against the right shape', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);
      registry.register('Vault', v2ToV3);

      const initial = { totalAssets: 100n };
      const { state, report } = await runner.migrate('Vault', initial, 'v1', 'v3', {
        dryRun: true,
      });

      expect(state).toBe(initial);
      expect(report.status).toBe(MigrationStatus.COMPLETED);
      expect(report.succeededSteps).toBe(2);
      expect(report.failedSteps).toBe(0);
    });
  });

  describe('failure', () => {
    it('stops at the failing step and reports it as failed', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);
      registry.register('Vault', {
        id: 'v2-to-v3-broken',
        fromVersion: 'v2',
        toVersion: 'v3',
        migrate: () => {
          throw new Error('boom');
        },
      });

      const { state, report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v3');

      expect(report.status).toBe(MigrationStatus.FAILED);
      expect(report.succeededSteps).toBe(1);
      expect(report.failedSteps).toBe(1);
      expect(report.steps[1]).toMatchObject({
        stepId: 'v2-to-v3-broken',
        status: MigrationStepStatus.FAILED,
        error: { name: 'Error', message: 'boom' },
      });
      // State reflects progress up to (but not including) the failed step.
      expect(state).toEqual({ totalAssets: 100n, apy: 5 });
    });

    it('surfaces MigrationStateValidationError as a failed step when registered schemas reject the state', async () => {
      const { registry, stateValidator, runner } = buildRunner();
      stateValidator.registerStateSchema('Vault', 'v2', v.object({ apy: v.string() }));
      registry.register('Vault', v1ToV2);

      const { report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v2');

      expect(report.status).toBe(MigrationStatus.FAILED);
      expect(report.steps[0].error?.name).toBe('MigrationStateValidationError');
    });

    it('skips state validation entirely when validateState is false', async () => {
      const { registry, stateValidator, runner } = buildRunner();
      stateValidator.registerStateSchema('Vault', 'v2', v.object({ apy: v.string() }));
      registry.register('Vault', v1ToV2);

      const { report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v2', {
        validateState: false,
      });

      expect(report.status).toBe(MigrationStatus.COMPLETED);
    });

    it('propagates MigrationPathNotFoundError without producing a report', async () => {
      const { runner } = buildRunner();
      await expect(runner.migrate('Vault', { totalAssets: 1n }, 'v1', 'v9')).rejects.toThrow(
        MigrationPathNotFoundError
      );
    });
  });

  describe('rollbackOnFailure', () => {
    it('rolls back completed steps in reverse when a later step fails', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);
      registry.register('Vault', {
        id: 'v2-to-v3-broken',
        fromVersion: 'v2',
        toVersion: 'v3',
        migrate: () => {
          throw new Error('boom');
        },
      });

      const { state, report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v3', {
        rollbackOnFailure: true,
      });

      expect(report.status).toBe(MigrationStatus.ROLLED_BACK);
      expect(report.rollbackSteps).toHaveLength(1);
      expect(report.rollbackSteps?.[0]).toMatchObject({
        stepId: 'v1-to-v2',
        status: MigrationStepStatus.SUCCEEDED,
        fromVersion: 'v2',
        toVersion: 'v1',
      });
      expect(state).toEqual({ totalAssets: 100n });
    });

    it('stays FAILED (not ROLLED_BACK) when a completed step has no rollback function', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', {
        id: 'no-rollback-step',
        fromVersion: 'v1',
        toVersion: 'v2',
        migrate: (state: StateV1) => ({ ...state, apy: 1 }),
      });
      registry.register('Vault', {
        id: 'broken-step',
        fromVersion: 'v2',
        toVersion: 'v3',
        migrate: () => {
          throw new Error('boom');
        },
      });

      const { report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v3', {
        rollbackOnFailure: true,
      });

      expect(report.status).toBe(MigrationStatus.FAILED);
      expect(report.rollbackSteps).toEqual([]);
    });

    it('does not attempt rollback during a dry run even if requested', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', v1ToV2);
      registry.register('Vault', {
        id: 'v2-to-v3-broken',
        fromVersion: 'v2',
        toVersion: 'v3',
        migrate: () => {
          throw new Error('boom');
        },
      });

      const { report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v3', {
        rollbackOnFailure: true,
        dryRun: true,
      });

      expect(report.status).toBe(MigrationStatus.FAILED);
      expect(report.rollbackSteps).toBeUndefined();
    });

    it('records a failed rollback attempt without throwing', async () => {
      const { registry, runner } = buildRunner();
      registry.register('Vault', {
        id: 'unrollbackable',
        fromVersion: 'v1',
        toVersion: 'v2',
        migrate: (state: StateV1) => ({ ...state, apy: 1 }),
        rollback: () => {
          throw new Error('rollback boom');
        },
      });
      registry.register('Vault', {
        id: 'broken-step',
        fromVersion: 'v2',
        toVersion: 'v3',
        migrate: () => {
          throw new Error('boom');
        },
      });

      const { report } = await runner.migrate('Vault', { totalAssets: 100n }, 'v1', 'v3', {
        rollbackOnFailure: true,
      });

      expect(report.status).toBe(MigrationStatus.FAILED);
      expect(report.rollbackSteps?.[0]).toMatchObject({
        status: MigrationStepStatus.FAILED,
        error: { name: 'Error', message: 'rollback boom' },
      });
    });
  });
});
