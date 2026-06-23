import {
  AxionveraError,
  MigrationPathNotFoundError,
  MigrationStateValidationError,
} from '../../src/errors/axionveraError';
import type { ValidationIssue } from '../../src/types/validation';

describe('MigrationStateValidationError', () => {
  const issues: ValidationIssue[] = [{ path: 'apy', message: 'must be a number', received: '5' }];

  it('extends AxionveraError', () => {
    const err = new MigrationStateValidationError('bad state', {
      contractId: 'Vault',
      version: 'v2',
      issues,
    });
    expect(err).toBeInstanceOf(AxionveraError);
    expect(err).toBeInstanceOf(MigrationStateValidationError);
  });

  it('sets its name via the class identity', () => {
    const err = new MigrationStateValidationError('bad state', {
      contractId: 'Vault',
      version: 'v2',
      issues,
    });
    expect(err.name).toBe('MigrationStateValidationError');
  });

  it('carries contractId, version, and issues', () => {
    const err = new MigrationStateValidationError('bad state', {
      contractId: 'Vault',
      version: 'v2',
      issues,
    });
    expect(err.contractId).toBe('Vault');
    expect(err.version).toBe('v2');
    expect(err.issues).toBe(issues);
  });

  it('supports an originalError option like other AxionveraError subclasses', () => {
    const cause = new Error('underlying cause');
    const err = new MigrationStateValidationError('bad state', {
      contractId: 'Vault',
      version: 'v2',
      issues,
      originalError: cause,
    });
    expect(err.originalError).toBe(cause);
  });
});

describe('MigrationPathNotFoundError', () => {
  it('extends AxionveraError', () => {
    const err = new MigrationPathNotFoundError('Vault', 'v1', 'v9');
    expect(err).toBeInstanceOf(AxionveraError);
    expect(err).toBeInstanceOf(MigrationPathNotFoundError);
  });

  it('sets its name via the class identity', () => {
    const err = new MigrationPathNotFoundError('Vault', 'v1', 'v9');
    expect(err.name).toBe('MigrationPathNotFoundError');
  });

  it('carries contractId, fromVersion, and toVersion', () => {
    const err = new MigrationPathNotFoundError('Vault', 'v1', 'v9');
    expect(err.contractId).toBe('Vault');
    expect(err.fromVersion).toBe('v1');
    expect(err.toVersion).toBe('v9');
  });

  it('produces a descriptive message', () => {
    const err = new MigrationPathNotFoundError('Vault', 'v1', 'v9');
    expect(err.message).toBe(
      'No migration path found for contract "Vault" from version "v1" to "v9"'
    );
  });
});
