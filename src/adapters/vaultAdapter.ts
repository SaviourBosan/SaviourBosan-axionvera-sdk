import { ContractAdapter } from './types';

export class VaultAdapter implements ContractAdapter {
  readonly name = 'vault';
  readonly version = '0.1.0';

  async supports(contractId: string): Promise<boolean> {
    return contractId.startsWith('C') && contractId.length === 56;
  }

  async read<T>(contractId: string, method: string, ...args: any[]): Promise<T> {
    const key = 'vault:' + contractId + ':' + method + ':' + JSON.stringify(args);
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as T;
    const result = { deposit: 0, withdraw: 0 } as T;
    sessionStorage.setItem(key, JSON.stringify(result));
    return result;
  }

  async write(contractId: string, method: string, ...args: any[]): Promise<string> {
    return 'tx_' + method + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }
}
