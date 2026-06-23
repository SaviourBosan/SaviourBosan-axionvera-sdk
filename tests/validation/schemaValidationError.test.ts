import { AxionveraError, SchemaValidationError } from '../../src/errors/axionveraError';
import type { ValidationIssue } from '../../src/types/validation';

describe('SchemaValidationError', () => {
  const issues: ValidationIssue[] = [{ path: 'amount', message: 'must be positive', received: -1 }];

  it('extends AxionveraError', () => {
    const err = new SchemaValidationError('bad params', {
      contractId: 'Vault',
      method: 'deposit',
      kind: 'params',
      issues,
    });
    expect(err).toBeInstanceOf(AxionveraError);
    expect(err).toBeInstanceOf(SchemaValidationError);
  });

  it('sets its name via the class identity', () => {
    const err = new SchemaValidationError('bad params', {
      contractId: 'Vault',
      method: 'deposit',
      kind: 'params',
      issues,
    });
    expect(err.name).toBe('SchemaValidationError');
  });

  it('carries contractId, method, kind, and issues', () => {
    const err = new SchemaValidationError('bad params', {
      contractId: 'Vault',
      method: 'deposit',
      kind: 'params',
      issues,
    });
    expect(err.contractId).toBe('Vault');
    expect(err.method).toBe('deposit');
    expect(err.kind).toBe('params');
    expect(err.issues).toBe(issues);
  });

  it('preserves the message passed to the constructor', () => {
    const err = new SchemaValidationError(
      'Input validation failed for "deposit": amount must be positive',
      {
        contractId: 'Vault',
        method: 'deposit',
        kind: 'params',
        issues,
      }
    );
    expect(err.message).toBe('Input validation failed for "deposit": amount must be positive');
  });

  it('supports an originalError option like other AxionveraError subclasses', () => {
    const cause = new Error('underlying cause');
    const err = new SchemaValidationError('bad params', {
      contractId: 'Vault',
      method: 'deposit',
      kind: 'params',
      issues,
      originalError: cause,
    });
    expect(err.originalError).toBe(cause);
  });
});
