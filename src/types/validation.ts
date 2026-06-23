import type { BaseIssue, BaseSchema } from 'valibot';

/**
 * A valibot schema accepting `unknown` input, used as the common type for
 * any params/result schema registered with the validation engine.
 */
export type AnyValidationSchema = BaseSchema<unknown, unknown, BaseIssue<unknown>>;

/** A single, descriptive validation failure. */
export interface ValidationIssue {
  /** Dot-path to the offending field, or `'(root)'` when the whole value is invalid. */
  path: string;
  /** Human-readable description of what failed. */
  message: string;
  /** The value that failed validation, when available. */
  received?: unknown;
}

/** Which side of a contract method call a schema describes. */
export type ValidationKind = 'params' | 'result';

/**
 * The pair of schemas describing one contract method's inputs and outputs.
 * Both are optional so a method can opt into validating only its params,
 * only its result, or both.
 */
export interface ContractMethodSchema<
  TParams extends AnyValidationSchema = AnyValidationSchema,
  TResult extends AnyValidationSchema = AnyValidationSchema,
> {
  /** Schema describing the accepted method parameters. */
  params?: TParams;
  /** Schema describing the expected method result/response shape. */
  result?: TResult;
  /** Optional human-readable description, surfaced in docs/tooling. */
  description?: string;
}
