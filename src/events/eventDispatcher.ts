import { EventFilter, SorobanEvent, EventSubscription } from './types';

export class EventDispatcher {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventCounts: Map<string, number> = new Map();

  subscribe(
    filter: EventFilter,
    callback: (event: SorobanEvent) => void,
    subscriptionId?: string
  ): string {
    const id = subscriptionId ?? this.generateId();
    this.subscriptions.set(id, {
      id,
      filter,
      callback,
      isActive: true,
      createdAt: Date.now(),
    });
    return id;
  }

  unsubscribe(id: string): boolean {
    this.eventCounts.delete(id);
    return this.subscriptions.delete(id);
  }

  getSubscription(id: string): EventSubscription | undefined {
    return this.subscriptions.get(id);
  }

  dispatch(event: SorobanEvent): number {
    let dispatched = 0;
    for (const sub of this.subscriptions.values()) {
      if (!sub.isActive) continue;
      if (!this.matchesFilter(event, sub.filter)) continue;

      try {
        sub.callback(event);
        dispatched++;
        this.incrementCount(sub.id);
      } catch {}
    }
    return dispatched;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getEventCount(subscriptionId: string): number {
    return this.eventCounts.get(subscriptionId) ?? 0;
  }

  private matchesFilter(event: SorobanEvent, filter: EventFilter): boolean {
    if (filter.contractIds?.length && event.contractId) {
      if (!filter.contractIds.includes(event.contractId)) return false;
    }
    if (filter.topics?.length && event.topic) {
      if (!filter.topics.includes(event.topic)) return false;
    }
    if (filter.eventTypes?.length) {
      if (!filter.eventTypes.includes(event.type)) return false;
    }
    return true;
  }

  private incrementCount(subscriptionId: string): void {
    const current = this.eventCounts.get(subscriptionId) ?? 0;
    this.eventCounts.set(subscriptionId, current + 1);
  }

  private generateId(): string {
    return sub__;
  }
}
