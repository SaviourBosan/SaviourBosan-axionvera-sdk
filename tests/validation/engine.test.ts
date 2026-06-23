import * as v from 'valibot';
import {
  ContractValidationEngine,
  validateAgainstSchema,
  withSchemaValidation,
} from '../../src/validation/engine';
import { SchemaValidationError, AxionveraError } from '../../src/errors/axionveraError';

describe('ContractValidationEngine', () => {
  let engine: ContractValidationEngine;

  beforeEach(() => {
    engine = new ContractValidationEngine();
  });

  describe('registration', () => {
    it('reports no schema registered by default', () => {
      expect(engine.hasSchema('Vault', 'deposit')).toBe(false);
      expect(engine.getSchema('Vault', 'deposit')).toBeUndefined();
    });

    it('registers a schema and makes it discoverable', () => {
      const schema = { params: v.object({ amount: v.number() }) };
      engine.registerSchema('Vault', 'deposit', schema);

      expect(engine.hasSchema('Vault', 'deposit')).toBe(true);
      expect(engine.getSchema('Vault', 'deposit')).toBe(schema);
    });

    it('keeps schemas for different contracts/methods independent', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      expect(engine.hasSchema('Vault', 'withdraw')).toBe(false);
      expect(engine.hasSchema('OtherContract', 'deposit')).toBe(false);
    });

    it('overwrites a previously registered schema for the same key', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      const replacement = { params: v.object({ amount: v.string() }) };
      engine.registerSchema('Vault', 'deposit', replacement);

      expect(engine.getSchema('Vault', 'deposit')).toBe(replacement);
    });

    it('supports registering a fully custom schema for a contract not shipped with the SDK', () => {
      const customSchema = { params: v.object({ foo: v.string() }) };
      engine.registerSchema('ThirdPartyContract', 'doThing', customSchema);

      expect(engine.hasSchema('ThirdPartyContract', 'doThing')).toBe(true);
      expect(engine.validateParams('ThirdPartyContract', 'doThing', { foo: 'bar' })).toEqual({
        foo: 'bar',
      });
    });

    it('removes a schema via unregisterSchema', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      engine.unregisterSchema('Vault', 'deposit');

      expect(engine.hasSchema('Vault', 'deposit')).toBe(false);
    });
  });

  describe('validateParams', () => {
    it('passes params through unchanged when no schema is registered', () => {
      const params = { anything: true };
      expect(engine.validateParams('Vault', 'unregisteredMethod', params)).toBe(params);
    });

    it('passes params through unchanged when the schema has no params definition', () => {
      engine.registerSchema('Vault', 'getVaultInfo', { result: v.object({ apy: v.number() }) });
      const params = { unused: 1 };
      expect(engine.validateParams('Vault', 'getVaultInfo', params)).toBe(params);
    });

    it('returns the parsed value when params match the schema', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      expect(engine.validateParams('Vault', 'deposit', { amount: 100 })).toEqual({ amount: 100 });
    });

    it('throws SchemaValidationError when params do not match the schema', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      expect(() => engine.validateParams('Vault', 'deposit', { amount: 'not-a-number' })).toThrow(
        SchemaValidationError
      );
    });

    it('thrown error carries contractId, method, and kind "params"', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      try {
        engine.validateParams('Vault', 'deposit', {});
      } catch (err) {
        expect(err).toBeInstanceOf(SchemaValidationError);
        const schemaErr = err as SchemaValidationError;
        expect(schemaErr.contractId).toBe('Vault');
        expect(schemaErr.method).toBe('deposit');
        expect(schemaErr.kind).toBe('params');
      }
    });

    it('thrown error message describes the field and reason for failure', () => {
      engine.registerSchema('Vault', 'deposit', {
        params: v.object({ amount: v.number('amount must be a number') }),
      });
      try {
        engine.validateParams('Vault', 'deposit', { amount: 'oops' });
        throw new Error('expected validateParams to throw');
      } catch (err) {
        const schemaErr = err as SchemaValidationError;
        expect(schemaErr.message).toContain('deposit');
        expect(schemaErr.message).toContain('Vault');
        expect(schemaErr.message).toContain('amount must be a number');
      }
    });

    it('thrown error includes one issue per offending field', () => {
      engine.registerSchema('Vault', 'deposit', {
        params: v.object({ amount: v.number(), asset: v.string() }),
      });
      try {
        engine.validateParams('Vault', 'deposit', { amount: 'oops', asset: 42 });
        throw new Error('expected validateParams to throw');
      } catch (err) {
        const schemaErr = err as SchemaValidationError;
        expect(schemaErr.issues.length).toBeGreaterThanOrEqual(2);
        expect(schemaErr.issues.map((issue) => issue.path).sort()).toEqual(['amount', 'asset']);
      }
    });

    it('is also an instance of AxionveraError', () => {
      engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
      try {
        engine.validateParams('Vault', 'deposit', {});
        throw new Error('expected validateParams to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AxionveraError);
      }
    });
  });

  describe('validateResult', () => {
    it('passes results through unchanged when no schema is registered', () => {
      const result = { whatever: 1 };
      expect(engine.validateResult('Vault', 'unregisteredMethod', result)).toBe(result);
    });

    it('returns the parsed value when result matches the schema', () => {
      engine.registerSchema('Vault', 'getBalance', { result: v.bigint() });
      expect(engine.validateResult('Vault', 'getBalance', 5n)).toBe(5n);
    });

    it('throws SchemaValidationError when result does not match the schema', () => {
      engine.registerSchema('Vault', 'getBalance', { result: v.bigint() });
      expect(() => engine.validateResult('Vault', 'getBalance', '5')).toThrow(
        SchemaValidationError
      );
    });

    it('thrown error carries kind "result"', () => {
      engine.registerSchema('Vault', 'getBalance', { result: v.bigint() });
      try {
        engine.validateResult('Vault', 'getBalance', '5');
      } catch (err) {
        expect((err as SchemaValidationError).kind).toBe('result');
      }
    });

    it('error message is labeled as Output validation, not Input', () => {
      engine.registerSchema('Vault', 'getBalance', { result: v.bigint() });
      try {
        engine.validateResult('Vault', 'getBalance', '5');
        throw new Error('expected validateResult to throw');
      } catch (err) {
        expect((err as SchemaValidationError).message).toMatch(/^Output validation failed/);
      }
    });
  });
});

