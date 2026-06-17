import { createBrowserHostApi, type CreateBrowserHostApiOptions, type DramaHostApi } from './index.ts'
import { createDramaRuntimeClient, type DramaRuntimeClient } from './runtime-client.ts'

export interface CreateGeckoHostApiOptions extends CreateBrowserHostApiOptions {
  runtimeBaseUrl: string
}

export interface GeckoDramaHostApi extends DramaHostApi {
  runtime: DramaRuntimeClient
}

export function createGeckoHostApi(options: CreateGeckoHostApiOptions): GeckoDramaHostApi {
  const browserHost = createBrowserHostApi({
    ...options,
    name: options.name ?? 'Drama Gecko Host',
  })
  const runtime = createDramaRuntimeClient({ baseUrl: options.runtimeBaseUrl })

  return {
    ...browserHost,
    getInfo: () => ({
      ...browserHost.getInfo(),
      kind: 'gecko',
      name: options.name ?? 'Drama Gecko Host',
    }),
    getCapabilities: () => ({
      ...browserHost.getCapabilities(),
      'rpc.request': true,
    }),
    rpc: {
      request: (channel, payload) => runtime.request(channel, payload),
    },
    runtime,
  }
}
