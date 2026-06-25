import { RpcHealthMonitor } from "../../src/monitoring";
import { StellarClient } from "../../src/client/stellarClient";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("RpcHealthMonitor", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("tracks endpoint availability and latency metrics for successful checks", async () => {
    const getHealth = jest.fn().mockResolvedValue({ status: "healthy", version: "20.0.0" });
    const monitor = new RpcHealthMonitor({
      endpoints: [{ id: "primary", url: "https://rpc.example", rpcClient: { getHealth } }]
    });

    const [status] = await monitor.runHealthChecks();

    expect(status.state).toBe("healthy");
    expect(status.available).toBe(true);
    expect(status.metrics.totalChecks).toBe(1);
    expect(status.metrics.successfulChecks).toBe(1);
    expect(status.metrics.failedChecks).toBe(0);
    expect(status.metrics.lastLatencyMs).toEqual(expect.any(Number));
    expect(status.metrics.averageLatencyMs).toEqual(expect.any(Number));
    expect(status.response).toEqual({ status: "healthy", version: "20.0.0" });
  });

  it("marks successful endpoints as degraded when latency exceeds the threshold", async () => {
    const getHealth = jest.fn().mockImplementation(async () => {
      await delay(20);
      return { status: "healthy" };
    });
    const monitor = new RpcHealthMonitor({
      degradedLatencyMs: 1,
      endpoints: [{ id: "slow", url: "https://slow-rpc.example", rpcClient: { getHealth } }]
    });

    const [status] = await monitor.runHealthChecks();

    expect(status.state).toBe("degraded");
    expect(status.available).toBe(true);
    expect(status.metrics.successfulChecks).toBe(1);
  });

  it("tracks failed checks and transitions to unhealthy after the configured threshold", async () => {
    const getHealth = jest.fn().mockRejectedValue(new Error("connection refused"));
    const monitor = new RpcHealthMonitor({
      unhealthyAfterFailures: 2,
      endpoints: [{ id: "primary", url: "https://rpc.example", rpcClient: { getHealth } }]
    });

    const [firstStatus] = await monitor.runHealthChecks();
    const [secondStatus] = await monitor.runHealthChecks();

    expect(firstStatus.state).toBe("degraded");
    expect(firstStatus.available).toBe(false);
    expect(secondStatus.state).toBe("unhealthy");
    expect(secondStatus.metrics.failedChecks).toBe(2);
    expect(secondStatus.metrics.consecutiveFailures).toBe(2);
    expect(secondStatus.error).toBe("connection refused");
  });

  it("generates aggregate health status reports", async () => {
    const monitor = new RpcHealthMonitor({
      endpoints: [
        {
          id: "healthy",
          url: "https://healthy-rpc.example",
          rpcClient: { getHealth: jest.fn().mockResolvedValue({ status: "healthy" }) }
        },
        {
          id: "unhealthy",
          url: "https://unhealthy-rpc.example",
          rpcClient: { getHealth: jest.fn().mockRejectedValue(new Error("down")) }
        }
      ]
    });

    await monitor.runHealthChecks();
    await monitor.runHealthChecks();

    const report = monitor.getHealthReport();

    expect(report.running).toBe(false);
    expect(report.summary).toEqual({
      total: 2,
      healthy: 1,
      degraded: 0,
      unhealthy: 1,
      unknown: 0,
      available: 1
    });
    expect(report.endpoints).toHaveLength(2);
  });

  it("supports configurable automatic monitoring intervals", () => {
    jest.useFakeTimers();
    const getHealth = jest.fn().mockResolvedValue({ status: "healthy" });
    const monitor = new RpcHealthMonitor({
      intervalMs: 1000,
      endpoints: [{ id: "primary", url: "https://rpc.example", rpcClient: { getHealth } }]
    });
    const runHealthChecks = jest.spyOn(monitor, "runHealthChecks");

    monitor.start();
    expect(monitor.running).toBe(true);
    expect(runHealthChecks).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(runHealthChecks).toHaveBeenCalledTimes(2);

    monitor.stop();
    expect(monitor.running).toBe(false);
  });
});

describe("StellarClient RPC health monitoring", () => {
  it("exposes endpoint health status when monitoring is enabled", async () => {
    const rpcClient = {
      getHealth: jest.fn().mockResolvedValue({ status: "healthy", version: "20.0.0" })
    } as any;
    const client = new StellarClient({
      rpcUrl: "https://rpc.example",
      rpcClient,
      monitoringConfig: { enabled: true }
    });

    const status = await client.runEndpointHealthCheck();
    const report = client.getHealthStatusReport();

    expect(status.state).toBe("healthy");
    expect(client.getEndpointHealthStatus()?.available).toBe(true);
    expect(report?.summary.available).toBe(1);
  });
});
