import { MetricsCollector } from '../../src/metrics/metricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('increments counters', () => {
    collector.increment('rpc_calls');
    collector.increment('rpc_calls');
    collector.increment('rpc_calls', {}, 3);

    const counter = collector.getCounter('rpc_calls');
    expect(counter?.value).toBe(5);
  });

  it('tracks counters with tags separately', () => {
    collector.increment('api_calls', { endpoint: '/health' });
    collector.increment('api_calls', { endpoint: '/balance' }, 2);

    const health = collector.getCounter('api_calls', { endpoint: '/health' });
    const balance = collector.getCounter('api_calls', { endpoint: '/balance' });

    expect(health?.value).toBe(1);
    expect(balance?.value).toBe(2);
  });

  it('sets and gets gauges', () => {
    collector.gauge('active_connections', 5);
    collector.gauge('active_connections', 8);

    const gauge = collector.getGauge('active_connections');
    expect(gauge?.value).toBe(8);
  });

  it('records histogram values', () => {
    collector.observe('tx_latency', 12);
    collector.observe('tx_latency', 45);
    collector.observe('tx_latency', 7);

    const snapshot = collector.snapshot();
    const hist = snapshot.histograms.find((h) => h.name === 'tx_latency');
    expect(hist?.values).toEqual([12, 45, 7]);
  });

  it('produces a snapshot with all metric types', () => {
    collector.increment('errors', {}, 3);
    collector.gauge('memory_mb', 256);
    collector.observe('latency', 50);

    const snapshot = collector.snapshot();
    expect(snapshot.counters).toHaveLength(1);
    expect(snapshot.gauges).toHaveLength(1);
    expect(snapshot.histograms).toHaveLength(1);
  });

  it('clears all metrics', () => {
    collector.increment('test', {}, 5);
    collector.gauge('test_gauge', 10);
    collector.clear();

    expect(collector.getCounter('test')).toBeUndefined();
    expect(collector.getGauge('test_gauge')).toBeUndefined();
  });
});