describe('validateAgainstSchema', () => {
  it('returns the parsed output on success', () => {
    const schema = v.object({ name: v.string() });
    const result = validateAgainstSchema<{ name: string }>(
      schema,
      { name: 'vault' },
      {
        contractId: 'Vault',
        method: 'getName',
        kind: 'result',
      }
    );
    expect(result).toEqual({ name: 'vault' });
  });

  it('throws a descriptive SchemaValidationError on failure', () => {
    const schema = v.object({ name: v.string() });
    expect(() =>
      validateAgainstSchema(
        schema,
        { name: 42 },
        { contractId: 'Vault', method: 'getName', kind: 'result' }
      )
    ).toThrow(SchemaValidationError);
  });
});

describe('withSchemaValidation', () => {
  let engine: ContractValidationEngine;

  beforeEach(() => {
    engine = new ContractValidationEngine();
  });

  it('validates params before invoking the wrapped function', async () => {
    engine.registerSchema('Vault', 'deposit', { params: v.object({ amount: v.number() }) });
    const inner = jest.fn().mockResolvedValue({ ok: true });
    const wrapped = withSchemaValidation(engine, 'Vault', 'deposit', inner);

    await expect(wrapped({ amount: 'bad' } as never)).rejects.toThrow(SchemaValidationError);
    expect(inner).not.toHaveBeenCalled();
  });

  it('validates the resolved result before returning it to the caller', async () => {
    engine.registerSchema('Vault', 'getBalance', { result: v.bigint() });
    const inner = jest.fn().mockResolvedValue('not-a-bigint');
    const wrapped = withSchemaValidation(engine, 'Vault', 'getBalance', inner);

    await expect(wrapped(undefined)).rejects.toThrow(SchemaValidationError);
  });

  it('passes through to the wrapped function and returns its result when everything validates', async () => {
    engine.registerSchema('Vault', 'deposit', {
      params: v.object({ amount: v.number() }),
      result: v.object({ shares: v.number() }),
    });
    const inner = jest.fn().mockResolvedValue({ shares: 100 });
    const wrapped = withSchemaValidation(engine, 'Vault', 'deposit', inner);

    const result = await wrapped({ amount: 50 });
    expect(inner).toHaveBeenCalledWith({ amount: 50 });
    expect(result).toEqual({ shares: 100 });
  });
});
