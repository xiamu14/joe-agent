export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/joe-api${path}`, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `请求失败 (${response.status})`);
  }
  return response.json();
}
export function jsonBody(body: unknown, method = 'POST'): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
