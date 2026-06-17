export type DramaRuntimeState = 'offline' | 'starting' | 'ready' | 'error'

export interface DramaRuntimeStatus {
  state: DramaRuntimeState
  version?: string
  message?: string
  updatedAt?: string
  endpoints?: {
    graph?: string
    plm?: string
    crew?: string
    app?: string
    events?: string
  }
}

export interface DramaRuntimeRpcRequest<TPayload = unknown> {
  channel: string
  payload?: TPayload
}

export interface DramaRuntimeRpcResponse<TResponse = unknown> {
  ok: boolean
  data?: TResponse
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface DramaRuntimeClientOptions {
  baseUrl: string
  fetcher?: typeof fetch
}

export class DramaRuntimeError extends Error {
  readonly code: string
  readonly status?: number
  readonly details?: unknown

  constructor(message: string, options: { code: string; status?: number; details?: unknown }) {
    super(message)
    this.name = 'DramaRuntimeError'
    this.code = options.code
    this.status = options.status
    this.details = options.details
  }
}

export interface DramaRuntimeClient {
  readonly baseUrl: string
  getStatus(): Promise<DramaRuntimeStatus>
  request<TResponse = unknown, TPayload = unknown>(channel: string, payload?: TPayload): Promise<TResponse>
}

export function createDramaRuntimeClient(options: DramaRuntimeClientOptions): DramaRuntimeClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis)
  if (!fetcher) {
    throw new DramaRuntimeError('This host does not provide fetch.', { code: 'FETCH_UNAVAILABLE' })
  }

  async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    })

    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }

    if (!response.ok) {
      const maybeError = body as Partial<DramaRuntimeRpcResponse>
      throw new DramaRuntimeError(
        maybeError.error?.message ?? `Drama runtime request failed with ${response.status}.`,
        {
          code: maybeError.error?.code ?? 'RUNTIME_HTTP_ERROR',
          status: response.status,
          details: maybeError.error?.details ?? body,
        },
      )
    }

    return body as T
  }

  return {
    baseUrl,
    getStatus() {
      return readJson<DramaRuntimeStatus>('/runtime/status')
    },
    async request<TResponse = unknown, TPayload = unknown>(channel: string, payload?: TPayload) {
      const response = await readJson<DramaRuntimeRpcResponse<TResponse>>('/runtime/rpc', {
        method: 'POST',
        body: JSON.stringify({ channel, payload } satisfies DramaRuntimeRpcRequest<TPayload>),
      })
      if (!response.ok) {
        throw new DramaRuntimeError(response.error?.message ?? 'Drama runtime RPC failed.', {
          code: response.error?.code ?? 'RUNTIME_RPC_ERROR',
          details: response.error?.details,
        })
      }
      return response.data as TResponse
    },
  }
}
