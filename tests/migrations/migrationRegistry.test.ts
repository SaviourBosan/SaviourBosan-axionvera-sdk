import { MigrationRegistry } from '../../src/migrations/migrationRegistry';
import { MigrationPathNotFoundError } from '../../src/errors/axionveraError';
import type { MigrationStepDefinition } from '../../src/types/migration';

function step(
  id: string,
  fromVersion: string,
  toVersion: string
): MigrationStepDefinition<unknown, unknown> {
  return {
    id,
    fromVersion,
    toVersion,
    migrate: (state) => state,
  };
}

describe('MigrationRegistry', () => {
  let registry: MigrationRegistry;

  beforeEach(() => {
    registry = new MigrationRegistry();
  });

  describe('register / listSteps', () => {
    it('returns an empty list when nothing is registered', () => {
      expect(registry.listSteps('Vault')).toEqual([]);
    });

    it('registers a step and makes it listable', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      expect(registry.listSteps('Vault')).toHaveLength(1);
      expect(registry.listSteps('Vault')[0].id).toBe('v1-v2');
    });

    it('keeps steps for different contracts independent', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      expect(registry.listSteps('OtherContract')).toEqual([]);
    });

    it('overwrites a previously registered step with the same id', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      const replacement = step('v1-v2', 'v1', 'v3');
      registry.register('Vault', replacement);

      const steps = registry.listSteps('Vault');
      expect(steps).toHaveLength(1);
      expect(steps[0].toVersion).toBe('v3');
    });

    it('preserves registration order across distinct step ids', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      registry.register('Vault', step('v2-v3', 'v2', 'v3'));

      expect(registry.listSteps('Vault').map((s) => s.id)).toEqual(['v1-v2', 'v2-v3']);
    });
  });

  describe('unregister', () => {
    it('removes a registered step and returns true', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      expect(registry.unregister('Vault', 'v1-v2')).toBe(true);
      expect(registry.listSteps('Vault')).toEqual([]);
    });

    it('returns false when the step was never registered', () => {
      expect(registry.unregister('Vault', 'nope')).toBe(false);
    });

    it('returns false when the contract was never registered', () => {
      expect(registry.unregister('Unknown', 'nope')).toBe(false);
    });
  });

  describe('resolvePath', () => {
    it('returns an empty plan when fromVersion equals toVersion', () => {
      const plan = registry.resolvePath('Vault', 'v1', 'v1');
      expect(plan.steps).toEqual([]);
      expect(plan).toMatchObject({ contractId: 'Vault', fromVersion: 'v1', toVersion: 'v1' });
    });

    it('resolves a direct single-hop step', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      const plan = registry.resolvePath('Vault', 'v1', 'v2');

      expect(plan.steps.map((s) => s.id)).toEqual(['v1-v2']);
    });

    it('resolves a multi-hop chain via intermediate versions', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      registry.register('Vault', step('v2-v3', 'v2', 'v3'));
      registry.register('Vault', step('v3-v4', 'v3', 'v4'));

      const plan = registry.resolvePath('Vault', 'v1', 'v4');

      expect(plan.steps.map((s) => s.id)).toEqual(['v1-v2', 'v2-v3', 'v3-v4']);
    });

    it('finds the shortest path when multiple chains exist', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      registry.register('Vault', step('v2-v4', 'v2', 'v4'));
      registry.register('Vault', step('v2-v3', 'v2', 'v3'));
      registry.register('Vault', step('v3-v4', 'v3', 'v4'));

      const plan = registry.resolvePath('Vault', 'v1', 'v4');

      expect(plan.steps.map((s) => s.id)).toEqual(['v1-v2', 'v2-v4']);
    });

    it('throws MigrationPathNotFoundError when no chain connects the versions', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      expect(() => registry.resolvePath('Vault', 'v1', 'v5')).toThrow(MigrationPathNotFoundError);
    });

    it('thrown error carries contractId, fromVersion, and toVersion', () => {
      try {
        registry.resolvePath('Vault', 'v1', 'v9');
        throw new Error('expected resolvePath to throw');
      } catch (err) {
        const pathErr = err as MigrationPathNotFoundError;
        expect(pathErr).toBeInstanceOf(MigrationPathNotFoundError);
        expect(pathErr.contractId).toBe('Vault');
        expect(pathErr.fromVersion).toBe('v1');
        expect(pathErr.toVersion).toBe('v9');
      }
    });

    it('does not loop forever when steps form a cycle', () => {
      registry.register('Vault', step('v1-v2', 'v1', 'v2'));
      registry.register('Vault', step('v2-v1', 'v2', 'v1'));

      expect(() => registry.resolvePath('Vault', 'v1', 'v3')).toThrow(MigrationPathNotFoundError);
    });
  });
});
