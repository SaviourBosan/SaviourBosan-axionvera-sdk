import { ProfilingService } from '../../src/profiling';

describe('ProfilingService', () => {
  it('does not record metrics when disabled', async () => {
    const profiler = new ProfilingService({ enabled: false });

    const result = await profiler.profileContractCall('Vault', 'balanceOf', async () => 42n);

    expect(result).toBe(42n);
    expect(profiler.getMetrics()).toHaveLength(0);
    expect(profiler.generateReport().totalCalls).toBe(0);
  });

  it('records contract call timing and metadata when enabled', async () => {
    let current = 100;
    const profiler = new ProfilingService({ enabled: true, now: () => current });

    const result = await profiler.profileContractCall('Vault', 'deposit', async () => {
      current = 135;
      return 'tx-hash';
    }, { contractAddress: '0xabc' });

    expect(result).toBe('tx-hash');
    const [metric] = profiler.getMetrics();
    expect(metric).toMatchObject({
      name: 'Vault.deposit',
      type: 'contract',
      durationMs: 35,
      success: true,
      metadata: { contract: 'Vault', method: 'deposit', contractAddress: '0xabc' },
    });
  });

  it('records RPC latency metrics and generates aggregate reports', async () => {
    let current = 0;
    const profiler = new ProfilingService({ enabled: true, now: () => current });

    await profiler.profileRpcCall('getHealth', async () => {
      current = 10;
      return { status: 'healthy' };
    });
    await profiler.profileRpcCall('simulateTransaction', async () => {
      current = 40;
      return { result: 'ok' };
    });

    const report = profiler.generateReport();
    expect(report.totalCalls).toBe(2);
    expect(report.successfulCalls).toBe(2);
    expect(report.failedCalls).toBe(0);
    expect(report.averageDurationMs).toBe(20);
    expect(report.p95DurationMs).toBe(30);
    expect(report.byType.rpc).toMatchObject({ count: 2, averageDurationMs: 20, maxDurationMs: 30 });
  });

  it('records failed calls and rethrows the original error', async () => {
    const profiler = new ProfilingService({ enabled: true });

    await expect(profiler.profileRpcCall('sendTransaction', async () => {
      throw new Error('RPC unavailable');
    })).rejects.toThrow('RPC unavailable');

    const report = profiler.generateReport();
    expect(report.failedCalls).toBe(1);
    expect(report.calls[0]).toMatchObject({ success: false, errorMessage: 'RPC unavailable' });
  });

  it('can be enabled, disabled, and cleared', async () => {
    const profiler = new ProfilingService();

    profiler.enable('detailed');
    await profiler.profile('customStep', async () => 'ok');
    expect(profiler.generateReport()).toMatchObject({ enabled: true, level: 'detailed', totalCalls: 1 });

    profiler.disable();
    await profiler.profile('ignoredStep', async () => 'ok');
    expect(profiler.getMetrics()).toHaveLength(1);

    profiler.clear();
    expect(profiler.getMetrics()).toHaveLength(0);
  });
});
