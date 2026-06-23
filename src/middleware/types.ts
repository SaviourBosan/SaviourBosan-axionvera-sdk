export type MiddlewareWorkflow = 'request' | 'transaction';
export type MiddlewareStage = 'pre' | 'post' | 'error';

export interface MiddlewareContext<TPayload = unknown, TResult = unknown> {
  workflow: MiddlewareWorkflow;
  operation: string;
  payload: TPayload;
  result?: TResult;
  error?: unknown;
  metadata: Record<string, unknown>;
}

export interface Middleware<TPayload = unknown, TResult = unknown> {
  name: string;
  order?: number;
  pre?(context: MiddlewareContext<TPayload, TResult>): void | MiddlewareContext<TPayload, TResult> | Promise<void | MiddlewareContext<TPayload, TResult>>;
  post?(context: MiddlewareContext<TPayload, TResult>): void | MiddlewareContext<TPayload, TResult> | Promise<void | MiddlewareContext<TPayload, TResult>>;
  onError?(context: MiddlewareContext<TPayload, TResult>): void | MiddlewareContext<TPayload, TResult> | Promise<void | MiddlewareContext<TPayload, TResult>>;
}

export type MiddlewareRegistration = () => boolean;

export interface MiddlewarePipelineOptions {
  middleware?: Middleware[];
}
