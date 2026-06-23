import { LifecycleStateMachine } from '../../src/lifecycle/stateMachine';
import { InvalidLifecycleTransitionError } from '../../src/lifecycle/errors';
import { TransactionLifecycleState } from '../../src/lifecycle/types';

describe('LifecycleStateMachine', () => {
  let machine: LifecycleStateMachine;

  beforeEach(() => {
    machine = new LifecycleStateMachine();
  });

  it('allows each forward transition in the happy path', () => {
    const path: [TransactionLifecycleState, TransactionLifecycleState][] = [
      [TransactionLifecycleState.CREATED, TransactionLifecycleState.SIMULATING],
      [TransactionLifecycleState.SIMULATING, TransactionLifecycleState.SIMULATED],
      [TransactionLifecycleState.SIMULATED, TransactionLifecycleState.SIGNING],
      [TransactionLifecycleState.SIGNING, TransactionLifecycleState.SIGNED],
      [TransactionLifecycleState.SIGNED, TransactionLifecycleState.SUBMITTING],
      [TransactionLifecycleState.SUBMITTING, TransactionLifecycleState.SUBMITTED],
      [TransactionLifecycleState.SUBMITTED, TransactionLifecycleState.CONFIRMING],
      [TransactionLifecycleState.CONFIRMING, TransactionLifecycleState.CONFIRMED],
      [TransactionLifecycleState.CONFIRMED, TransactionLifecycleState.COMPLETED],
    ];

    for (const [from, to] of path) {
      expect(machine.canTransition(from, to)).toBe(true);
    }
  });

  it('rejects skipping states', () => {
    expect(
      machine.canTransition(TransactionLifecycleState.CREATED, TransactionLifecycleState.SIGNED)
    ).toBe(false);
    expect(
      machine.canTransition(TransactionLifecycleState.CREATED, TransactionLifecycleState.COMPLETED)
    ).toBe(false);
  });

  it('rejects moving backwards', () => {
    expect(
      machine.canTransition(TransactionLifecycleState.SIGNED, TransactionLifecycleState.CREATED)
    ).toBe(false);
  });

  it('allows FAILED from any non-terminal state', () => {
    const nonTerminal = Object.values(TransactionLifecycleState).filter(
      (s) => s !== TransactionLifecycleState.COMPLETED && s !== TransactionLifecycleState.FAILED
    );
    for (const state of nonTerminal) {
      expect(machine.canTransition(state, TransactionLifecycleState.FAILED)).toBe(true);
    }
  });

  it('disallows any transition out of terminal states', () => {
    expect(
      machine.canTransition(TransactionLifecycleState.COMPLETED, TransactionLifecycleState.FAILED)
    ).toBe(false);
    expect(
      machine.canTransition(TransactionLifecycleState.FAILED, TransactionLifecycleState.CREATED)
    ).toBe(false);
  });

  it('assertTransition throws InvalidLifecycleTransitionError on illegal moves', () => {
    expect(() =>
      machine.assertTransition(
        TransactionLifecycleState.CREATED,
        TransactionLifecycleState.COMPLETED
      )
    ).toThrow(InvalidLifecycleTransitionError);
  });

  it('assertTransition does not throw on legal moves', () => {
    expect(() =>
      machine.assertTransition(
        TransactionLifecycleState.CREATED,
        TransactionLifecycleState.SIMULATING
      )
    ).not.toThrow();
  });

  it('isTerminal correctly classifies terminal vs non-terminal states', () => {
    expect(machine.isTerminal(TransactionLifecycleState.COMPLETED)).toBe(true);
    expect(machine.isTerminal(TransactionLifecycleState.FAILED)).toBe(true);
    expect(machine.isTerminal(TransactionLifecycleState.CREATED)).toBe(false);
  });

  it('getAllowedNext includes FAILED alongside the forward state', () => {
    expect(machine.getAllowedNext(TransactionLifecycleState.CREATED)).toEqual([
      TransactionLifecycleState.SIMULATING,
      TransactionLifecycleState.FAILED,
    ]);
  });

  it('getAllowedNext returns an empty array for terminal states', () => {
    expect(machine.getAllowedNext(TransactionLifecycleState.COMPLETED)).toEqual([]);
    expect(machine.getAllowedNext(TransactionLifecycleState.FAILED)).toEqual([]);
  });
});
