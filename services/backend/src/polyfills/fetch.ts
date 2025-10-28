import fetch, { Headers, Request, Response } from 'node-fetch';
import { Readable } from 'stream';

type GlobalWithFetch = typeof globalThis & {
  fetch?: typeof fetch;
  Headers?: typeof Headers;
  Request?: typeof Request;
  Response?: typeof Response;
};

const globalScope = globalThis as GlobalWithFetch;

// Wrapper to add Web Streams API support to node-fetch Response
async function fetchWithStreamSupport(...args: Parameters<typeof fetch>) {
  const response = await fetch(...args);

  // Add getReader() method to response.body for Web Streams API compatibility
  if (response.body && !('getReader' in response.body)) {
    const originalBody = response.body as unknown as Readable;

    (response.body as any).getReader = function() {
      const reader = {
        async read(): Promise<{ done: boolean; value?: Uint8Array }> {
          return new Promise((resolve, reject) => {
            const chunk = originalBody.read();
            if (chunk === null) {
              // No data available, wait for 'readable' event
              originalBody.once('readable', () => {
                const nextChunk = originalBody.read();
                if (nextChunk === null) {
                  originalBody.once('end', () => resolve({ done: true }));
                } else {
                  resolve({ done: false, value: nextChunk });
                }
              });
              originalBody.once('end', () => resolve({ done: true }));
              originalBody.once('error', reject);
            } else {
              resolve({ done: false, value: chunk });
            }
          });
        }
      };
      return reader;
    };
  }

  return response;
}

if (typeof globalScope.fetch !== 'function') {
  globalScope.fetch = fetchWithStreamSupport as unknown as typeof globalScope.fetch;
  globalScope.Headers = Headers as unknown as typeof globalScope.Headers;
  globalScope.Request = Request as unknown as typeof globalScope.Request;
  globalScope.Response = Response as unknown as typeof globalScope.Response;
}
