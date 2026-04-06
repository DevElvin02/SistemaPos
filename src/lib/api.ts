const ENV_API_URL = (import.meta.env.VITE_API_URL || '').trim();
const isDesktopRuntime = window.location.protocol === 'file:';
const envPointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(ENV_API_URL);

const API_URL = isDesktopRuntime
  ? (ENV_API_URL || 'http://localhost:4000/api')
  : (!ENV_API_URL || envPointsToLocalhost ? `${window.location.origin}/api` : ENV_API_URL);

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: ApiMethod;
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de red desconocido';
    throw new Error(
      `No se pudo conectar con la API en ${API_URL}. Verifica que el backend este iniciado, que el archivo .env exista y que el build del escritorio sea el mas reciente. Detalle: ${message}`
    );
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) {
    throw new Error(json.error || json.message || 'Error al conectar con el servidor');
  }

  return json.data as T;
}

export { API_URL };