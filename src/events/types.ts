export interface EventFilter {
  contractIds?: string[];
  topics?: string[];
  eventTypes?: ('contract' | 'ledger')[];
}

/** Typed value that can appear in Soroban events */
export type SorobanEventValue = 
  | string 
  | number 
  | bigint 
  | boolean 
  | null 
  | SorobanEventValue[] 
  | Record<string, SorobanEventValue>;

export interface SorobanEvent {
  id: string;
  type: 'contract' | 'ledger';
  contractId?: string;
  topic?: string;
  topics?: string[];
  topicNames?: string[];
  eventName?: string;
  /** Typed event value - no longer any */
  value: SorobanEventValue;
  ledger: number;
  timestamp: number;
}

export interface EventSubscription {
  id: string;
  filter: EventFilter;
  callback: (event: SorobanEvent) => void;
  isActive: boolean;
  createdAt: number;
}

export interface SubscriptionOptions {
  /** Maximum number of events to receive before auto-unsubscribing */
  maxEvents?: number;
  /** Auto-unsubscribe after this many milliseconds */
  timeout?: number;
  /** Only fire once, then unsubscribe */
  once?: boolean;
}

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  heartbeatInterval: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  heartbeatInterval: 30000,
};
