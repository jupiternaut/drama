export type PlmRuntimeStatus =
  | 'unknown'
  | 'starting'
  | 'running'
  | 'healthy'
  | 'unhealthy'
  | 'stopping'
  | 'stopped'
  | 'error'
  | (string & {})

export interface PlmHealth {
  status: PlmRuntimeStatus
  version?: string
  build_id?: string
  uptime_seconds?: number
  daemon_process?: {
    running: boolean
    pid?: number | null
  }
  [key: string]: unknown
}

export type PlotPilotLogStream = 'stdout' | 'stderr' | 'system' | 'runtime'

export interface PlmLogEntry {
  timestamp?: string
  level?: 'debug' | 'info' | 'warning' | 'error' | 'critical' | (string & {})
  message?: string
  stream?: PlotPilotLogStream | (string & {})
  line?: string
  source?: string
  novel_id?: string
  metadata?: Record<string, unknown>
}

export type PlotPilotHealth = PlmHealth
export type PlotPilotLogEntry = PlmLogEntry

export type PlotPilotRuntimeState =
  | 'stopped'
  | 'starting'
  | 'ready'
  | 'running'
  | 'stopping'
  | 'error'
  | (string & {})

export interface PlotPilotRuntimeStartOptions {
  projectRoot?: string
  dataDir?: string
  pythonExe?: string
  preferExisting?: boolean
}

export interface PlotPilotRuntimeStatus {
  state: PlotPilotRuntimeState
  healthy?: boolean
  port?: number | null
  baseUrl?: string | null
  apiBaseUrl?: string | null
  url?: string | null
  pid?: number | null
  startedAt?: string
  owned: boolean
  adopted: boolean
  projectRoot: string
  dataDir: string
  error?: string
  lastError?: string
  lastExitCode?: number | null
  lastExitSignal?: NodeJS.Signals | null
  health?: PlotPilotHealth
}
