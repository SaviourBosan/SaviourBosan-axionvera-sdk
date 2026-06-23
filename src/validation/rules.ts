import * as v from 'valibot';
import { StrKey } from '@stellar/stellar-sdk';

/**
 * Wraps an arbitrary predicate as a valibot pipe action, so consumers can
 * attach a fully custom validation rule to any base schema:
 *
 * ```typescript
 * import * as v from 'valibot';
 * import { customRule } from 'axionvera-sdk';
 *
 * const evenBigIntSchema = v.pipe(
 *   v.bigint(),
 *   customRule((value) => value % 2n === 0n, 'Value must be even')
 * );
 * ```
 *
 * This is the escape hatch for "Support custom validation rules": any
 * predicate over the schema's parsed value can be registered without the
 * validation engine needing to know about it ahead of time.
 */
export function customRule<TInput>(predicate: (value: TInput) => boolean, message: string) {
  return v.check(predicate, message);
}

/** Schema for a bigint that must be strictly greater than zero. */
export function positiveBigIntSchema(message = 'Value must be a positive bigint') {
  return v.pipe(
    v.bigint(),
    customRule<bigint>((value) => value > 0n, message)
  );
}

/** Schema for a bigint that must be zero or greater. */
export function nonNegativeBigIntSchema(message = 'Value must be a non-negative bigint') {
  return v.pipe(
    v.bigint(),
    customRule<bigint>((value) => value >= 0n, message)
  );
}

/** Schema for a string that must contain at least one non-whitespace character. */
export function nonEmptyStringSchema(message = 'Value must not be an empty string') {
  return v.pipe(
    v.string(),
    customRule<string>((value) => value.trim().length > 0, message)
  );
}

/** Schema for a Stellar Ed25519 account address (`G...`). */
export function stellarAccountIdSchema(
  message = 'Value must be a valid Stellar account ID (G...)'
) {
  return v.pipe(
    v.string(),
    customRule<string>((value) => StrKey.isValidEd25519PublicKey(value), message)
  );
}

/** Schema for a Stellar/Soroban contract address (`C...`). */
export function stellarContractIdSchema(
  message = 'Value must be a valid Stellar contract ID (C...)'
) {
  return v.pipe(
    v.string(),
    customRule<string>((value) => StrKey.isValidContract(value), message)
  );
}

/** Schema for a number constrained to the inclusive range `[min, max]`. */
export function numberInRangeSchema(min: number, max: number, message?: string) {
  const defaultMessage = `Value must be between ${String(min)} and ${String(max)}`;
  return v.pipe(
    v.number(),
    customRule<number>((value) => value >= min && value <= max, message ?? defaultMessage)
  );
}
