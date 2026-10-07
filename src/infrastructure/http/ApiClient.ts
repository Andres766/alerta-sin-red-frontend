/**
 * Cliente HTTP tipado. Distingue dos tipos de fallo, porque la estrategia
 * offline-first depende de ello:
 *  - NetworkError: no hubo respuesta (sin señal, timeout) → reintentar luego.
 *  - ApiError: el servidor respondió con error (4xx/5xx) → decidir según el código.
 */

export class NetworkError extends Error {
  constructor(message = 'Sin conexión con el servidor') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** 4xx (salvo 408/429) no mejorará reintentando: el dato enviado es inválido. */
  get isPermanent(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string | null
  timeoutMs?: number
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    private readonly defaultTimeoutMs = 8000,
  ) {}

  get<T>(path: string, token?: string | null): Promise<T> {
    return this.request<T>(path, { token })
  }

  post<T>(path: string, body?: unknown, token?: string | null): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, token })
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.defaultTimeoutMs)
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.token) headers.Authorization = `Bearer ${options.token}`

    let response: Response
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        credentials: 'omit', // autenticación por Bearer token, nunca cookies
      })
    } catch {
      throw new NetworkError()
    } finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string
        detail?: unknown
      }
      const detail = typeof payload.detail === 'string' ? payload.detail : 'Datos inválidos'
      throw new ApiError(response.status, payload.code ?? 'http_error', detail)
    }
    return (await response.json()) as T
  }
}
