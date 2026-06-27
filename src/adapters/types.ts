/** Typed contract method arguments */
export type ContractMethodArg = 
  | string 
  | number 
  | bigint 
  | boolean 
  | null 
  | ContractMethodArg[] 
  | Record<string, unknown>;

/** Generic adapter interface with typed method arguments */
export interface ContractAdapter {
  readonly name: string;
  readonly version: string;
  /** Check if this adapter supports a given contract address */
  supports(contractId: string): Promise<boolean>;
  /** Read a value from the contract */
  read<T = unknown>(contractId: string, method: string, ...args: ContractMethodArg[]): Promise<T>;
  /** Invoke a write method on the contract */
  write(contractId: string, method: string, ...args: ContractMethodArg[]): Promise<string>;
}

export interface AdapterRegistryConfig {
  /** Default adapter name to use when none specified */
  defaultAdapter?: string;
}
