import { Middleware, MiddlewareContext, MiddlewareRegistration, MiddlewareWorkflow } from './types';

export class MiddlewarePipeline {
  private readonly middleware: Middleware[] = [];
  private nextSequence = 0;

  constructor(middleware: Middleware[] = []) {
    middleware.forEach((entry) => this.use(entry));
  }

  use(middleware: Middleware): MiddlewareRegistration {
    if (!middleware?.name) {
      throw new Error('Middleware must include a non-empty name');
    }

    const registered = {
      ...middleware,
      order: middleware.order ?? 0,
      __sequence: this.nextSequence++,
    } as Middleware & { __sequence: number };

    this.middleware.push(registered);
    this.sortMiddleware();

    return () => this.remove(middleware.name);
  }

  remove(name: string): boolean {
    const index = this.middleware.findIndex((entry) => entry.name === name);
    if (index === -1) return false;
    this.middleware.splice(index, 1);
    return true;
  }

  list(): readonly Middleware[] {
    return [...this.middleware];
  }

  clear(): void {
    this.middleware.length = 0;
  }

  async execute<TPayload, TResult>(
    workflow: MiddlewareWorkflow,
    operation: string,
    payload: TPayload,
    next: (payload: TPayload, context: MiddlewareContext<TPayload, TResult>) => Promise<TResult> | TResult,
    metadata: Record<string, unknown> = {}
  ): Promise<TResult> {
    let context: MiddlewareContext<TPayload, TResult> = {
      workflow,
      operation,
      payload,
      metadata: { ...metadata },
    };

    try {
      for (const entry of this.middleware) {
        if (entry.pre) {
          context = await this.applyHook(entry.pre.bind(entry), context);
        }
      }

      context.result = await next(context.payload, context);

      for (const entry of [...this.middleware].reverse()) {
        if (entry.post) {
          context = await this.applyHook(entry.post.bind(entry), context);
        }
      }

      return context.result as TResult;
    } catch (error) {
      context.error = error;

      for (const entry of [...this.middleware].reverse()) {
        if (entry.onError) {
          context = await this.applyHook(entry.onError.bind(entry), context);
        }
      }

      if (context.error !== error) {
        throw context.error;
      }
      throw error;
    }
  }

  private async applyHook<TPayload, TResult>(
    hook: (context: MiddlewareContext<TPayload, TResult>) => void | MiddlewareContext<TPayload, TResult> | Promise<void | MiddlewareContext<TPayload, TResult>>,
    context: MiddlewareContext<TPayload, TResult>
  ): Promise<MiddlewareContext<TPayload, TResult>> {
    const nextContext = await hook(context);
    if (nextContext === undefined) return context;
    return nextContext as MiddlewareContext<TPayload, TResult>;
  }

  private sortMiddleware(): void {
    this.middleware.sort((a, b) => {
      const left = a as Middleware & { __sequence?: number };
      const right = b as Middleware & { __sequence?: number };
      const orderDiff = (left.order ?? 0) - (right.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (left.__sequence ?? 0) - (right.__sequence ?? 0);
    });
  }
}
