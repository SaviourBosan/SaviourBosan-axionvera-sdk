import { ContractAdapter, AdapterRegistryConfig } from './types';

export class AdapterRegistry {
  private adapters: Map<string, ContractAdapter> = new Map();
  private defaultName: string | null = null;

  constructor(config?: AdapterRegistryConfig) {
    if (config?.defaultAdapter) {
      this.defaultName = config.defaultAdapter;
    }
  }

  register(adapter: ContractAdapter): void {
    this.adapters.set(adapter.name, adapter);
    if (!this.defaultName) {
      this.defaultName = adapter.name;
    }
  }

  unregister(name: string): boolean {
    if (this.defaultName === name) {
      this.defaultName = null;
    }
    return this.adapters.delete(name);
  }

  get(name?: string): ContractAdapter | undefined {
    const key = name ?? this.defaultName;
    if (!key) return undefined;
    return this.adapters.get(key);
  }

  async findAdapter(contractId: string): Promise<ContractAdapter | undefined> {
    for (const adapter of this.adapters.values()) {
      if (await adapter.supports(contractId)) {
        return adapter;
      }
    }
    return undefined;
  }

  setDefault(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error('Adapter not registered: ' + name);
    }
    this.defaultName = name;
  }

  getDefault(): ContractAdapter | undefined {
    if (!this.defaultName) return undefined;
    return this.adapters.get(this.defaultName);
  }

  list(): ContractAdapter[] {
    return [...this.adapters.values()];
  }

  count(): number {
    return this.adapters.size;
  }
}
