import { InteractionRecorder } from '../../src/replay/recorder';
import { ReplayEngine, ContractHandlers } from '../../src/replay/engine';
import { ReplayValidator } from '../../src/replay/validator';
import { ReplaySession } from '../../src/replay/types';

// ---------------------------------------------------------------------------
// InteractionRecorder
// ---------------------------------------------------------------------------
describe('InteractionRecorder', () => {
  let recorder: InteractionRecorder;

  beforeEach(() => {
    recorder = new InteractionRecorder();
  });

  it('records a successful interaction', async () => {
    await recorder.record('C1', 'deposit', [1000n], async () => ({ txHash: 'abc' }));
    const [interaction] = recorder.getInteractions();
    expect(interaction.contractId).toBe('C1');
    expect(interaction.method).toBe('deposit');
    expect(interaction.args).toEqual([1000n]);
    expect(interaction.result).toEqual({ txHash: 'abc' });
    expect(interaction.error).toBeUndefined();
  });

  it('records a failed interaction and re-throws', async () => {
    await expect(
      recorder.record('C1', 'withdraw', [500n], async () => {
        throw new Error('insufficient funds');
      })
    ).rejects.toThrow('insufficient funds');

    const [interaction] = recorder.getInteractions();
    expect(interaction.error).toEqual({ name: 'Error', message: 'insufficient funds' });
    expect(interaction.result).toBeUndefined();
  });

  it('attaches optional metadata', async () => {
    await recorder.record('C1', 'balance', [], async () => 100n, { network: 'testnet' });
    const [interaction] = recorder.getInteractions();
    expect(interaction.metadata?.network).toBe('testnet');
  });

  it('getInteractions returns a copy', () => {
    const interactions = recorder.getInteractions();
    interactions.push({} as any);
    expect(recorder.getInteractions()).toHaveLength(0);
  });

  it('clear removes all interactions', async () => {
    await recorder.record('C1', 'deposit', [], async () => 1);
    recorder.clear();
    expect(recorder.getInteractions()).toHaveLength(0);
  });

  it('exportSession returns a valid ReplaySession', async () => {
    await recorder.record('C1', 'balance', [], async () => 50n);
    const session = recorder.exportSession();
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.interactions).toHaveLength(1);
  });

  it('importSession appends interactions', async () => {
    const external: ReplaySession = {
      id: 'sess-1',
      createdAt: new Date().toISOString(),
      interactions: [
        {
          id: 'i1',
          timestamp: new Date().toISOString(),
          contractId: 'C2',
          method: 'balance',
          args: [],
          result: 42n,
        },
      ],
    };
    recorder.importSession(external);
    expect(recorder.getInteractions()).toHaveLength(1);
    expect(recorder.getInteractions()[0].contractId).toBe('C2');
  });
});

