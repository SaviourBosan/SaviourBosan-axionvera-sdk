import * as v from 'valibot';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import {
  customRule,
  nonEmptyStringSchema,
  nonNegativeBigIntSchema,
  numberInRangeSchema,
  positiveBigIntSchema,
  stellarAccountIdSchema,
  stellarContractIdSchema,
} from '../../src/validation/rules';

function parse<T>(schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>, value: unknown): T {
  return v.parse(schema, value) as T;
}

describe('customRule', () => {
  it('accepts values that satisfy the predicate', () => {
    const schema = v.pipe(
      v.number(),
      customRule<number>((value) => value % 2 === 0, 'must be even')
    );
    expect(parse<number>(schema, 4)).toBe(4);
  });

  it('rejects values that fail the predicate with the supplied message', () => {
    const schema = v.pipe(
      v.number(),
      customRule<number>((value) => value % 2 === 0, 'must be even')
    );
    const result = v.safeParse(schema, 3);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.message).toBe('must be even');
    }
  });

  it('can be composed to build a fully custom domain rule', () => {
    // Example: an "amount" that must be a positive multiple of 100 (e.g. lot-sized deposits)
    const lotSizedAmountSchema = v.pipe(
      v.bigint(),
      customRule<bigint>((value) => value > 0n, 'amount must be positive'),
      customRule<bigint>((value) => value % 100n === 0n, 'amount must be a multiple of 100')
    );

    expect(parse<bigint>(lotSizedAmountSchema, 500n)).toBe(500n);
    expect(v.safeParse(lotSizedAmountSchema, 150n).success).toBe(false);
    expect(v.safeParse(lotSizedAmountSchema, -100n).success).toBe(false);
  });
});

describe('positiveBigIntSchema', () => {
  const schema = positiveBigIntSchema();

  it('accepts a positive bigint', () => {
    expect(parse<bigint>(schema, 1n)).toBe(1n);
  });

  it('rejects zero', () => {
    expect(v.safeParse(schema, 0n).success).toBe(false);
  });

  it('rejects a negative bigint', () => {
    expect(v.safeParse(schema, -1n).success).toBe(false);
  });

  it('rejects a non-bigint number', () => {
    expect(v.safeParse(schema, 1).success).toBe(false);
  });
});

describe('nonNegativeBigIntSchema', () => {
  const schema = nonNegativeBigIntSchema();

  it('accepts zero', () => {
    expect(parse<bigint>(schema, 0n)).toBe(0n);
  });

  it('accepts a positive bigint', () => {
    expect(parse<bigint>(schema, 10n)).toBe(10n);
  });

  it('rejects a negative bigint', () => {
    expect(v.safeParse(schema, -1n).success).toBe(false);
  });
});

describe('nonEmptyStringSchema', () => {
  const schema = nonEmptyStringSchema();

  it('accepts a non-empty string', () => {
    expect(parse<string>(schema, 'USDC')).toBe('USDC');
  });

  it('rejects an empty string', () => {
    expect(v.safeParse(schema, '').success).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(v.safeParse(schema, '   ').success).toBe(false);
  });
});

describe('stellarAccountIdSchema', () => {
  const schema = stellarAccountIdSchema();

  it('accepts a valid G... account id', () => {
    const publicKey = Keypair.random().publicKey();
    expect(parse<string>(schema, publicKey)).toBe(publicKey);
  });

  it('rejects a malformed account id', () => {
    expect(v.safeParse(schema, 'not-an-address').success).toBe(false);
  });

  it('rejects a valid contract id (wrong address type)', () => {
    const contractId = StrKey.encodeContract(Buffer.alloc(32));
    expect(v.safeParse(schema, contractId).success).toBe(false);
  });
});

describe('stellarContractIdSchema', () => {
  const schema = stellarContractIdSchema();

  it('accepts a valid C... contract id', () => {
    const contractId = StrKey.encodeContract(Buffer.alloc(32));
    expect(parse<string>(schema, contractId)).toBe(contractId);
  });

  it('rejects a valid account id (wrong address type)', () => {
    const publicKey = Keypair.random().publicKey();
    expect(v.safeParse(schema, publicKey).success).toBe(false);
  });

  it('rejects a malformed string', () => {
    expect(v.safeParse(schema, 'nope').success).toBe(false);
  });
});

describe('numberInRangeSchema', () => {
  const schema = numberInRangeSchema(1, 10);

  it('accepts a value within the inclusive range', () => {
    expect(parse<number>(schema, 1)).toBe(1);
    expect(parse<number>(schema, 10)).toBe(10);
  });

  it('rejects a value below the range', () => {
    expect(v.safeParse(schema, 0).success).toBe(false);
  });

  it('rejects a value above the range', () => {
    expect(v.safeParse(schema, 11).success).toBe(false);
  });

  it('uses a custom message when provided', () => {
    const customSchema = numberInRangeSchema(1, 10, 'out of bounds');
    const result = v.safeParse(customSchema, 99);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.message).toBe('out of bounds');
    }
  });
});
