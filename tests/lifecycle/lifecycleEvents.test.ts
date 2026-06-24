import { LifecycleEventEmitter, LifecycleEvent } from '../../src/events/lifecycleEvents';
import { TransactionLifecycleState } from '../../src/lifecycle/types';

function makeEvent(overrides: Partial<LifecycleEvent> = {}): LifecycleEvent {
  return {
    type: 'transition',
    transactionId: 'tx1',
    previousState: TransactionLifecycleState.CREATED,
    state: TransactionLifecycleState.SIMULATING,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('LifecycleEventEmitter', () => {
  let emitter: LifecycleEventEmitter;

  beforeEach(() => {
    emitter = new LifecycleEventEmitter();
  });

  it('dispatches events to all subscribers with no filter', () => {
    const received: LifecycleEvent[] = [];
    emitter.subscribe((event) => received.push(event));
    emitter.subscribe((event) => received.push(event));

    const dispatched = emitter.emit(makeEvent());

    expect(dispatched).toBe(2);
    expect(received).toHaveLength(2);
  });

  it('filters by transactionId', () => {
    const received: LifecycleEvent[] = [];
    emitter.subscribe((event) => received.push(event), { transactionId: 'tx1' });

    emitter.emit(makeEvent({ transactionId: 'tx2' }));
    expect(received).toHaveLength(0);

    emitter.emit(makeEvent({ transactionId: 'tx1' }));
    expect(received).toHaveLength(1);
  });

  it('filters by event type', () => {
    const received: LifecycleEvent[] = [];
    emitter.subscribe((event) => received.push(event), { types: ['failed'] });

    emitter.emit(makeEvent({ type: 'transition' }));
    expect(received).toHaveLength(0);

    emitter.emit(makeEvent({ type: 'failed' }));
    expect(received).toHaveLength(1);
  });

  it('unsubscribe stops further dispatch and returns false for unknown ids', () => {
    const received: LifecycleEvent[] = [];
    const id = emitter.subscribe((event) => received.push(event));

    expect(emitter.unsubscribe(id)).toBe(true);
    emitter.emit(makeEvent());
    expect(received).toHaveLength(0);
    expect(emitter.unsubscribe(id)).toBe(false);
  });

  it('tracks the active listener count', () => {
    expect(emitter.getListenerCount()).toBe(0);
    const id = emitter.subscribe(() => {});
    expect(emitter.getListenerCount()).toBe(1);
    emitter.unsubscribe(id);
    expect(emitter.getListenerCount()).toBe(0);
  });
});