// ---------------------------------------------------------------------------
// ReplayEngine
// ---------------------------------------------------------------------------
describe('ReplayEngine', () => {
  const makeSession = (overrides: Partial<ReplaySession['interactions'][number]> = {}): ReplaySession => ({
    id: 'session-1',
    createdAt: new Date().toISOString(),
    interactions: [
      {
        id: 'i1',
        timestamp: new Date().toISOString(),
        contractId: 'CONTRACT',
        method: 'deposit',
        args: [1000n],
        result: { txHash: 'abc' },
        ...overrides,
      },
    ],
  });

  it('replays a successful interaction', async () => {
    const handlers: ContractHandlers = {
      CONTRACT: { deposit: async (amount) => ({ txHash: 'abc', amount }) },
    };
    const engine = new ReplayEngine(handlers);
    const [result] = await engine.replay(makeSession());
    expect(result.success).toBe(true);
    expect(result.result).toEqual({ txHash: 'abc', amount: 1000n });
  });

  it('returns failure when handler throws', async () => {
    const handlers: ContractHandlers = {
      CONTRACT: {
        deposit: async () => { throw new Error('network error'); },
      },
    };
    const engine = new ReplayEngine(handlers);
    const [result] = await engine.replay(makeSession());
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('network error');
  });

  it('returns failure when no handler is registered', async () => {
    const engine = new ReplayEngine({});
    const [result] = await engine.replay(makeSession());
    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/No handler registered/);
  });

  it('stopOnFailure halts replay after first failure', async () => {
    const session: ReplaySession = {
      id: 's1',
      createdAt: new Date().toISOString(),
      interactions: [
        { id: 'i1', timestamp: '', contractId: 'C', method: 'fail', args: [], result: undefined },
        { id: 'i2', timestamp: '', contractId: 'C', method: 'ok', args: [], result: 1 },
      ],
    };
    const handlers: ContractHandlers = {
      C: {
        fail: async () => { throw new Error('boom'); },
        ok: jest.fn(async () => 1),
      },
    };
    const engine = new ReplayEngine(handlers);
    const results = await engine.replay(session, { stopOnFailure: true });
    expect(results).toHaveLength(1);
    expect(handlers['C']['ok']).not.toHaveBeenCalled();
  });

  it('records durationMs', async () => {
    const handlers: ContractHandlers = { CONTRACT: { deposit: async () => 1 } };
    const engine = new ReplayEngine(handlers);
    const [result] = await engine.replay(makeSession());
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// ReplayValidator
// ---------------------------------------------------------------------------
describe('ReplayValidator', () => {
  const validator = new ReplayValidator();

  const makeSession = (...interactions: Partial<ReplaySession['interactions'][number]>[]): ReplaySession => ({
    id: 'session-v',
    createdAt: new Date().toISOString(),
    interactions: interactions.map((i, idx) => ({
      id: `i${idx}`,
      timestamp: '',
      contractId: 'C',
      method: 'm',
      args: [],
      ...i,
    })),
  });

  it('passes when results match', () => {
    const session = makeSession({ result: { x: 1 } });
    const results = [{ interactionId: 'i0', contractId: 'C', method: 'm', success: true, result: { x: 1 }, durationMs: 0 }];
    const report = validator.validate(session, results);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(0);
  });

  it('fails when results differ', () => {
    const session = makeSession({ result: { x: 1 } });
    const results = [{ interactionId: 'i0', contractId: 'C', method: 'm', success: true, result: { x: 2 }, durationMs: 0 }];
    const report = validator.validate(session, results);
    expect(report.failed).toBe(1);
    expect(report.results[0].diff).toMatch(/mismatch/);
  });

  it('passes when both errored with same message', () => {
    const session = makeSession({ error: { name: 'Error', message: 'boom' } });
    const results = [{ interactionId: 'i0', contractId: 'C', method: 'm', success: false, error: { name: 'Error', message: 'boom' }, durationMs: 0 }];
    const report = validator.validate(session, results);
    expect(report.passed).toBe(1);
  });

  it('fails when recorded error message differs', () => {
    const session = makeSession({ error: { name: 'Error', message: 'boom' } });
    const results = [{ interactionId: 'i0', contractId: 'C', method: 'm', success: false, error: { name: 'Error', message: 'other' }, durationMs: 0 }];
    const report = validator.validate(session, results);
    expect(report.failed).toBe(1);
  });

  it('fails when recorded success but replay errored', () => {
    const session = makeSession({ result: 1 });
    const results = [{ interactionId: 'i0', contractId: 'C', method: 'm', success: false, error: { name: 'Error', message: 'oops' }, durationMs: 0 }];
    const report = validator.validate(session, results);
    expect(report.failed).toBe(1);
    expect(report.results[0].diff).toMatch(/Expected success/);
  });

  it('fails when interaction was not replayed', () => {
    const session = makeSession({ result: 1 });
    const report = validator.validate(session, []);
    expect(report.failed).toBe(1);
    expect(report.results[0].diff).toBe('Interaction was not replayed');
  });

  it('handles BigInt in results correctly', () => {
    const session = makeSession({ result: 1000n });
    const results = [{ interactionId: 'i0', contractId: 'C', method: 'm', success: true, result: 1000n, durationMs: 0 }];
    const report = validator.validate(session, results);
    expect(report.passed).toBe(1);
  });

  it('reports correct totals', () => {
    const session = makeSession({ result: 1 }, { result: 2 });
    const results = [
      { interactionId: 'i0', contractId: 'C', method: 'm', success: true, result: 1, durationMs: 0 },
      { interactionId: 'i1', contractId: 'C', method: 'm', success: true, result: 99, durationMs: 0 },
    ];
    const report = validator.validate(session, results);
    expect(report.total).toBe(2);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: record → replay → validate
// ---------------------------------------------------------------------------
describe('Replay framework end-to-end', () => {
  it('full record → replay → validate flow', async () => {
    // 1. Record
    const recorder = new InteractionRecorder();
    await recorder.record('VAULT', 'deposit', [500n], async () => ({ txHash: 'hash-1' }));
    await recorder.record('VAULT', 'balance', ['GABC'], async () => 500n);
    const session = recorder.exportSession();

    // 2. Replay
    const handlers: ContractHandlers = {
      VAULT: {
        deposit: async () => ({ txHash: 'hash-1' }),
        balance: async () => 500n,
      },
    };
    const engine = new ReplayEngine(handlers);
    const replayResults = await engine.replay(session);

    // 3. Validate
    const validator = new ReplayValidator();
    const report = validator.validate(session, replayResults);

    expect(report.total).toBe(2);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(0);
  });
});
