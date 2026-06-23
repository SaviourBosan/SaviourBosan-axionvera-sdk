import { TransactionLifecycleState } from './types';

/** Thrown when a transition between two lifecycle states is not allowed. */
export class InvalidLifecycleTransitionError extends Error {
  readonly from: TransactionLifecycleState;
  readonly to: TransactionLifecycleState;

  constructor(from: TransactionLifecycleState, to: TransactionLifecycleState) {
    super(`Invalid transaction lifecycle transition: "${from}" -> "${to}"`);
    this.name = 'InvalidLifecycleTransitionError';
    this.from = from;
    this.to = to;
  }
}

/** Thrown when a lookup is performed for a transaction that isn't tracked. */
export class TransactionNotTrackedError extends Error {
  readonly transactionId: string;

  constructor(transactionId: string) {
    super(`No tracked transaction found for id "${transactionId}"`);
    this.name = 'TransactionNotTrackedError';
    this.transactionId = transactionId;
  }
}
