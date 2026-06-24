import { TransactionCostEstimator } from '../../src/estimation/estimator';
import { SimulationData } from '../../src/estimation/types';

describe('TransactionCostEstimator Validation Tests', () => {
  const mockValidSimulation: SimulationData = {
    txType: 'contract_invocation',
    simulatedInstructions: 2000000,
    simulatedMemory: 4096,
    readKeysCount: 3,
    writeKeysCount: 1,
    isSuccess: true,
  };

  test('should accurately generate cost estimates with safety buffers', () => {
    const report = TransactionCostEstimator.calculateUsage(mockValidSimulation);

    expect(report).toBeDefined();
    expect(parseInt(report.baseFee)).toBe(100);
    // Verifying instructions 2000000 * 1.15 buffer = 2300000
    expect(report.consumption.cpuInstructions).toBe(2300000);
    expect(parseInt(report.totalEstimatedFee)).toBeGreaterThan(100);
  });

  test('should throw an error if the transaction simulation failed', () => {
    const failingSimulation: SimulationData = {
      ...mockValidSimulation,
      isSuccess: false,
    };

    expect(() => {
      TransactionCostEstimator.calculateUsage(failingSimulation);
    }).toThrow('Cannot estimate costs for a failing transaction simulation.');
  });
});