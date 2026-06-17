import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { EventEmitter } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { PassThrough } from 'node:stream'
import {
  PlotPilotRuntimeManager,
  PLOTPILOT_PROJECT_ROOT_CANDIDATES,
  type PlotPilotRuntimeDeps,
  type PlotPilotSpawnOptions,
  resolveDefaultPlotPilotPythonExe,
} from '../plotpilot-runtime'

class FakeChildProcess extends EventEmitter {
  readonly stdout = new PassThrough()
  readonly stderr = new PassThrough()
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  killed = false

  constructor(readonly pid: number) {
    super()
  }

  kill = mock((signal?: NodeJS.Signals | number) => {
    this.killed = true
    this.signalCode = typeof signal === 'string' ? signal : null
    this.exitCode = 1
    queueMicrotask(() => {
      this.emit('exit', this.exitCode, this.signalCode)
      this.emit('close', this.exitCode, this.signalCode)
    })
    return true
  })

  exit(code = 0): void {
    this.exitCode = code
    queueMicrotask(() => {
      this.emit('exit', code, null)
      this.emit('close', code, null)
    })
  }
}

describe('PlotPilotRuntimeManager', () => {
  let tempDir: string
  let projectRoot: string
  let dataDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'plotpilot-runtime-test-'))
    projectRoot = join(tempDir, 'PlotPilot-plm')
    dataDir = join(tempDir, 'data')
    mkdirSync(projectRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('prefers the v4.6 PlotPilot port when resolving bundled project roots', () => {
    expect(PLOTPILOT_PROJECT_ROOT_CANDIDATES[0]).toContain('PlotPilot-plm-v46-read')
  })

  it('spawns uvicorn with the selected port and PlotPilot production env', async () => {
    const children: FakeChildProcess[] = []
    const spawnCalls: Array<{
      command: string
      args: string[]
      options: PlotPilotSpawnOptions
    }> = []
    const fetchCalls: Array<{ url: string; method: string }> = []

    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: mock((port: number) => port === 8006),
      spawnProcess: mock((command, args, options) => {
        spawnCalls.push({ command, args, options })
        const child = new FakeChildProcess(4100 + children.length)
        children.push(child)
        return child
      }),
      fetch: mock(async (input, init) => {
        fetchCalls.push({
          url: String(input),
          method: init?.method ?? 'GET',
        })
        return new Response('{"status":"healthy"}', { status: 200 })
      }),
    }

    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      pythonExe: join(tempDir, 'python.exe'),
      deps,
    })

    const status = await manager.start({ preferExisting: false })

    expect(status.state).toBe('running')
    expect(status.port).toBe(8006)
    expect(spawnCalls).toHaveLength(1)
    expect(spawnCalls[0].command).toBe(join(tempDir, 'python.exe'))
    expect(spawnCalls[0].args).toEqual([
      '-m',
      'uvicorn',
      'plotpilot_embedded_boot:app',
      '--host',
      '127.0.0.1',
      '--port',
      '8006',
      '--log-level',
      'info',
    ])
    expect(spawnCalls[0].options.cwd).toBe(projectRoot)
    expect(spawnCalls[0].options.windowsHide).toBe(true)
    expect(spawnCalls[0].options.env.PYTHONIOENCODING).toBe('utf-8')
    expect(spawnCalls[0].options.env.PYTHONUNBUFFERED).toBe('1')
    expect(spawnCalls[0].options.env.HF_HUB_OFFLINE).toBe('1')
    expect(spawnCalls[0].options.env.TRANSFORMERS_OFFLINE).toBe('1')
    expect(spawnCalls[0].options.env.HF_DATASETS_OFFLINE).toBe('1')
    expect(spawnCalls[0].options.env.PLOTPILOT_EMBEDDED_RUNTIME).toBe('1')
    expect(spawnCalls[0].options.env.PLOTPILOT_SKIP_ORPHAN_CLEANUP).toBe('1')
    expect(spawnCalls[0].options.env.PLOTPILOT_SKIP_PROCESS_CLEANUP).toBe('1')
    expect(spawnCalls[0].options.env.PYTHONPATH).toContain('resources')
    expect(spawnCalls[0].options.env.PYTHONPATH).toContain(join('packages', 'drama-plm', 'resources'))
    expect(spawnCalls[0].options.env.PLOTPILOT_PROD_DATA_DIR).toBe(dataDir)
    expect(spawnCalls[0].options.env.AITEXT_PROD_DATA_DIR).toBe(dataDir)
    expect(spawnCalls[0].options.env.LOG_FILE).toBe(join(dataDir, 'logs', 'plotpilot.log'))
    expect(fetchCalls).toEqual([{ url: 'http://127.0.0.1:8006/health', method: 'GET' }])
  })

  it('uses an explicit packaged boot shim path for the PlotPilot Python path', async () => {
    const previousBootShim = process.env.DRAMA_PLOTPILOT_BOOT_SHIM
    const packagedResourcesDir = join(tempDir, 'zen-drama-package', 'resources')
    mkdirSync(packagedResourcesDir, { recursive: true })
    writeFileSync(join(packagedResourcesDir, 'plotpilot_embedded_boot.py'), '')
    process.env.DRAMA_PLOTPILOT_BOOT_SHIM = join(packagedResourcesDir, 'plotpilot_embedded_boot.py')

    const spawnCalls: PlotPilotSpawnOptions[] = []
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      spawnProcess: (_command, _args, options) => {
        spawnCalls.push(options)
        return new FakeChildProcess(4150)
      },
      fetch: async () => new Response('{"status":"healthy"}', { status: 200 }),
    }

    try {
      const manager = new PlotPilotRuntimeManager({
        projectRoot,
        dataDir,
        pythonExe: join(tempDir, 'python.exe'),
        deps,
      })

      await manager.start({ preferExisting: false })

      expect(spawnCalls).toHaveLength(1)
      expect(spawnCalls[0].env.PYTHONPATH?.split(delimiter)[0]).toBe(packagedResourcesDir)
    } finally {
      if (previousBootShim === undefined) {
        delete process.env.DRAMA_PLOTPILOT_BOOT_SHIM
      } else {
        process.env.DRAMA_PLOTPILOT_BOOT_SHIM = previousBootShim
      }
    }
  })

  it('continues draining stdout and stderr while retaining only recent log entries', async () => {
    const children: FakeChildProcess[] = []
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      spawnProcess: (_command, _args, _options) => {
        const child = new FakeChildProcess(4200 + children.length)
        children.push(child)
        return child
      },
      fetch: async () => new Response('{"status":"healthy"}', { status: 200 }),
    }
    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      maxLogEntries: 3,
      deps,
    })

    await manager.start({ preferExisting: false })
    children[0].stdout.write('stdout one\nstdout two\n')
    children[0].stderr.write('stderr three\nstderr four\n')
    await new Promise((resolve) => setImmediate(resolve))

    expect(manager.getLogs().map((entry) => `${entry.stream}:${entry.message}`)).toEqual([
      'stdout:stdout two',
      'stderr:stderr three',
      'stderr:stderr four',
    ])
  })

  it('posts internal shutdown and falls back to Windows taskkill when graceful shutdown fails', async () => {
    const children: FakeChildProcess[] = []
    const fetchCalls: Array<{ url: string; method: string }> = []
    const execCalls: Array<{ file: string; args: string[] }> = []
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      platform: 'win32',
      spawnProcess: () => {
        const child = new FakeChildProcess(4300)
        children.push(child)
        return child
      },
      fetch: async (input, init) => {
        fetchCalls.push({
          url: String(input),
          method: init?.method ?? 'GET',
        })
        if (String(input).endsWith('/internal/shutdown')) {
          throw new Error('shutdown route unavailable')
        }
        return new Response('{"status":"healthy"}', { status: 200 })
      },
      execFile: mock(async (file, args) => {
        execCalls.push({ file, args })
        return { stdout: '', stderr: '' }
      }),
    }
    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      shutdownTimeoutMs: 5,
      pollIntervalMs: 1,
      deps,
    })

    await manager.start({ preferExisting: false })
    await manager.stop()

    expect(fetchCalls).toContainEqual({
      url: 'http://127.0.0.1:8005/internal/shutdown',
      method: 'POST',
    })
    expect(execCalls).toEqual([
      { file: 'taskkill', args: ['/F', '/T', '/PID', '4300'] },
    ])
    expect(children[0].kill).toHaveBeenCalled()
    expect((await manager.status()).state).toBe('stopped')
  })

  it('cleans up the Windows process tree when successful shutdown leaves PlotPilot running', async () => {
    const execCalls: Array<{ file: string; args: string[] }> = []
    const child = new FakeChildProcess(4350)
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      platform: 'win32',
      spawnProcess: () => child,
      fetch: async () => new Response('{"status":"healthy"}', { status: 200 }),
      execFile: mock(async (file, args) => {
        execCalls.push({ file, args })
        return { stdout: '', stderr: '' }
      }),
    }
    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      shutdownTimeoutMs: 5,
      deps,
    })

    await manager.start({ preferExisting: false })
    const stopped = await manager.stop()

    expect(execCalls).toEqual([
      { file: 'taskkill', args: ['/F', '/T', '/PID', '4350'] },
    ])
    expect(child.kill).toHaveBeenCalled()
    expect(stopped.state).toBe('stopped')
  })

  it('detaches from adopted runtime by default', async () => {
    const fetchCalls: Array<{ url: string; method: string }> = []
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      spawnProcess: () => {
        throw new Error('should not spawn when existing healthy runtime is available')
      },
      fetch: async (input, init) => {
        fetchCalls.push({
          url: String(input),
          method: init?.method ?? 'GET',
        })
        return new Response('{"status":"ok"}', { status: 200 })
      },
    }
    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      deps,
    })

    const adoptedStatus = await manager.start()
    expect(adoptedStatus.owned).toBe(false)
    expect(adoptedStatus.adopted).toBe(true)

    const stoppedStatus = await manager.stop()
    expect(stoppedStatus.owned).toBe(false)
    expect(stoppedStatus.adopted).toBe(false)
    expect(fetchCalls.some((entry) => entry.url.endsWith('/internal/shutdown'))).toBe(false)
  })

  it('stops adopted runtime when forced during shutdown', async () => {
    const fetchCalls: Array<{ url: string; method: string }> = []
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      spawnProcess: () => {
        throw new Error('should not spawn when existing healthy runtime is available')
      },
      fetch: async (input, init) => {
        fetchCalls.push({
          url: String(input),
          method: init?.method ?? 'GET',
        })
        return new Response('{"status":"ok"}', { status: 200 })
      },
    }
    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      deps,
    })

    await manager.start()
    const stoppedStatus = await manager.stop({ forceAdopted: true })
    expect(stoppedStatus.owned).toBe(false)
    expect(stoppedStatus.adopted).toBe(false)
    expect(fetchCalls).toContainEqual({
      url: 'http://127.0.0.1:8005/internal/shutdown',
      method: 'POST',
    })
  })

  it('restarts by stopping the previous sidecar and launching a new process', async () => {
    const children: FakeChildProcess[] = []
    const deps: PlotPilotRuntimeDeps = {
      isPortAvailable: () => true,
      spawnProcess: () => {
        const child = new FakeChildProcess(4400 + children.length)
        children.push(child)
        return child
      },
      fetch: async (input, init) => {
        if (String(input).endsWith('/internal/shutdown') && init?.method === 'POST') {
          children[0].exit(0)
        }
        return new Response('{"status":"healthy"}', { status: 200 })
      },
    }
    const manager = new PlotPilotRuntimeManager({
      projectRoot,
      dataDir,
      deps,
    })

    await manager.start({ preferExisting: false })
    const restarted = await manager.restart()

    expect(children).toHaveLength(2)
    expect(children[0].exitCode).toBe(0)
    expect(restarted.state).toBe('running')
    expect(restarted.pid).toBe(4401)
  })

  it('prefers a project local virtualenv Python over the system Python', () => {
    const venvPython = process.platform === 'win32'
      ? join(projectRoot, '.venv', 'Scripts', 'python.exe')
      : join(projectRoot, '.venv', 'bin', 'python')
    mkdirSync(join(venvPython, '..'), { recursive: true })
    writeFileSync(venvPython, '')

    expect(resolveDefaultPlotPilotPythonExe(projectRoot)).toBe(venvPython)
  })
})
