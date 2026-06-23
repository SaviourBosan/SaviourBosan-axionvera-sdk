import { EventDispatcher } from '../src/events/eventDispatcher';
import { SubscriptionService } from '../src/subscriptions/subscriptionService';
import { ReconnectionManager } from '../src/network/reconnectionManager';
import { EventFilter, SorobanEvent } from '../src/events/types';

function makeEvent(overrides?: Partial<SorobanEvent>): SorobanEvent {
  return {
    id: 'evt_test',
    type: 'contract',
    contractId: 'CABC123',
    topic: 'transfer',
    topics: ['transfer'],
    topicNames: ['transfer'],
    eventName: 'transfer',
    value: { amount: '100' },
    ledger: 12345,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('EventDispatcher', () => {
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    dispatcher = new EventDispatcher();
  });

  it('subscribes and dispatches events', () => {
    const received: SorobanEvent[] = [];
    dispatcher.subscribe({}, (event) => received.push(event));

    const dispatched = dispatcher.dispatch(makeEvent());
    expect(dispatched).toBe(1);
    expect(received).toHaveLength(1);
  });

  it('filters by contractId', () => {
    const received: SorobanEvent[] = [];
    const filter: EventFilter = { contractIds: ['CABC123'] };
    dispatcher.subscribe(filter, (event) => received.push(event));

    dispatcher.dispatch(makeEvent({ contractId: 'CDEF456' }));
    expect(received).toHaveLength(0);

    dispatcher.dispatch(makeEvent({ contractId: 'CABC123' }));
    expect(received).toHaveLength(1);
  });

  it('filters by topic', () => {
    const received: SorobanEvent[] = [];
    const filter: EventFilter = { topics: ['mint'] };
    dispatcher.subscribe(filter, (event) => received.push(event));

    dispatcher.dispatch(makeEvent({ topic: 'transfer' }));
    expect(received).toHaveLength(0);
  });

  it('filters by event type', () => {
    const received: SorobanEvent[] = [];
    const filter: EventFilter = { eventTypes: ['ledger'] };
    dispatcher.subscribe(filter, (event) => received.push(event));

    dispatcher.dispatch(makeEvent({ type: 'contract' }));
    expect(received).toHaveLength(0);

    dispatcher.dispatch(makeEvent({ type: 'ledger' }));
    expect(received).toHaveLength(1);
  });

  it('unsubscribes correctly', () => {
    const received: SorobanEvent[] = [];
    const id = dispatcher.subscribe({}, (event) => received.push(event));

    dispatcher.dispatch(makeEvent());
    expect(received).toHaveLength(1);

    dispatcher.unsubscribe(id);
    dispatcher.dispatch(makeEvent());
    expect(received).toHaveLength(1); // no change
  });

  it('tracks event counts', () => {
    const id = dispatcher.subscribe({}, () => {});
    dispatcher.dispatch(makeEvent());
    dispatcher.dispatch(makeEvent());
    expect(dispatcher.getEventCount(id)).toBe(2);
  });

  it('handles multiple subscriptions', () => {
    const r1: SorobanEvent[] = [];
    const r2: SorobanEvent[] = [];
    dispatcher.subscribe({}, (e) => r1.push(e));
    dispatcher.subscribe({}, (e) => r2.push(e));

    dispatcher.dispatch(makeEvent());
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });

  it('returns correct subscription count', () => {
    expect(dispatcher.getSubscriptionCount()).toBe(0);
    dispatcher.subscribe({}, () => {});
    expect(dispatcher.getSubscriptionCount()).toBe(1);
  });
});

describe('ReconnectionManager', () => {
  let manager: ReconnectionManager;

  beforeEach(() => {
    manager = new ReconnectionManager();
  });

  it('starts disconnected', () => {
    expect(manager.isConnected()).toBe(false);
    expect(manager.getState()).toBe('disconnected');
  });

  it('transitions to connected', () => {
    manager.markConnected();
    expect(manager.isConnected()).toBe(true);
    expect(manager.getState()).toBe('connected');
  });

  it('transitions to disconnected', () => {
    manager.markConnected();
    manager.markDisconnected();
    expect(manager.getState()).toBe('disconnected');
  });

  it('emits state changes', () => {
    const states: string[] = [];
    manager.onStateChange((state) => states.push(state));
    manager.markConnected();
    manager.markDisconnected();
    expect(states).toEqual(['connected', 'disconnected']);
  });

  it('returns unsubscribe function', () => {
    const states: string[] = [];
    const unsub = manager.onStateChange((state) => states.push(state));
    unsub();
    manager.markConnected();
    expect(states).toHaveLength(0);
  });

  it('schedules reconnection with backoff', async () => {
    let calls = 0;
    const connectFn = async () => { calls++; };

    manager.scheduleReconnect(connectFn);
    expect(manager.getState()).toBe('reconnecting');
  });
});
