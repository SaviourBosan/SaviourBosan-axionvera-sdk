import { InvalidLifecycleTransitionError } from './errors';
import { LIFECYCLE_TRANSITIONS, TERMINAL_STATES, TransactionLifecycleState } from './types';

/**
 * Validates and exposes the allowed transitions between
 * {@link TransactionLifecycleState} values.
 *
 * @example
 * ```typescript
 * const machine = new LifecycleStateMachine();
 * machine.canTransition(TransactionLifecycleState.CREATED, TransactionLifecycleState.SIMULATING); // true
 * machine.assertTransition(TransactionLifecycleState.CREATED, TransactionLifecycleState.SIGNED); // throws
 * ```
 */
export class LifecycleStateMachine {
  /**
   * Returns whether moving from `from` to `to` is a legal transition.
   * Any non-terminal state may always transition to `FAILED`.
   */
  canTransition(from: TransactionLifecycleState, to: TransactionLifecycleState): boolean {
    if (this.isTerminal(from)) return false;
    if (to === TransactionLifecycleState.FAILED) return true;
    return LIFECYCLE_TRANSITIONS[from].includes(to);
  }

  /** Throws {@link InvalidLifecycleTransitionError} if the transition isn't allowed. */
  assertTransition(from: TransactionLifecycleState, to: TransactionLifecycleState): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidLifecycleTransitionError(from, to);
    }
  }

  /** Returns whether `state` is terminal (no further transitions possible). */
  isTerminal(state: TransactionLifecycleState): boolean {
    return TERMINAL_STATES.has(state);
  }

  /** Returns the set of states reachable directly from `state`. */
  getAllowedNext(state: TransactionLifecycleState): TransactionLifecycleState[] {
    if (this.isTerminal(state)) return [];
    return [...LIFECYCLE_TRANSITIONS[state], TransactionLifecycleState.FAILED];
  }
}
