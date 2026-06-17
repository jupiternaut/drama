import { execFile as nodeExecFile, spawn as nodeSpawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { basename, delimiter, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type {
  PlmHealth,
  PlotPilotLogEntry,
  PlotPilotLogStream,
  PlotPilotRuntimeStartOptions,
  PlotPilotRuntimeState,
  PlotPilotRuntimeStatus,
} from './runtime.ts'

export const DEFAULT_PLOTPILOT_PROJECT_ROOT = join(homedir(), 'Downloads', 'PlotPilot-plm')
export const PLOTPILOT_PROJECT_ROOT_CANDIDATES = [
  join(homedir(), 'Downloads', 'PlotPilot-plm-v46-read'),
  join(homedir(), 'Downloads', 'PlotPilot-plm-v46'),
  join(homedir(), 'Downloads', 'PlotPilot-plm-v451-read'),
  DEFAULT_PLOTPILOT_PROJECT_ROOT,
]
const DEFAULT_PORT_START = 8005
const DEFAULT_PORT_SCAN_LIMIT = 100
const DEFAULT_HEALTH_TIMEOUT_MS = 30_000
const DEFAULT_REQUEST_TIMEOUT_MS = 2_000
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000
const DEFAULT_POLL_INTERVAL_MS = 100
const DEFAULT_MAX_LOG_ENTRIES = 500
const EMBEDDED_BOOT_MODULE = 'plotpilot_embedded_boot:app'
const MODULE_DIR = dirname(fileURLToPath(import.meta.url))

export interface PlotPilotSpawnOptions {
  cwd: string
  env: NodeJS.ProcessEnv
  stdio: 'pipe'
  windowsHide: boolean
}

export interface PlotPilotChildProcess {
  pid?: number
  stdout?: NodeJS.ReadableStream | null
  stderr?: NodeJS.ReadableStream | null
  exitCode?: number | null
  signalCode?: NodeJS.Signals | null
  killed?: boolean
  kill(signal?: NodeJS.Signals | number): boolean
  on(event: string | symbol, listener: (...args: unknown[]) => void): this
  once(event: string | symbol, listener: (...args: unknown[]) => void): this
  removeListener(event: string | symbol, listener: (...args: unknown[]) => void): this
}

export interface PlotPilotRuntimeDeps {
  spawnProcess?: (
    command: string,
    args: string[],
    options: PlotPilotSpawnOptions,
  ) => PlotPilotChildProcess
  execFile?: (file: string, args: string[]) => Promise<{ stdout: string; stderr: string }>
  fetch?: (input: string, init?: RequestInit) => Promise<Response>
  isPortAvailable?: (port: number) => boolean | Promise<boolean>
  platform?: NodeJS.Platform
  now?: () => Date
}

export interface PlotPilotRuntimeOptions {
  projectRoot?: string
  dataDir?: string
  pythonExe?: string
  portStart?: number
  portScanLimit?: number
  healthTimeoutMs?: number
  requestTimeoutMs?: number
  shutdownTimeoutMs?: number
  pollIntervalMs?: number
  maxLogEntries?: number
  deps?: PlotPilotRuntimeDeps
}

export type PlotPilotStartOptions = PlotPilotRuntimeStartOptions

export interface PlotPilotStopOptions {
  timeoutMs?: number
  skipShutdownRequest?: boolean
  forceAdopted?: boolean
}

const nodeExecFileAsync = promisify(nodeExecFile)

function resolveDefaultDataDir(): string {
  if (process.env.PLOTPILOT_PROD_DATA_DIR) return process.env.PLOTPILOT_PROD_DATA_DIR
  if (process.env.AITEXT_PROD_DATA_DIR) return process.env.AITEXT_PROD_DATA_DIR
  if (process.env.APPDATA) return join(process.env.APPDATA, 'PlotPilot', 'data')
  return join(homedir(), '.plotpilot', 'data')
}

function resourcesBaseCandidates(): string[] {
  const processWithResources = process as NodeJS.Process & { resourcesPath?: string }
  return [
    process.env.CRAFT_RESOURCES_BASE,
    process.env.DRAMA_RESOURCES_BASE,
    process.env.DRAMA_ZEN_PACKAGE_RESOURCES,
    processWithResources.resourcesPath,
    join(MODULE_DIR, 'resources'),
    join(MODULE_DIR, '..', 'resources'),
    join(MODULE_DIR, '..', '..', 'resources'),
    join(MODULE_DIR, '..', '..', '..', 'apps', 'electron', 'resources'),
    join(MODULE_DIR, '..', '..', '..', '..', 'apps', 'electron', 'resources'),
    join(process.cwd(), '..', 'electron', 'resources'),
    join(process.cwd(), '..', '..', 'apps', 'electron', 'resources'),
    join(process.cwd(), 'apps', 'electron', 'resources'),
  ].filter((candidate): candidate is string => Boolean(candidate))
}

function explicitEmbeddedBootPathCandidates(): string[] {
  return [
    process.env.PLOTPILOT_EMBEDDED_BOOT_PATH,
    process.env.DRAMA_PLOTPILOT_BOOT_PATH,
    process.env.DRAMA_PLOTPILOT_BOOT_SHIM,
  ].filter((candidate): candidate is string => Boolean(candidate))
}

function embeddedBootDirFromExplicitPath(candidate: string): string | undefined {
  const normalized = extname(candidate).toLowerCase() === '.py'
    ? dirname(candidate)
    : candidate
  return existsSync(join(normalized, 'plotpilot_embedded_boot.py')) ? normalized : undefined
}

function packagedPlotPilotProjectRootCandidates(): string[] {
  const roots: string[] = []
  for (const base of resourcesBaseCandidates()) {
    roots.push(
      join(base, 'plotpilot'),
      join(base, 'plotpilot', 'source'),
      join(base, 'sidecars', 'plotpilot'),
      join(base, 'sidecars', 'plotpilot', 'source'),
    )
  }
  return Array.from(new Set(roots))
}

function isPlotPilotProjectRoot(candidate: string): boolean {
  return existsSync(join(candidate, 'interfaces', 'main.py'))
}

export function resolveDefaultPlotPilotProjectRoot(): string {
  if (process.env.PLOTPILOT_PROJECT_ROOT) return process.env.PLOTPILOT_PROJECT_ROOT
  const candidates = [
    ...packagedPlotPilotProjectRootCandidates(),
    ...PLOTPILOT_PROJECT_ROOT_CANDIDATES,
  ]
  return candidates.find(isPlotPilotProjectRoot)
    ?? candidates.find((candidate) => existsSync(candidate))
    ?? DEFAULT_PLOTPILOT_PROJECT_ROOT
}

function venvPythonPath(root: string): string {
  return process.platform === 'win32'
    ? join(root, '.venv', 'Scripts', 'python.exe')
    : join(root, '.venv', 'bin', 'python')
}

function bundledUvCandidates(): string[] {
  const uvName = process.platform === 'win32' ? 'uv.exe' : 'uv'
  const platformArch = `${process.platform}-${process.arch}`
  return resourcesBaseCandidates().flatMap((base) => [
    join(base, 'bin', platformArch, uvName),
    join(base, 'resources', 'bin', platformArch, uvName),
    join(base, 'app', 'resources', 'bin', platformArch, uvName),
  ])
}

function isUvExecutable(command: string): boolean {
  const name = basename(command).toLowerCase()
  return name === 'uv' || name === 'uv.exe'
}

function resolveEmbeddedBootPath(): string {
  for (const candidate of explicitEmbeddedBootPathCandidates()) {
    const explicitDir = embeddedBootDirFromExplicitPath(candidate)
    if (explicitDir) return explicitDir
  }

  const candidates = [
    join(MODULE_DIR, 'resources'),
    join(MODULE_DIR, '..', 'resources'),
    join(MODULE_DIR, '..', '..', 'resources'),
    join(MODULE_DIR, '..', '..', '..', 'apps', 'electron', 'resources'),
    join(MODULE_DIR, '..', '..', '..', '..', 'apps', 'electron', 'resources'),
    ...resourcesBaseCandidates(),
    join(process.cwd(), '..', 'electron', 'resources'),
    join(process.cwd(), '..', '..', 'apps', 'electron', 'resources'),
    join(process.cwd(), 'apps', 'electron', 'resources'),
  ]
  return candidates.find((candidate) => existsSync(join(candidate, 'plotpilot_embedded_boot.py')))
    ?? join(process.cwd(), 'apps', 'electron', 'resources')
}

function prependPythonPath(pathEntry: string, current = process.env.PYTHONPATH ?? ''): string {
  const entries = [pathEntry, ...current.split(delimiter)]
    .map((entry) => entry.trim())
    .filter(Boolean)
  return Array.from(new Set(entries)).join(delimiter)
}

export function resolveDefaultPlotPilotPythonExe(projectRoot: string): string {
  if (process.env.PLOTPILOT_PYTHON_EXE) return process.env.PLOTPILOT_PYTHON_EXE

  const packagedPythonCandidates = [
    venvPythonPath(projectRoot),
    ...packagedPlotPilotProjectRootCandidates().flatMap((candidateRoot) => [
      venvPythonPath(candidateRoot),
      process.platform === 'win32'
        ? join(candidateRoot, 'python', 'python.exe')
        : join(candidateRoot, 'python', 'bin', 'python'),
      process.platform === 'win32'
        ? join(candidateRoot, '..', 'python', 'python.exe')
        : join(candidateRoot, '..', 'python', 'bin', 'python'),
    ]),
  ]

  for (const candidatePython of Array.from(new Set(packagedPythonCandidates))) {
    if (existsSync(candidatePython)) return candidatePython
  }

  for (const candidateRoot of PLOTPILOT_PROJECT_ROOT_CANDIDATES) {
    const candidatePython = venvPythonPath(candidateRoot)
    if (existsSync(candidatePython)) return candidatePython
  }

  for (const candidateUv of Array.from(new Set(bundledUvCandidates()))) {
    if (existsSync(candidateUv)) return candidateUv
  }

  return 'python'
}

async function defaultExecFile(file: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const result = await nodeExecFileAsync(file, args, { windowsHide: true })
  return {
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
}

async function defaultIsPortAvailable(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port, '127.0.0.1')
  })
}

