import * as lifecycle from '../../src/lifecycle';
import * as transactions from '../../src/transactions';

describe('lifecycle barrel exports', () => {
  it('exposes the lifecycle public API', () => {
    expect(lifecycle.TransactionLifecycleState.CREATED).toBe('created');
    expect(typeof lifecycle.LifecycleStateMachine).toBe('function');
    expect(typeof lifecycle.InvalidLifecycleTransitionError).toBe('function');
    expect(typeof lifecycle.TransactionNotTrackedError).toBe('function');
  });

  it('exposes the transactions public API', () => {
    expect(typeof transactions.TransactionLifecycleManager).toBe('function');
  });
});
