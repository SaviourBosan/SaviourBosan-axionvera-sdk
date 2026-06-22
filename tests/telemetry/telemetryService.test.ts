import { TelemetryService } from '../../src/telemetry/telemetryService';
import { TelemetryEvent } from '../../src/telemetry/types';

describe('TelemetryService', () => {
  let telemetry: TelemetryService;

  beforeEach(() => {
    telemetry = new TelemetryService({ enabled: true, anonymize: false, bufferSize: 5, flushIntervalMs: 60000 });
  });

  afterEach(() => {
    telemetry.destroy();
  });

  it('tracks events when enabled', () => {
    telemetry.track('sdk_init', { version: '1.0.0' });
    telemetry.track('wallet_connect');

    const flushed: TelemetryEvent[] = [];
    telemetry.onFlush((events) => flushed.push(...events));
    telemetry.flush();

    expect(flushed).toHaveLength(2);
    expect(flushed[0].type).toBe('sdk_init');
  });

  it('does not track when disabled', () => {
    telemetry.setEnabled(false);
    telemetry.track('test', {});

    const flushed: TelemetryEvent[] = [];
    telemetry.onFlush((events) => flushed.push(...events));
    telemetry.flush();

    expect(flushed).toHaveLength(0);
  });

  it('auto-flushes when buffer is full', () => {
    const flushed: TelemetryEvent[] = [];
    telemetry.onFlush((events) => flushed.push(...events));

    for (let i = 0; i < 5; i++) {
      telemetry.track('event', { index: i });
    }

    expect(flushed).toHaveLength(5);
  });

  it('anonymizes sensitive data when enabled', () => {
    const privateTelemetry = new TelemetryService({ enabled: true, anonymize: true });
    privateTelemetry.track('login', { address: 'GABC123', email: 'user@test.com', action: 'connect' });

    const flushed: TelemetryEvent[] = [];
    privateTelemetry.onFlush((events) => flushed.push(...events));
    privateTelemetry.flush();

    expect(flushed[0].data.address).toBe('[REDACTED]');
    expect(flushed[0].data.email).toBe('[REDACTED]');
    expect(flushed[0].data.action).toBe('connect');
    expect(flushed[0].anonymized).toBe(true);

    privateTelemetry.destroy();
  });

  it('calls flush handler on manual flush', () => {
    let called = false;
    telemetry.onFlush(() => { called = true; });
    telemetry.track('test', {});
    telemetry.flush();

    expect(called).toBe(true);
  });

  it('provides metrics collector', () => {
    telemetry.metrics().increment('rpc_calls');
    expect(telemetry.metrics().getCounter('rpc_calls')?.value).toBe(1);
  });

  it('updates config at runtime', () => {
    expect(telemetry.isEnabled()).toBe(true);
    telemetry.updateConfig({ enabled: false });
    expect(telemetry.isEnabled()).toBe(false);
  });

  it('flushes on destroy', () => {
    const flushed: TelemetryEvent[] = [];
    telemetry.onFlush((events) => flushed.push(...events));
    telemetry.track('final', {});
    telemetry.destroy();

    expect(flushed).toHaveLength(1);
  });
});