function defaultSpawnProcess(
  command: string,
  args: string[],
  options: PlotPilotSpawnOptions,
): PlotPilotChildProcess {
  return nodeSpawn(command, args, options) as ChildProcess
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function pickFreePlotPilotPort(
  start = DEFAULT_PORT_START,
  limit = DEFAULT_PORT_SCAN_LIMIT,
  isPortAvailable: (port: number) => boolean | Promise<boolean> = defaultIsPortAvailable,
): Promise<number> {
  for (let port = start; port < start + limit; port += 1) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error(`No free PlotPilot port found in ${start}-${start + limit - 1}`)
}

export class PlotPilotRuntimeManager {
  private projectRoot: string
  private dataDir: string
  private pythonExe: string
  private readonly portStart: number
  private readonly portScanLimit: number
  private readonly healthTimeoutMs: number
  private readonly requestTimeoutMs: number
  private readonly shutdownTimeoutMs: number
  private readonly pollIntervalMs: number
  private readonly maxLogEntries: number
  private readonly deps: Required<PlotPilotRuntimeDeps>

  private child: PlotPilotChildProcess | undefined
  private port: number | undefined
  private state: PlotPilotRuntimeState = 'stopped'
  private healthy = false
  private startedAt: string | undefined
  private lastExitCode: number | null | undefined
  private lastExitSignal: NodeJS.Signals | null | undefined
  private lastError: string | undefined
  private adopted = false
  private health: PlmHealth | undefined
  private startInFlight: Promise<PlotPilotRuntimeStatus> | undefined
  private readonly logs: PlotPilotLogEntry[] = []

  constructor(options: PlotPilotRuntimeOptions = {}) {
    const deps = options.deps ?? {}
    this.projectRoot = options.projectRoot ?? resolveDefaultPlotPilotProjectRoot()
    this.dataDir = options.dataDir ?? resolveDefaultDataDir()
    this.pythonExe = options.pythonExe ?? resolveDefaultPlotPilotPythonExe(this.projectRoot)
    this.portStart = options.portStart ?? DEFAULT_PORT_START
    this.portScanLimit = options.portScanLimit ?? DEFAULT_PORT_SCAN_LIMIT
    this.healthTimeoutMs = options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
    this.maxLogEntries = Math.max(1, options.maxLogEntries ?? DEFAULT_MAX_LOG_ENTRIES)
    this.deps = {
      spawnProcess: deps.spawnProcess ?? defaultSpawnProcess,
      execFile: deps.execFile ?? defaultExecFile,
      fetch: deps.fetch ?? this.resolveGlobalFetch(),
      isPortAvailable: deps.isPortAvailable ?? defaultIsPortAvailable,
      platform: deps.platform ?? process.platform,
      now: deps.now ?? (() => new Date()),
    }
  }

  async start(options: PlotPilotStartOptions = {}): Promise<PlotPilotRuntimeStatus> {
    if (options.projectRoot) {
      this.projectRoot = options.projectRoot
      if (!options.pythonExe && !process.env.PLOTPILOT_PYTHON_EXE) {
        this.pythonExe = resolveDefaultPlotPilotPythonExe(this.projectRoot)
      }
    }
    if (options.dataDir) this.dataDir = options.dataDir
    if (options.pythonExe) this.pythonExe = options.pythonExe

    if (this.startInFlight) return await this.startInFlight
    if (this.child && !this.hasExited(this.child)) {
      if (!this.healthy && this.port) {
        this.healthy = await this.refreshHealth(this.port)
      }
      this.state = this.healthy ? 'running' : this.state
      return this.currentStatus()
    }
    if (this.adopted && this.port) {
      this.healthy = await this.refreshHealth(this.port)
      if (this.healthy) {
        this.state = 'running'
        return this.currentStatus()
      }
      this.markStopped()
    }

    if (options.preferExisting !== false) {
      const existingPort = await this.findExistingHealthyPort()
      if (existingPort !== undefined) {
        this.port = existingPort
        this.adopted = true
        this.healthy = true
        this.state = 'running'
        this.startedAt = undefined
        this.appendLog('system', `Adopted existing PlotPilot runtime on 127.0.0.1:${existingPort}`)
        return this.currentStatus()
      }
    }

    this.startInFlight = this.startSidecar()
    try {
      return await this.startInFlight
    } finally {
      this.startInFlight = undefined
    }
  }

  async stop(options: PlotPilotStopOptions = {}): Promise<PlotPilotRuntimeStatus> {
    if (this.adopted && !options.forceAdopted) {
      this.appendLog('system', 'Detached from adopted PlotPilot runtime without stopping it')
      this.markStopped()
      return this.currentStatus()
    }

    const child = this.child
    if (!child || this.hasExited(child)) {
      if (this.adopted && options.forceAdopted && this.port) {
        try {
          await this.requestShutdown(this.port)
        } catch (error) {
          this.appendLog('system', `Adopted PlotPilot shutdown failed: ${normalizeError(error)}`)
        }
      }
      this.markStopped()
      return this.currentStatus()
    }

    this.state = 'stopping'
    this.healthy = false

    const timeoutMs = options.timeoutMs ?? this.shutdownTimeoutMs

    if (!options.skipShutdownRequest && this.port) {
      try {
        await this.requestShutdown(this.port)
      } catch (error) {
        this.lastError = `Graceful PlotPilot shutdown failed: ${normalizeError(error)}`
        this.appendLog('system', this.lastError)
        await this.forceKill(child)
        return this.currentStatus()
      }

      if (this.deps.platform === 'win32') {
        const exitedAfterShutdown = await this.waitForExit(child, Math.min(timeoutMs, 1_000))
        if (!exitedAfterShutdown) {
          this.appendLog('system', 'PlotPilot did not exit promptly after shutdown request; cleaning up Windows process tree')
          await this.forceKill(child)
          return this.currentStatus()
        }
        if (this.child === child) {
          this.markStopped()
        }
        return this.currentStatus()
      }
    }

    const exited = await this.waitForExit(child, timeoutMs)
    if (!exited) {
      this.lastError = `PlotPilot sidecar did not exit within ${timeoutMs}ms`
      this.appendLog('system', this.lastError)
      await this.forceKill(child)
    } else if (this.child === child) {
      this.markStopped()
    }

    return this.currentStatus()
  }

  async restart(options: PlotPilotStartOptions = {}): Promise<PlotPilotRuntimeStatus> {
    await this.stop({ forceAdopted: true })
    return await this.start({ ...options, preferExisting: options.preferExisting ?? false })
  }

  async status(options: { checkHealth?: boolean } = {}): Promise<PlotPilotRuntimeStatus> {
    if (this.adopted && this.port) {
      if (options.checkHealth) {
        this.healthy = await this.refreshHealth(this.port)
      }
      if (!this.healthy) {
        this.markStopped()
      } else {
        this.state = 'running'
      }
      return this.currentStatus()
    }

    if (!this.child || this.hasExited(this.child)) {
      this.markStopped()
      return this.currentStatus()
    }

    if (options.checkHealth && this.port) {
      this.healthy = await this.refreshHealth(this.port)
    }

    if (this.healthy && this.state !== 'stopping') {
      this.state = 'running'
    }
    return this.currentStatus()
  }

  getStatus(): PlotPilotRuntimeStatus {
    if (!this.child || this.hasExited(this.child)) {
      this.markStopped()
    }
    return this.currentStatus()
  }

  getLogs(limit?: number): PlotPilotLogEntry[] {
    const entries = limit === undefined ? this.logs : this.logs.slice(-Math.max(0, limit))
    return entries.map((entry) => ({ ...entry }))
  }

  private async startSidecar(): Promise<PlotPilotRuntimeStatus> {
    this.state = 'starting'
    this.healthy = false
    this.lastError = undefined
    this.lastExitCode = undefined
    this.lastExitSignal = undefined

    const port = await pickFreePlotPilotPort(
      this.portStart,
      this.portScanLimit,
      this.deps.isPortAvailable,
    )
    const logFile = join(this.dataDir, 'logs', 'plotpilot.log')
    mkdirSync(join(this.dataDir, 'logs'), { recursive: true })

    const pythonArgs = [
      '-m',
      'uvicorn',
      EMBEDDED_BOOT_MODULE,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--log-level',
      'info',
    ]
    const args = isUvExecutable(this.pythonExe)
      ? [
          'run',
          '--project',
          this.projectRoot,
          '--python',
          '3.11',
          'python',
          ...pythonArgs,
        ]
      : pythonArgs
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1',
      HF_HUB_OFFLINE: '1',
      TRANSFORMERS_OFFLINE: '1',
      HF_DATASETS_OFFLINE: '1',
      PLOTPILOT_EMBEDDED_RUNTIME: '1',
      PLOTPILOT_SKIP_ORPHAN_CLEANUP: '1',
      PLOTPILOT_SKIP_PROCESS_CLEANUP: '1',
      PLOTPILOT_PROD_DATA_DIR: this.dataDir,
      AITEXT_PROD_DATA_DIR: this.dataDir,
      LOG_FILE: logFile,
      PYTHONPATH: prependPythonPath(resolveEmbeddedBootPath()),
    }
    const spawnOptions: PlotPilotSpawnOptions = {
      cwd: this.projectRoot,
      env,
      stdio: 'pipe',
      windowsHide: true,
    }

    this.appendLog('system', `Starting PlotPilot sidecar on 127.0.0.1:${port}`)
    let child: PlotPilotChildProcess
    try {
      child = this.deps.spawnProcess(this.pythonExe, args, spawnOptions)
    } catch (error) {
      this.lastError = `Failed to spawn PlotPilot sidecar: ${normalizeError(error)}`
      this.state = 'error'
      this.appendLog('system', this.lastError)
      throw new Error(this.lastError)
    }

    this.child = child
    this.port = port
    this.adopted = false
    this.startedAt = this.deps.now().toISOString()

    this.attachProcessHandlers(child)
    this.attachLogDrain(child.stdout, 'stdout')
    this.attachLogDrain(child.stderr, 'stderr')

    try {
      await this.waitForHealth(port, this.healthTimeoutMs)
      if (this.child !== child || this.hasExited(child)) {
        throw new Error('PlotPilot sidecar exited before health check completed')
      }
      this.healthy = true
      this.state = 'running'
      return this.currentStatus()
    } catch (error) {
      this.lastError = `PlotPilot health check failed: ${normalizeError(error)}`
      this.appendLog('system', this.lastError)
      await this.stop({ timeoutMs: 1_000, skipShutdownRequest: true })
      this.state = 'error'
      throw new Error(this.lastError)
    }
  }

  private attachProcessHandlers(child: PlotPilotChildProcess): void {
    child.once('exit', (code, signal) => {
      this.lastExitCode = typeof code === 'number' ? code : null
      this.lastExitSignal = typeof signal === 'string' ? signal as NodeJS.Signals : null
      this.appendLog(
        'system',
        `PlotPilot sidecar exited code=${this.lastExitCode ?? 'null'} signal=${this.lastExitSignal ?? 'null'}`,
      )

      if (this.child === child) {
        this.markStopped()
      }
    })

    child.once('error', (error) => {
      this.lastError = `PlotPilot sidecar process error: ${normalizeError(error)}`
      this.appendLog('system', this.lastError)
      if (this.child === child) {
        this.state = 'error'
        this.healthy = false
      }
    })
  }

  private attachLogDrain(stream: NodeJS.ReadableStream | null | undefined, source: PlotPilotLogStream): void {
    if (!stream) return
    stream.setEncoding?.('utf8')
    stream.on('data', (chunk) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      for (const line of normalized.split('\n')) {
        if (line.length > 0) {
          this.appendLog(source, line)
        }
      }
    })
    stream.on('error', (error) => {
      this.appendLog('system', `PlotPilot ${source} stream error: ${normalizeError(error)}`)
    })
  }

  private async waitForHealth(port: number, timeoutMs: number): Promise<void> {
    const url = `http://127.0.0.1:${port}/health`
    const deadline = Date.now() + timeoutMs
    let lastFailure = 'timed out'

    while (Date.now() <= deadline) {
      if (!this.child || this.hasExited(this.child)) {
        throw new Error('process exited')
      }

      try {
        const response = await this.fetchWithTimeout(url, { method: 'GET' })
        if (response.ok) return
        lastFailure = `HTTP ${response.status}`
      } catch (error) {
        lastFailure = normalizeError(error)
      }

      await delay(this.pollIntervalMs)
    }

    throw new Error(lastFailure)
  }

  private async requestShutdown(port: number): Promise<void> {
    const url = `http://127.0.0.1:${port}/internal/shutdown`
    const response = await this.fetchWithTimeout(url, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  }

  private async refreshHealth(port: number): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`http://127.0.0.1:${port}/health`, { method: 'GET' })
      if (response.ok) {
        const health = await response.json().catch(() => undefined)
        this.health = isPlmHealth(health) ? health : undefined
      }
      return response.ok
    } catch {
      return false
    }
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    try {
      return await this.deps.fetch(url, {
        ...init,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  private async forceKill(child: PlotPilotChildProcess): Promise<void> {
    const pid = child.pid
    if (this.deps.platform === 'win32' && pid !== undefined) {
      try {
        await this.deps.execFile('taskkill', ['/F', '/T', '/PID', String(pid)])
        this.appendLog('system', `taskkill requested for PlotPilot PID ${pid}`)
      } catch (error) {
        this.appendLog('system', `taskkill failed for PlotPilot PID ${pid}: ${normalizeError(error)}`)
      }
    }

    if (!this.hasExited(child)) {
      try {
        child.kill('SIGKILL')
      } catch (error) {
        this.appendLog('system', `PlotPilot child.kill failed: ${normalizeError(error)}`)
      }
      await this.waitForExit(child, 1_000)
    }

    if (this.child === child) {
      this.markStopped()
    }
  }

  private async waitForExit(child: PlotPilotChildProcess, timeoutMs: number): Promise<boolean> {
    if (this.hasExited(child)) return true

    return await new Promise((resolve) => {
      const done = (exited: boolean) => {
        clearTimeout(timer)
        child.removeListener('exit', onExit)
        child.removeListener('close', onExit)
        resolve(exited)
      }
      const onExit = () => done(true)
      const timer = setTimeout(() => done(false), Math.max(0, timeoutMs))

      child.once('exit', onExit)
      child.once('close', onExit)
    })
  }

  private hasExited(child: PlotPilotChildProcess): boolean {
    return child.exitCode !== null && child.exitCode !== undefined
  }

  private markStopped(): void {
    this.child = undefined
    this.port = undefined
    this.startedAt = undefined
    this.healthy = false
    this.adopted = false
    this.health = undefined
    this.state = 'stopped'
  }

  private currentStatus(): PlotPilotRuntimeStatus {
    const pid = this.child?.pid
    const baseUrl = this.port ? `http://127.0.0.1:${this.port}` : undefined
    return {
      state: this.state,
      healthy: this.healthy,
      port: this.port,
      pid,
      url: baseUrl,
      baseUrl,
      apiBaseUrl: baseUrl ? `${baseUrl}/api/v1` : undefined,
      startedAt: this.startedAt,
      owned: !!this.child,
      adopted: this.adopted,
      projectRoot: this.projectRoot,
      dataDir: this.dataDir,
      lastExitCode: this.lastExitCode,
      lastExitSignal: this.lastExitSignal,
      lastError: this.lastError,
      error: this.lastError,
      health: this.health,
    }
  }

  private appendLog(stream: PlotPilotLogStream, message: string): void {
    this.logs.push({
      timestamp: this.deps.now().toISOString(),
      stream,
      message,
      line: message,
    })

    if (this.logs.length > this.maxLogEntries) {
      this.logs.splice(0, this.logs.length - this.maxLogEntries)
    }
  }

  private resolveGlobalFetch(): (input: string, init?: RequestInit) => Promise<Response> {
    if (typeof globalThis.fetch !== 'function') {
      throw new Error('PlotPilotRuntimeManager requires global fetch or deps.fetch')
    }
    return (input, init) => globalThis.fetch(input, init)
  }

  private async findExistingHealthyPort(): Promise<number | undefined> {
    for (let port = this.portStart; port < this.portStart + this.portScanLimit; port += 1) {
      if (await this.refreshHealth(port)) {
        return port
      }
    }
    this.health = undefined
    return undefined
  }
}

function isPlmHealth(value: unknown): value is PlmHealth {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Partial<PlmHealth>).status === 'string'
}
