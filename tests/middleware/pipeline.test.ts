import { MiddlewarePipeline } from '../../src/middleware';

describe('MiddlewarePipeline', () => {
  it('executes multiple middleware layers in deterministic order', async () => {
    const events: string[] = [];
    const pipeline = new MiddlewarePipeline();

    pipeline.use({
      name: 'late',
      order: 20,
      pre: () => { events.push('late:pre'); },
      post: () => { events.push('late:post'); },
    });
    pipeline.use({
      name: 'early',
      order: 10,
      pre: () => { events.push('early:pre'); },
      post: () => { events.push('early:post'); },
    });
    pipeline.use({
      name: 'same-order',
      order: 10,
      pre: () => { events.push('same:pre'); },
      post: () => { events.push('same:post'); },
    });

    const result = await pipeline.execute('request', 'getHealth', { value: 1 }, async () => {
      events.push('handler');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(events).toEqual([
      'early:pre',
      'same:pre',
      'late:pre',
      'handler',
      'late:post',
      'same:post',
      'early:post',
    ]);
  });

  it('allows middleware to mutate payload and result contexts', async () => {
    const pipeline = new MiddlewarePipeline([
      {
        name: 'mutator',
        pre: (context) => ({
          ...context,
          payload: { ...(context.payload as Record<string, number>), value: 2 },
        }),
        post: (context) => ({ ...context, result: `${context.result}:post` }),
      },
    ]);

    const result = await pipeline.execute<{ value: number }, string>(
      'transaction',
      'sendTransaction',
      { value: 1 },
      async (payload) => `value:${payload.value}`
    );

    expect(result).toBe('value:2:post');
  });

  it('runs error middleware in reverse order before rethrowing', async () => {
    const events: string[] = [];
    const pipeline = new MiddlewarePipeline([
      { name: 'first', order: 1, onError: () => { events.push('first:error'); } },
      { name: 'second', order: 2, onError: () => { events.push('second:error'); } },
    ]);

    await expect(
      pipeline.execute('request', 'getHealth', undefined, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(events).toEqual(['second:error', 'first:error']);
  });

  it('supports unregistering middleware dynamically', async () => {
    const events: string[] = [];
    const pipeline = new MiddlewarePipeline();
    const unregister = pipeline.use({ name: 'logger', pre: () => { events.push('pre'); } });

    expect(unregister()).toBe(true);

    await pipeline.execute('request', 'getHealth', undefined, async () => 'ok');
    expect(events).toEqual([]);
  });
});
