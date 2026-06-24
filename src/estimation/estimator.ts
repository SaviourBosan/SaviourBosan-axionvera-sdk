import { ResourceConsumption, CostReport, SimulationData } from './types';

export class TransactionCostEstimator {
  // Constant fee rates (Simulating standard network configuration)
  private static readonly STROOPS_PER_INSTRUCTION = 0.01;
  private static readonly STROOPS_PER_BYTE = 0.5;
  private static readonly STROOPS_PER_READ = 1000;
  private static readonly STROOPS_PER_WRITE = 5000;
  private static readonly BASE_TX_FEE = 100; // Minimum flat fee

  /**
   * Generates a structural cost estimate from dry-run/simulation information.
   */
  public static calculateUsage(simulation: SimulationData): CostReport {
    if (!simulation.isSuccess) {
      throw new Error(`Cannot estimate costs for a failing transaction simulation.`);
    }

    // 1. Calculate consumption metrics with an adjustment buffer for safety
    const consumption: ResourceConsumption = {
      cpuInstructions: Math.ceil(simulation.simulatedInstructions * 1.15), // 15% safety buffer
      memoryBytes: Math.ceil(simulation.simulatedMemory * 1.10),          // 10% safety buffer
      ledgerReads: simulation.readKeysCount,
      ledgerWrites: simulation.writeKeysCount,
    };

    // 2. Compute dynamic network resource fees
    const cpuFee = consumption.cpuInstructions * this.STROOPS_PER_INSTRUCTION;
    const memFee = consumption.memoryBytes * this.STROOPS_PER_BYTE;
    const readFee = consumption.ledgerReads * this.STROOPS_PER_READ;
    const writeFee = consumption.ledgerWrites * this.STROOPS_PER_WRITE;

    const dynamicResourceFee = Math.ceil(cpuFee + memFee + readFee + writeFee);
    const totalFee = this.BASE_TX_FEE + dynamicResourceFee;

    return {
      baseFee: this.BASE_TX_FEE.toString(),
      resourceFee: dynamicResourceFee.toString(),
      totalEstimatedFee: totalFee.toString(),
      consumption,
      accuracyConfidence: consumption.cpuInstructions > 5000000 ? 'MEDIUM' : 'HIGH',
    };
  }
}