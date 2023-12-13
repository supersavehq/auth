import type { HttpResponse, Requester } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function post<T, D = any>(url: string, data: D, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });

  const json = response.headers.get('Content-Type')?.match(/^application\/json/i) ? await response.json() : undefined;
  return {
    statusCode: response.status,
    data: json as T,
  };
}

export const fetchRequester: Requester = {
  post,
};
