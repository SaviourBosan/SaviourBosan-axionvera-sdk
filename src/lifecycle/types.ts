/**
 * All states a transaction can occupy as it moves through its lifecycle.
 */
export enum TransactionLifecycleState {
  CREATED = 'created',
  SIMULATING = 'simulating',
  SIMULATED = 'simulated',
  SIGNING = 'signing',
  SIGNED = 'signed',
  SUBMITTING = 'submitting',
  SUBMITTED = 'submitted',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * States from which no further transitions are possible.
 */
export const TERMINAL_STATES: ReadonlySet<TransactionLifecycleState> = new Set([
  TransactionLifecycleState.COMPLETED,
  TransactionLifecycleState.FAILED,
]);

/**
 * Forward-progress transitions allowed for a healthy transaction. `FAILED` is
 * intentionally omitted here and instead allowed from every non-terminal state
 * (see {@link LifecycleStateMachine}), since a transaction can fail at any stage.
 */
export const LIFECYCLE_TRANSITIONS: Readonly<
  Record<TransactionLifecycleState, readonly TransactionLifecycleState[]>
> = {
  [TransactionLifecycleState.CREATED]: [TransactionLifecycleState.SIMULATING],
  [TransactionLifecycleState.SIMULATING]: [TransactionLifecycleState.SIMULATED],
  [TransactionLifecycleState.SIMULATED]: [TransactionLifecycleState.SIGNING],
  [TransactionLifecycleState.SIGNING]: [TransactionLifecycleState.SIGNED],
  [TransactionLifecycleState.SIGNED]: [TransactionLifecycleState.SUBMITTING],
  [TransactionLifecycleState.SUBMITTING]: [TransactionLifecycleState.SUBMITTED],
  [TransactionLifecycleState.SUBMITTED]: [TransactionLifecycleState.CONFIRMING],
  [TransactionLifecycleState.CONFIRMING]: [TransactionLifecycleState.CONFIRMED],
  [TransactionLifecycleState.CONFIRMED]: [TransactionLifecycleState.COMPLETED],
  [TransactionLifecycleState.COMPLETED]: [],
  [TransactionLifecycleState.FAILED]: [],
};

/** A single recorded transition between two lifecycle states. */
export interface LifecycleTransitionRecord {
  from: TransactionLifecycleState | null;
  to: TransactionLifecycleState;
  timestamp: number;
  details?: Record<string, unknown>;
}
