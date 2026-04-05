const API_URL = import.meta.env.VITE_API_URL
  || (window.location.protocol === 'file:' ? 'http://localhost:4000/api' : `${window.location.origin}/api`);

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