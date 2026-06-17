import { describe, expect, it, mock } from 'bun:test'

import { registerDramaPlmIpc } from '../plotpilot-ipc'
import type { PlotPilotRuntimeStatus } from '@drama/plm'

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown> | unknown

function createFakeIpcMain() {
  const handlers = new Map<string, IpcHandler>()
  return {
    ipcMain: {
      handle: mock((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler)
      }),
    },
    invoke(channel: string, ...args: unknown[]) {
      const handler = handlers.get(channel)
      if (!handler) throw new Error(`No handler registered for ${channel}`)
      return handler({}, ...args)
    },
    channels() {
      return [...handlers.keys()]
    },
  }
}

describe('registerDramaPlmIpc', () => {
  it('registers PlotPilot runtime lifecycle handlers behind one boundary', async () => {
    const fake = createFakeIpcMain()
    const status = (overrides: Partial<PlotPilotRuntimeStatus> = {}): PlotPilotRuntimeStatus => ({
      state: 'running',
      healthy: true,
      owned: false,
      adopted: false,
      projectRoot: 'plotpilot',
      dataDir: 'data',
      ...overrides,
    })
    const runtime = {
      status: mock(async () => status()),
      start: mock(async (options?: unknown) => ({ ...status(), options })),
      stop: mock(async (options?: unknown) => ({ ...status({ state: 'stopped', healthy: false }), options })),
      restart: mock(async (options?: unknown) => ({ ...status(), restarted: true, options })),
      getLogs: mock(() => [{ stream: 'system', message: 'ready' }]),
    }

    registerDramaPlmIpc({
      ipcMain: fake.ipcMain,
      getRuntime: () => runtime,
    })

    expect(fake.channels()).toEqual([
      'plotpilot:runtime:status',
      'plotpilot:runtime:start',
      'plotpilot:runtime:stop',
      'plotpilot:runtime:restart',
      'plotpilot:runtime:logs',
    ])
    await expect(fake.invoke('plotpilot:runtime:status')).resolves.toMatchObject({ healthy: true })
    await expect(fake.invoke('plotpilot:runtime:start', { preferExisting: false })).resolves.toMatchObject({
      options: { preferExisting: false },
    })
    await expect(fake.invoke('plotpilot:runtime:stop')).resolves.toMatchObject({
      state: 'stopped',
      options: { forceAdopted: true },
    })
    await expect(fake.invoke('plotpilot:runtime:restart', { dataDir: 'data' })).resolves.toMatchObject({
      restarted: true,
      options: { dataDir: 'data' },
    })
    await expect(fake.invoke('plotpilot:runtime:logs')).resolves.toEqual([{ stream: 'system', message: 'ready' }])
  })
})
