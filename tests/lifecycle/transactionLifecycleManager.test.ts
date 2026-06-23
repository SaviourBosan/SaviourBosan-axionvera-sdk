import { TransactionLifecycleManager } from '../../src/transactions/transactionLifecycleManager';
import { LifecycleEvent } from '../../src/events/lifecycleEvents';
import { TransactionLifecycleState } from '../../src/lifecycle/types';
import {
  InvalidLifecycleTransitionError,
  TransactionNotTrackedError,
} from '../../src/lifecycle/errors';

describe('TransactionLifecycleManager', () => {
  let manager: TransactionLifecycleManager;

  beforeEach(() => {
    manager = new TransactionLifecycleManager();
  });

  describe('create', () => {
    it('starts a transaction in the CREATED state with attached metadata', () => {
      const record = manager.create({ id: 'tx1', metadata: { contractId: 'C1' } });

      expect(record.id).toBe('tx1');
      expect(record.state).toBe(TransactionLifecycleState.CREATED);
      expect(record.metadata).toEqual({ contractId: 'C1' });
      expect(record.history).toHaveLength(1);
      expect(record.history[0]).toMatchObject({
        from: null,
        to: TransactionLifecycleState.CREATED,
      });
    });

    it('generates an id when none is provided', () => {
      const record = manager.create();
      expect(record.id).toBeTruthy();
      expect(manager.has(record.id)).toBe(true);
    });

    it('throws when creating a transaction with a duplicate id', () => {
      manager.create({ id: 'tx1' });
      expect(() => manager.create({ id: 'tx1' })).toThrow(/already being tracked/);
    });
  });

  describe('full lifecycle happy path', () => {
    it('walks a transaction through every state to completion', () => {
      manager.create({ id: 'tx1' });

      manager.markSimulating('tx1');
      manager.markSimulated('tx1', { simulationResult: { cost: 100n } });
      manager.markSigning('tx1');
      manager.markSigned('tx1');
      manager.markSubmitting('tx1');
      manager.markSubmitted('tx1', { txHash: 'hash-abc' });
      manager.markConfirming('tx1');
      manager.markConfirmed('tx1', { ledger: 12345 });
      const final = manager.markCompleted('tx1');

      expect(final.state).toBe(TransactionLifecycleState.COMPLETED);
      expect(manager.isTerminal('tx1')).toBe(true);
      expect(final.metadata).toMatchObject({ txHash: 'hash-abc', ledger: 12345 });

      const history = manager.getHistory('tx1');
      expect(history.map((h) => h.to)).toEqual([
        TransactionLifecycleState.CREATED,
        TransactionLifecycleState.SIMULATING,
        TransactionLifecycleState.SIMULATED,
        TransactionLifecycleState.SIGNING,
        TransactionLifecycleState.SIGNED,
        TransactionLifecycleState.SUBMITTING,
        TransactionLifecycleState.SUBMITTED,
        TransactionLifecycleState.CONFIRMING,
        TransactionLifecycleState.CONFIRMED,
        TransactionLifecycleState.COMPLETED,
      ]);
    });

    it('rejects an out-of-order transition', () => {
      manager.create({ id: 'tx1' });
      expect(() => manager.markSigned('tx1')).toThrow(InvalidLifecycleTransitionError);
    });
  });

  describe('failure handling', () => {
    it('can fail from an intermediate state and records error info', () => {
      manager.create({ id: 'tx1' });
      manager.markSimulating('tx1');

      const failed = manager.fail('tx1', new Error('simulation reverted'));

      expect(failed.state).toBe(TransactionLifecycleState.FAILED);
      expect(failed.error).toEqual({ name: 'Error', message: 'simulation reverted' });
      expect(manager.isTerminal('tx1')).toBe(true);
    });

    it('cannot transition once failed', () => {
      manager.create({ id: 'tx1' });
      manager.fail('tx1', new Error('boom'));
      expect(() => manager.markSimulating('tx1')).toThrow(InvalidLifecycleTransitionError);
    });

    it('normalizes non-Error failure values', () => {
      manager.create({ id: 'tx1' });
      const failed = manager.fail('tx1', 'plain string failure');
      expect(failed.error).toEqual({ name: 'Error', message: 'plain string failure' });
    });
  });

  describe('status query APIs', () => {
    it('getStatus returns the current state', () => {
      manager.create({ id: 'tx1' });
      expect(manager.getStatus('tx1')).toBe(TransactionLifecycleState.CREATED);
      manager.markSimulating('tx1');
      expect(manager.getStatus('tx1')).toBe(TransactionLifecycleState.SIMULATING);
    });

    it('throws TransactionNotTrackedError for unknown ids', () => {
      expect(() => manager.getStatus('missing')).toThrow(TransactionNotTrackedError);
      expect(() => manager.getRecord('missing')).toThrow(TransactionNotTrackedError);
      expect(() => manager.getHistory('missing')).toThrow(TransactionNotTrackedError);
    });

    it('list filters by state', () => {
      manager.create({ id: 'tx1' });
      manager.create({ id: 'tx2' });
      manager.markSimulating('tx2');

      expect(manager.list({ state: TransactionLifecycleState.CREATED }).map((r) => r.id)).toEqual([
        'tx1',
      ]);
      expect(
        manager.list({ state: TransactionLifecycleState.SIMULATING }).map((r) => r.id)
      ).toEqual(['tx2']);
    });

    it('list filters by terminalOnly', () => {
      manager.create({ id: 'tx1' });
      manager.create({ id: 'tx2' });
      manager.fail('tx2', new Error('boom'));

      const terminal = manager.list({ terminalOnly: true });
      expect(terminal.map((r) => r.id)).toEqual(['tx2']);
    });

    it('list with no filter returns every tracked transaction', () => {
      manager.create({ id: 'tx1' });
      manager.create({ id: 'tx2' });
      expect(
        manager
          .list()
          .map((r) => r.id)
          .sort()
      ).toEqual(['tx1', 'tx2']);
    });

    it('remove stops tracking a transaction', () => {
      manager.create({ id: 'tx1' });
      expect(manager.remove('tx1')).toBe(true);
      expect(manager.has('tx1')).toBe(false);
      expect(manager.remove('tx1')).toBe(false);
    });

    it('clear removes all tracked transactions', () => {
      manager.create({ id: 'tx1' });
      manager.create({ id: 'tx2' });
      manager.clear();
      expect(manager.list()).toHaveLength(0);
    });

    it('records returned by query APIs are snapshots, not live references', () => {
      manager.create({ id: 'tx1', metadata: { foo: 'bar' } });
      const record = manager.getRecord('tx1');
      record.metadata.foo = 'mutated';
      record.history.push({ from: null, to: TransactionLifecycleState.FAILED, timestamp: 0 });

      const fresh = manager.getRecord('tx1');
      expect(fresh.metadata.foo).toBe('bar');
      expect(fresh.history).toHaveLength(1);
    });
  });

  describe('event emission', () => {
    it('emits a created event when tracking starts', () => {
      const events: LifecycleEvent[] = [];
      manager.onEvent((e) => events.push(e));

      manager.create({ id: 'tx1' });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'created',
        transactionId: 'tx1',
        previousState: null,
        state: TransactionLifecycleState.CREATED,
      });
    });

    it('emits a transition event for ordinary state changes', () => {
      manager.create({ id: 'tx1' });
      const events: LifecycleEvent[] = [];
      manager.onEvent((e) => events.push(e));

      manager.markSimulating('tx1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'transition',
        previousState: TransactionLifecycleState.CREATED,
        state: TransactionLifecycleState.SIMULATING,
      });
    });

    it('emits a completed event on reaching COMPLETED', () => {
      manager.create({ id: 'tx1' });
      manager.markSimulating('tx1');
      manager.markSimulated('tx1');
      manager.markSigning('tx1');
      manager.markSigned('tx1');
      manager.markSubmitting('tx1');
      manager.markSubmitted('tx1');
      manager.markConfirming('tx1');
      manager.markConfirmed('tx1');

      const events: LifecycleEvent[] = [];
      manager.onEvent((e) => events.push(e));
      manager.markCompleted('tx1');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('completed');
    });

    it('emits a failed event with error details on failure', () => {
      manager.create({ id: 'tx1' });
      const events: LifecycleEvent[] = [];
      manager.onEvent((e) => events.push(e));

      manager.fail('tx1', new Error('network down'));

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'failed',
        error: { name: 'Error', message: 'network down' },
      });
    });

    it('offEvent unsubscribes a listener', () => {
      const events: LifecycleEvent[] = [];
      const subId = manager.onEvent((e) => events.push(e));
      manager.offEvent(subId);

      manager.create({ id: 'tx1' });
      expect(events).toHaveLength(0);
    });

    it('onEvent supports filtering to a single transaction id', () => {
      const events: LifecycleEvent[] = [];
      manager.onEvent((e) => events.push(e), { transactionId: 'tx1' });

      manager.create({ id: 'tx1' });
      manager.create({ id: 'tx2' });

      expect(events).toHaveLength(1);
      expect(events[0].transactionId).toBe('tx1');
    });
  });
});
