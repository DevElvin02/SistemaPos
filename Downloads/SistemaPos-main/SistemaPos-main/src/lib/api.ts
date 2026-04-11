const ENV_API_URL = (import.meta.env.VITE_API_URL || '').trim();
const isDesktopRuntime = window.location.protocol === 'file:';

const API_URL = isDesktopRuntime
  ? (ENV_API_URL || 'http://localhost:4000/api')
  : (ENV_API_URL || `${window.location.origin}/api`);

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: ApiMethod;
  body?: unknown;
}

const CLIENT_RUNTIME_HEADER = isDesktopRuntime ? 'desktop' : 'web';

async function fetchWithRetry<T>(
  url: string,
  fetchOptions: RequestInit,
  retries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(15000) });
    } catch (error) {
      lastError = error as Error;
      const isConnectionError =
        lastError.name === 'AbortError' ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ECONNREFUSED') ||
        lastError.message.includes('ERR_NETWORK');

      if (isConnectionError && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Error de red desconocido');
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetchWithRetry(
      `${API_URL}${path}`,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-client-runtime': CLIENT_RUNTIME_HEADER,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      }
    );
  } catch (error) {
    const err = error as Error;
    const isConnRefused = err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET');
    const runtime = isDesktopRuntime ? 'DESKTOP (Electron)' : 'WEB';

    let advice = '';
    if (isDesktopRuntime) {
      advice = 'Verifica que:\n' +
        '1. El API está corriendo (npm run dev:api en otra terminal)\n' +
        '2. El puerto 4000 está disponible\n' +
        '3. .env tiene las credenciales de BD correctas';
    } else {
      advice = 'Verifica que:\n' +
        '1. El API backend está corriendo en ' + API_URL + '\n' +
        '2. CORS está habilitado para este dominio\n' +
        '3. El .env.local tiene VITE_API_URL correcto (si es dev)';
    }

    throw new Error(
      `[${runtime}] No se pudo conectar con la API en ${API_URL}.${isConnRefused ? ' (Conexión rechazada - el servidor no responde)' : ''}\n\n${advice}\n\nDetalle técnico: ${err.message}`
    );
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) {
    throw new Error(json.error || json.message || 'Error al conectar con el servidor');
  }

  return json.data as T;
}

export { API_URL };