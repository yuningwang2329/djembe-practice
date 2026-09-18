// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker(cached?: Response, network = new Response(null, {status: 206})) {
  const handlers: Record<string, (event: any) => void> = {};
  const put = vi.fn();
  const fetch = vi.fn(async () => network);
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: {scope:'https://test.local/'}, addEventListener: (name: string, fn: any) => { handlers[name] = fn; } },
    URL, Response, Headers,
    caches: { match: async () => cached, open: async () => ({put}) }, fetch,
  });
  return {put, fetch, request(range: string): Promise<Response> {
    let response: Promise<Response>;
    handlers.fetch({request: new Request('https://test.local/audio/demo.wav', {headers: {Range: range}}), respondWith: (value: Promise<Response>) => {response = value;} });
    return response!;
  }};
}

describe('offline audio byte ranges', () => {
  it.each([['bytes=2-5', '2345', 'bytes 2-5/10'], ['bytes=7-', '789', 'bytes 7-9/10'], ['bytes=-3', '789', 'bytes 7-9/10']])('serves %s from cached complete audio', async (range, text, contentRange) => {
    const instance = worker(new Response('0123456789', {headers:{'Content-Type':'audio/wav'}}));
    const response = await instance.request(range);
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe(contentRange);
    expect(await response.text()).toBe(text);
    expect(instance.fetch).not.toHaveBeenCalled();
  });
  it('rejects a range outside the recording', async () => {
    const response = await worker(new Response('123')).request('bytes=9-');
    expect(response.status).toBe(416);
  });
  it('does not cache a partial network response as a complete file', async () => {
    const instance = worker();
    expect((await instance.request('bytes=2-')).status).toBe(206);
    expect(instance.put).not.toHaveBeenCalled();
  });
});
