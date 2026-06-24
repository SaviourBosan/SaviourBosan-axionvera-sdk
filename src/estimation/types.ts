export interface ResourceConsumption {
  cpuInstructions: number;
  memoryBytes: number;
  ledgerReads: number;
  ledgerWrites: number;
}

export interface CostReport {
  baseFee: string;       // In stroops or base tokens
  resourceFee: string;   // Dynamic fee based on resource consumption
  totalEstimatedFee: string;
  consumption: ResourceConsumption;
  accuracyConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SimulationData {
  txType: string;
  simulatedInstructions: number;
  simulatedMemory: number;
  readKeysCount: number;
  writeKeysCount: number;
  isSuccess: boolean;
}