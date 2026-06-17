import type { IpcMain } from 'electron'
import type {
  PlotPilotLogEntry,
  PlotPilotRuntimeStartOptions,
  PlotPilotRuntimeStatus,
} from '@drama/plm'

export interface DramaPlmRuntime {
  status(options?: { checkHealth?: boolean }): Promise<PlotPilotRuntimeStatus>
  start(options?: PlotPilotRuntimeStartOptions): Promise<PlotPilotRuntimeStatus>
  stop(options?: { forceAdopted?: boolean }): Promise<PlotPilotRuntimeStatus>
  restart(options?: PlotPilotRuntimeStartOptions): Promise<PlotPilotRuntimeStatus>
  getLogs(): PlotPilotLogEntry[]
}

export interface DramaPlmIpcDeps {
  ipcMain: Pick<IpcMain, 'handle'>
  getRuntime: () => DramaPlmRuntime
}

export function registerDramaPlmIpc(deps: DramaPlmIpcDeps): void {
  deps.ipcMain.handle('plotpilot:runtime:status', async () => {
    return await deps.getRuntime().status({ checkHealth: true })
  })

  deps.ipcMain.handle('plotpilot:runtime:start', async (_event, options?: PlotPilotRuntimeStartOptions) => {
    return await deps.getRuntime().start(options)
  })

  deps.ipcMain.handle('plotpilot:runtime:stop', async () => {
    return await deps.getRuntime().stop({ forceAdopted: true })
  })

  deps.ipcMain.handle('plotpilot:runtime:restart', async (_event, options?: PlotPilotRuntimeStartOptions) => {
    return await deps.getRuntime().restart(options)
  })

  deps.ipcMain.handle('plotpilot:runtime:logs', async () => {
    return deps.getRuntime().getLogs()
  })
}
