import { describe, expect, it } from 'bun:test'

import type {
  PlotPilotCodexStatusResponse,
  PlotPilotRuntimeStatus,
  PlotPilotRuntimeStartOptions,
} from '../index.ts'

describe('Drama PLM contracts', () => {
  it('defines the runtime status shape consumed by Electron', () => {
    const status: PlotPilotRuntimeStatus = {
      state: 'running',
      healthy: true,
      port: 8005,
      baseUrl: 'http://127.0.0.1:8005',
      apiBaseUrl: 'http://127.0.0.1:8005/api/v1',
      owned: true,
      adopted: false,
      projectRoot: 'C:/PlotPilot',
      dataDir: 'C:/PlotPilot/data',
    }

    expect(status.state).toBe('running')
    expect(status.owned).toBe(true)
  })

  it('keeps runtime start options independent from the Electron host', () => {
    const options: PlotPilotRuntimeStartOptions = {
      projectRoot: 'C:/PlotPilot',
      dataDir: 'C:/PlotPilot/data',
      pythonExe: 'python',
      preferExisting: true,
    }

    expect(options.preferExisting).toBe(true)
  })

  it('models Codex OAuth status without exposing tokens', () => {
    const status: PlotPilotCodexStatusResponse = {
      available: true,
      authenticated: true,
      email: 'writer@example.com',
      plan_type: 'plus',
    }

    expect(Object.keys(status)).not.toContain('token')
    expect(status.authenticated).toBe(true)
  })
})
