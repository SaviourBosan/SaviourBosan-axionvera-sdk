import * as v from 'valibot';
import { MigrationStateValidator } from '../../src/migrations/stateValidator';
import { AxionveraError, MigrationStateValidationError } from '../../src/errors/axionveraError';

describe('MigrationStateValidator', () => {
  let validator: MigrationStateValidator;

  beforeEach(() => {
    validator = new MigrationStateValidator();
  });

  describe('registration', () => {
    it('reports no schema registered by default', () => {
      expect(validator.hasStateSchema('Vault', 'v1')).toBe(false);
    });

    it('registers a schema and makes it discoverable', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      expect(validator.hasStateSchema('Vault', 'v1')).toBe(true);
    });

    it('keeps schemas for different contracts/versions independent', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      expect(validator.hasStateSchema('Vault', 'v2')).toBe(false);
      expect(validator.hasStateSchema('OtherContract', 'v1')).toBe(false);
    });

    it('overwrites a previously registered schema for the same key', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.string() }));

      expect(validator.validateState('Vault', 'v1', { totalAssets: 'ok' })).toEqual({
        totalAssets: 'ok',
      });
    });

    it('removes a schema via unregisterStateSchema', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      validator.unregisterStateSchema('Vault', 'v1');

      expect(validator.hasStateSchema('Vault', 'v1')).toBe(false);
    });
  });

  describe('validateState', () => {
    it('passes state through unchanged when no schema is registered', () => {
      const state = { anything: true };
      expect(validator.validateState('Vault', 'v1', state)).toBe(state);
    });

    it('returns the parsed value when state matches the schema', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      expect(validator.validateState('Vault', 'v1', { totalAssets: 100n })).toEqual({
        totalAssets: 100n,
      });
    });

    it('throws MigrationStateValidationError when state does not match the schema', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      expect(() => validator.validateState('Vault', 'v1', { totalAssets: 'not-a-bigint' })).toThrow(
        MigrationStateValidationError
      );
    });

    it('thrown error carries contractId, version, and issues', () => {
      validator.registerStateSchema(
        'Vault',
        'v1',
        v.object({ totalAssets: v.bigint('totalAssets must be a bigint') })
      );
      try {
        validator.validateState('Vault', 'v1', { totalAssets: 'oops' });
        throw new Error('expected validateState to throw');
      } catch (err) {
        const stateErr = err as MigrationStateValidationError;
        expect(stateErr.contractId).toBe('Vault');
        expect(stateErr.version).toBe('v1');
        expect(stateErr.issues.some((issue) => issue.path === 'totalAssets')).toBe(true);
      }
    });

    it('thrown error message describes the field and reason for failure', () => {
      validator.registerStateSchema(
        'Vault',
        'v1',
        v.object({ totalAssets: v.bigint('totalAssets must be a bigint') })
      );
      try {
        validator.validateState('Vault', 'v1', { totalAssets: 'oops' });
        throw new Error('expected validateState to throw');
      } catch (err) {
        const stateErr = err as MigrationStateValidationError;
        expect(stateErr.message).toContain('Vault');
        expect(stateErr.message).toContain('v1');
        expect(stateErr.message).toContain('totalAssets must be a bigint');
      }
    });

    it('is also an instance of AxionveraError', () => {
      validator.registerStateSchema('Vault', 'v1', v.object({ totalAssets: v.bigint() }));
      try {
        validator.validateState('Vault', 'v1', { totalAssets: 'oops' });
        throw new Error('expected validateState to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AxionveraError);
      }
    });
  });
});
