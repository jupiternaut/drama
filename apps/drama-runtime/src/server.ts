import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createEmptyDramaGraph, type DramaChapter, type DramaGraph } from '@drama/core'
import {
  createSkillCrewAgentOutputEvent,
  createSkillCrewSuggestionEvent,
  createSkillCrewTaskBindingDeleteEvent,
  createSkillCrewTaskBindingUpsertEvent,
} from '@drama/crew'
import { isDramaGraph } from '@drama/graph'
import { DramaGraphStore, recordDramaProjectFile } from '@drama/graph/node-store'
import type {
  DramaGraphDraftUpsertRequest,
  DramaGraphEdgeCreateRequest,
  DramaGraphEdgeDeleteRequest,
  DramaGraphEdgeUpdateRequest,
  DramaGraphEventRecordRequest,
  DramaGraphHistoryRequest,
  DramaGraphLoadOptions,
  DramaGraphLoadResult,
  DramaGraphMutationResult,
  DramaGraphNodeCreateRequest,
  DramaGraphNodeDeleteRequest,
  DramaGraphNodePositionUpdateRequest,
  DramaGraphNodeUpdateRequest,
  DramaGraphRestoreBackupRequest,
  DramaGraphTaskBindingDeleteRequest,
  DramaGraphTaskBindingUpsertRequest,
  DramaProjectFileRecordRequest,
} from '@drama/graph/ipc-contract'
import {
  createPlotPilotClient,
  type PlotPilotCodexLoginStartResponse,
  type PlotPilotCodexLogoutResponse,
  type PlotPilotCodexStatusResponse,
} from '@drama/plm'
import {
  PlotPilotRuntimeManager,
  type PlotPilotStartOptions,
  type PlotPilotStopOptions,
} from '@drama/plm/runtime-manager'

type RuntimeRpcRequest = {
  channel?: unknown
  payload?: unknown
}

type RuntimeErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'RUNTIME_ERROR'
  | 'UNSUPPORTED_CHANNEL'

interface RuntimePlmChapterWritebackRequest {
  graphId?: string
  chapterId?: string
  chapterNumber?: number
  title?: string
  content: string
  status?: 'draft' | 'revision' | 'final'
}

interface RuntimeCrewSuggestionRequest {
  graphId?: string
  nodeId?: string
  edgeId?: string
  agentId?: string
  crewId?: string
  title: string
  body: string
  patch?: Record<string, unknown>
}

interface RuntimeCrewAgentOutputRequest {
  graphId?: string
  nodeId?: string
  edgeId?: string
  taskId?: string
  agentId?: string
  crewId?: string
  roomId?: string
  title?: string
  body: string
  outputType?: 'message' | 'observation' | 'proposal' | 'error'
  artifacts?: Array<Record<string, unknown>>
}

interface RuntimeShutdownRequest {
  stopPlotPilot?: boolean
}

const startedAt = new Date().toISOString()
const port = Number(process.env.DRAMA_RUNTIME_PORT ?? 3198)
const host = process.env.DRAMA_RUNTIME_HOST ?? '127.0.0.1'
const moduleDir = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = process.env.DRAMA_WORKSPACE_ROOT
  ?? process.env.CRAFT_WORKSPACE_ROOT
  ?? join(homedir(), '.craft-agent', 'workspaces', 'my-workspace')
const browserShellDistDir = resolveBrowserShellDistDir()
const runtimePackageRoot = process.env.DRAMA_RUNTIME_PACKAGE_ROOT ?? null

const store = new DramaGraphStore({ workspaceRoot })
const plotPilotRuntime = new PlotPilotRuntimeManager()

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

function errorResponse(status: number, code: RuntimeErrorCode, message: string, details?: unknown): Response {
  return json({
    ok: false,
    error: { code, message, details },
  }, { status })
}

function mutationResult(
  graph: DramaGraphMutationResult['graph'],
  result: { path: string; backupPath?: string },
): DramaGraphMutationResult {
  return {
    graph,
    path: result.path,
    backupPath: result.backupPath,
  }
}

function runtimeStatus() {
  return {
    state: 'ready',
    version: '0.1.0',
    message: 'Drama standalone runtime ready.',
    updatedAt: new Date().toISOString(),
    workspaceRoot,
    startedAt,
    runtimePackageRoot,
    browserShellDistDir,
    plmRuntime: plotPilotRuntime.getStatus(),
    endpoints: {
      graph: `http://${host}:${port}/graph`,
      plm: `http://${host}:${port}/plm/runtime/status`,
      crew: `http://${host}:${port}/crew`,
      app: `http://${host}:${port}/app`,
      events: `ws://${host}:${port}/events`,
    },
  }
}

function resolveBrowserShellDistDir(): string {
  if (process.env.DRAMA_BROWSER_SHELL_DIST) return process.env.DRAMA_BROWSER_SHELL_DIST

  const candidates = [
    join(moduleDir, '..', '..', 'drama-browser-shell', 'dist'),
    join(process.cwd(), '..', 'drama-browser-shell', 'dist'),
    join(process.cwd(), 'apps', 'drama-browser-shell', 'dist'),
  ]

  return candidates.find((candidate) => existsSync(join(candidate, 'index.html')))
    ?? candidates[0]
}

function contentTypeFor(pathname: string): string {
  switch (extname(pathname).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.ico':
      return 'image/x-icon'
    case '.json':
      return 'application/json; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

function isInsideDir(parent: string, candidate: string): boolean {
  const normalizedParent = resolve(parent)
  const normalizedCandidate = resolve(candidate)
  return normalizedCandidate === normalizedParent || normalizedCandidate.startsWith(`${normalizedParent}${sep}`)
}

async function serveBrowserShell(url: URL): Promise<Response | null> {
  const pathname = decodeURIComponent(url.pathname)
  const distDir = browserShellDistDir
  const indexPath = join(distDir, 'index.html')

  if (pathname === '/') {
    const requestedSurface = url.searchParams.get('surface')
    const surface = requestedSurface === 'graph' || requestedSurface === 'crew' || requestedSurface === 'plm'
      ? requestedSurface
      : 'plm'
    const runtimeUrl = `${url.protocol}//${url.host}`
    return new Response(null, {
      status: 302,
      headers: {
        location: `/app/${surface}?host=zen&runtime=${encodeURIComponent(runtimeUrl)}`,
        'cache-control': 'no-store',
      },
    })
  }

  if (pathname === '/favicon.ico' || pathname === '/app/favicon.ico') {
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'public, max-age=86400',
      },
    })
  }

  if (!existsSync(indexPath)) {
    if (pathname === '/app' || pathname.startsWith('/app/')) {
      return errorResponse(
        503,
        'RUNTIME_ERROR',
        'Drama browser shell build is missing. Run `bun run browser-shell:build` or set DRAMA_BROWSER_SHELL_DIST.',
        { browserShellDistDir: distDir },
      )
    }
    return null
  }

  if (pathname === '/app' || pathname === '/app/' || pathname === '/app/graph' || pathname === '/app/plm' || pathname === '/app/crew') {
    return new Response(await readFile(indexPath), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const assetPrefixes = ['/app/assets/', '/assets/']
  const matchedPrefix = assetPrefixes.find((prefix) => pathname.startsWith(prefix))
  if (!matchedPrefix) return null

  const relativePath = matchedPrefix === '/app/assets/'
    ? join('assets', pathname.slice(matchedPrefix.length))
    : pathname.slice(1)
  const filePath = join(distDir, relativePath)
  if (!isInsideDir(distDir, filePath) || !existsSync(filePath)) {
    return notFound(url)
  }

  return new Response(await readFile(filePath), {
    headers: {
      'content-type': contentTypeFor(filePath),
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

function readLimit(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const limit = (payload as { limit?: unknown }).limit
  return typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined
}

function readCheckHealth(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true
  const checkHealth = (payload as { checkHealth?: unknown }).checkHealth
  return typeof checkHealth === 'boolean' ? checkHealth : true
}

async function findLatestGraphId(): Promise<string | null> {
  if (!existsSync(store.graphsDir)) return null

  const entries = await readdir(store.graphsDir, { withFileTypes: true })
  const candidates: Array<{ id: string; updatedAt: number }> = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'graph-events.jsonl') continue
    const path = join(store.graphsDir, entry.name)
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8'))
      if (!isDramaGraph(parsed)) continue
      candidates.push({
        id: parsed.id,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      })
    } catch {
      // Ignore invalid graph files when finding a default graph.
    }
  }

  candidates.sort((left, right) => right.updatedAt - left.updatedAt)
  return candidates[0]?.id ?? null
}

async function loadDramaGraph(options: DramaGraphLoadOptions = {}): Promise<DramaGraphLoadResult> {
  const requestedGraphId = options.graphId?.trim()
  const graphId = requestedGraphId || await findLatestGraphId() || 'default'

  try {
    return {
      graph: await store.loadGraph(graphId),
      path: store.graphPath(graphId),
      imported: false,
    }
  } catch (error) {
    if (requestedGraphId && options.importStoryletIfMissing === false) {
      throw error
    }

    const fallbackGraph = createEmptyDramaGraph({
      id: graphId,
      title: requestedGraphId ? 'Drama Graph' : 'Drama Runtime Graph',
      source: {
        graphId,
      },
    })
    const result = await store.saveGraph(fallbackGraph, {
      type: 'graph.created',
      actor: 'drama:runtime',
      details: {
        source: 'runtime',
        requestedGraphId,
      },
    })

    return {
      graph: fallbackGraph,
      path: result.path,
      backupPath: result.backupPath,
      imported: false,
    }
  }
}

function findChapter(graph: DramaGraph, request: RuntimePlmChapterWritebackRequest): DramaChapter | undefined {
  if (request.chapterId) {
    return graph.chapters.find((chapter) => (
      chapter.id === request.chapterId
        || chapter.nodeId === request.chapterId
    ))
  }
  if (typeof request.chapterNumber === 'number') {
    return graph.chapters.find((chapter) => chapter.number === request.chapterNumber)
  }
  return graph.chapters[0]
}

async function writeBackPlmChapter(request: RuntimePlmChapterWritebackRequest): Promise<DramaGraphMutationResult> {
  const { graph } = await loadDramaGraph({ graphId: request.graphId })
  const chapter = findChapter(graph, request)
  const targetType = chapter ? 'chapter' : 'graph'
  const targetId = chapter?.id ?? graph.id
  const title = request.title?.trim() || chapter?.title || `Chapter ${request.chapterNumber ?? 1}`
  const { graph: updatedGraph, result } = await store.upsertDraft(graph.id, {
    draftId: `draft:plotpilot:${targetId}`,
    targetType,
    targetId,
    chapterId: chapter?.id,
    nodeId: chapter?.nodeId,
    content: request.content,
    source: 'plotpilot',
    status: request.status ?? 'draft',
    fields: [
      {
        key: 'plmTitle',
        label: 'PLM 标题',
        text: title,
      },
      {
        key: 'plmRuntime',
        label: 'PLM Runtime',
        text: 'standalone',
      },
    ],
  }, {
    type: 'plm.chapter.writeback',
    actor: 'drama:plm-runtime',
    details: {
      chapterId: chapter?.id,
      chapterNumber: request.chapterNumber,
      targetType,
      targetId,
      title,
    },
  })
  return mutationResult(updatedGraph, result)
}

async function createCrewSuggestion(request: RuntimeCrewSuggestionRequest): Promise<DramaGraphMutationResult> {
  return recordGraphEvent({
    graphId: request.graphId,
    event: createSkillCrewSuggestionEvent(request, {
      actor: request.agentId ? `agent:${request.agentId}` : 'drama:crew-runtime',
      details: {
        source: 'standalone-runtime',
      },
    }),
  })
}

async function recordGraphEvent(request: DramaGraphEventRecordRequest): Promise<DramaGraphMutationResult> {
  const { graph, path } = await loadDramaGraph({ graphId: request.graphId })
  await store.recordEvent(graph.id, request.event)
  return {
    graph,
    path,
  }
}

async function recordCrewAgentOutput(request: RuntimeCrewAgentOutputRequest): Promise<DramaGraphMutationResult> {
  return recordGraphEvent({
    graphId: request.graphId,
    event: createSkillCrewAgentOutputEvent(request, {
      actor: request.agentId ? `agent:${request.agentId}` : 'drama:crew-runtime',
      details: {
        source: 'standalone-runtime',
      },
    }),
  })
}

async function shutdownRuntime(payload: RuntimeShutdownRequest = {}): Promise<{ state: 'stopping'; stoppedAt: string }> {
  if (payload.stopPlotPilot !== false) {
    await plotPilotRuntime.stop({ forceAdopted: true }).catch((error) => {
      console.error('[drama-runtime] PlotPilot shutdown failed:', error)
    })
  }

  const stoppedAt = new Date().toISOString()
  setTimeout(() => {
    server.stop(true)
  }, 50)

  return {
    state: 'stopping',
    stoppedAt,
  }
}

async function ensurePlotPilotApiBaseUrl(): Promise<string> {
  const status = await plotPilotRuntime.start({ preferExisting: true })
  if (!status.healthy || !status.apiBaseUrl) {
    throw new Error(status.error ?? status.lastError ?? 'PlotPilot runtime is not ready.')
  }
  return status.apiBaseUrl
}

async function getPlotPilotApiBaseUrlIfReady(): Promise<string | null> {
  const status = await plotPilotRuntime.status({ checkHealth: true })
  return status.healthy && status.apiBaseUrl ? status.apiBaseUrl : null
}

function proxyResponseHeaders(source: Headers): Headers {
  const headers = new Headers(source)
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('transfer-encoding')
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  headers.set('access-control-allow-headers', 'authorization,content-type')
  return headers
}

function proxyRequestHeaders(source: Headers): Headers {
  const headers = new Headers(source)
  for (const header of [
    'connection',
    'content-length',
    'host',
    'keep-alive',
    'origin',
    'proxy-authenticate',
    'proxy-authorization',
    'referer',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
  ]) {
    headers.delete(header)
  }
  return headers
}

async function proxyPlotPilotRequest(request: Request, url: URL): Promise<Response | null> {
  if (url.pathname !== '/plm/proxy/health' && !url.pathname.startsWith('/plm/proxy/api/v1')) {
    return null
  }

  const status = await plotPilotRuntime.status({ checkHealth: true })
  if (!status.healthy || !status.baseUrl || !status.apiBaseUrl) {
    return errorResponse(
      503,
      'RUNTIME_ERROR',
      status.error ?? status.lastError ?? 'PlotPilot runtime is not ready.',
      { status },
    )
  }

  const targetUrl = url.pathname === '/plm/proxy/health'
    ? `${status.baseUrl.replace(/\/+$/, '')}/health${url.search}`
    : `${status.apiBaseUrl.replace(/\/+$/, '')}${url.pathname.slice('/plm/proxy/api/v1'.length) || '/'}${url.search}`

  const targetResponse = await fetch(targetUrl, {
    method: request.method,
    headers: proxyRequestHeaders(request.headers),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  })

  return new Response(targetResponse.body, {
    status: targetResponse.status,
    statusText: targetResponse.statusText,
    headers: proxyResponseHeaders(targetResponse.headers),
  })
}

async function getPlotPilotCodexStatus(): Promise<PlotPilotCodexStatusResponse> {
  const apiBaseUrl = await getPlotPilotApiBaseUrlIfReady()
  if (!apiBaseUrl) {
    const status = plotPilotRuntime.getStatus()
    return {
      available: false,
      authenticated: false,
      requires_openai_auth: true,
      account: null,
      email: null,
      plan_type: null,
      error: status.error ?? status.lastError ?? 'PlotPilot runtime is not running.',
    }
  }

  return createPlotPilotClient({ baseUrl: apiBaseUrl }).getCodexStatus()
}

async function startPlotPilotCodexLogin(): Promise<PlotPilotCodexLoginStartResponse> {
  const apiBaseUrl = await ensurePlotPilotApiBaseUrl()
  return createPlotPilotClient({ baseUrl: apiBaseUrl }).startCodexLogin()
}

async function logoutPlotPilotCodex(): Promise<PlotPilotCodexLogoutResponse> {
  const apiBaseUrl = await ensurePlotPilotApiBaseUrl()
  return createPlotPilotClient({ baseUrl: apiBaseUrl }).logoutCodex()
}

function plotPilotErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return {
    ...plotPilotRuntime.getStatus(),
    state: 'error',
    healthy: false,
    error: message,
    lastError: message,
  }
}

async function dispatch(channel: string, payload: unknown): Promise<unknown> {
  switch (channel) {
    case 'runtime:status':
      return runtimeStatus()

    case 'runtime:shutdown':
      return shutdownRuntime(payload as RuntimeShutdownRequest | undefined)

    case 'drama:graph:load':
      return loadDramaGraph(payload as DramaGraphLoadOptions | undefined)

    case 'drama:graph:history': {
      const request = payload as DramaGraphHistoryRequest
      return store.listHistory(request.graphId, {
        maxBackups: request.maxBackups,
        maxEvents: request.maxEvents,
      })
    }

    case 'drama:projectFile:record':
      return recordDramaProjectFile({
        workspaceRoot,
        request: payload as DramaProjectFileRecordRequest,
      })

    case 'drama:graph:restoreBackup': {
      const request = payload as DramaGraphRestoreBackupRequest
      const { graph, result } = await store.restoreBackup(request.graphId, request.backupPath, {
        type: 'graph.restored',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:updateNodePositions': {
      const request = payload as DramaGraphNodePositionUpdateRequest
      const { graph, result } = await store.updateNodePositions(request.graphId, request.updates, {
        type: 'graph.nodes.position.updated',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:updateNode': {
      const request = payload as DramaGraphNodeUpdateRequest
      const { graph, result } = await store.updateNode(request.graphId, request.update, {
        type: 'graph.node.updated',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:createNode': {
      const request = payload as DramaGraphNodeCreateRequest
      const { graph, result } = await store.createNode(request.graphId, request.input, {
        type: 'graph.node.created',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:deleteNode': {
      const request = payload as DramaGraphNodeDeleteRequest
      const { graph, result } = await store.deleteNode(request.graphId, request.input, {
        type: 'graph.node.deleted',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:upsertDraft': {
      const request = payload as DramaGraphDraftUpsertRequest
      const { graph, result } = await store.upsertDraft(request.graphId, request.input, {
        type: 'graph.draft.upserted',
        actor: 'drama:plm-runtime',
        ...request.event,
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:recordEvent':
      return recordGraphEvent(payload as DramaGraphEventRecordRequest)

    case 'drama:graph:updateEdge': {
      const request = payload as DramaGraphEdgeUpdateRequest
      const { graph, result } = await store.updateEdge(request.graphId, request.update, {
        type: 'graph.edge.updated',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:createEdge': {
      const request = payload as DramaGraphEdgeCreateRequest
      const { graph, result } = await store.createEdge(request.graphId, request.input, {
        type: 'graph.edge.created',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:deleteEdge': {
      const request = payload as DramaGraphEdgeDeleteRequest
      const { graph, result } = await store.deleteEdge(request.graphId, request.edgeId, {
        type: 'graph.edge.deleted',
        actor: 'drama:runtime',
      })
      return mutationResult(graph, result)
    }

    case 'drama:graph:upsertTaskBinding': {
      const request = payload as DramaGraphTaskBindingUpsertRequest
      const { graph, result } = await store.upsertTaskBinding(
        request.graphId,
        request.input,
        createSkillCrewTaskBindingUpsertEvent(request.input, { actor: 'drama:runtime' }),
      )
      return mutationResult(graph, result)
    }

    case 'drama:graph:deleteTaskBinding': {
      const request = payload as DramaGraphTaskBindingDeleteRequest
      const { graph, result } = await store.deleteTaskBinding(
        request.graphId,
        request.input,
        createSkillCrewTaskBindingDeleteEvent(request.input, { actor: 'drama:runtime' }),
      )
      return mutationResult(graph, result)
    }

    case 'drama:plm:chapterWriteback':
      return writeBackPlmChapter(payload as RuntimePlmChapterWritebackRequest)

    case 'plotpilot:runtime:status':
      return plotPilotRuntime.status({ checkHealth: readCheckHealth(payload) })

    case 'plotpilot:runtime:start':
      return plotPilotRuntime
        .start(payload as PlotPilotStartOptions | undefined)
        .catch((error) => plotPilotErrorStatus(error))

    case 'plotpilot:runtime:stop':
      return plotPilotRuntime.stop(payload as PlotPilotStopOptions | undefined)

    case 'plotpilot:runtime:restart':
      return plotPilotRuntime
        .restart(payload as PlotPilotStartOptions | undefined)
        .catch((error) => plotPilotErrorStatus(error))

    case 'plotpilot:runtime:logs':
      return plotPilotRuntime.getLogs(readLimit(payload))

    case 'plotpilot:codex:status':
      return getPlotPilotCodexStatus()

    case 'plotpilot:codex:startLogin':
      return startPlotPilotCodexLogin()

    case 'plotpilot:codex:logout':
      return logoutPlotPilotCodex()

    case 'drama:crew:suggestionCreate':
      return createCrewSuggestion(payload as RuntimeCrewSuggestionRequest)

    case 'drama:crew:agentOutputRecord':
      return recordCrewAgentOutput(payload as RuntimeCrewAgentOutputRequest)

    default:
      throw Object.assign(new Error(`Unsupported Drama runtime channel: ${channel}`), {
        code: 'UNSUPPORTED_CHANNEL' satisfies RuntimeErrorCode,
      })
  }
}

async function handleRpc(request: Request): Promise<Response> {
  let body: RuntimeRpcRequest
  try {
    body = await request.json() as RuntimeRpcRequest
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Request body must be valid JSON.')
  }

  if (typeof body.channel !== 'string' || !body.channel.trim()) {
    return errorResponse(422, 'BAD_REQUEST', 'RPC channel is required.')
  }

  try {
    const data = await dispatch(body.channel, body.payload)
    return json({ ok: true, data })
  } catch (error) {
    const code = (error as { code?: RuntimeErrorCode }).code ?? 'RUNTIME_ERROR'
    const status = code === 'UNSUPPORTED_CHANNEL' ? 404 : 500
    return errorResponse(status, code, error instanceof Error ? error.message : String(error))
  }
}

function notFound(url: URL): Response {
  return errorResponse(404, 'NOT_FOUND', `Drama runtime route not found: ${url.pathname}`)
}

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return json({ ok: true })
    }

    try {
      const browserShellResponse = await serveBrowserShell(url)
      if (browserShellResponse) return browserShellResponse

      const plotPilotProxyResponse = await proxyPlotPilotRequest(request, url)
      if (plotPilotProxyResponse) return plotPilotProxyResponse

      if (request.method === 'GET' && url.pathname === '/runtime/status') {
        return json(runtimeStatus())
      }

      if (request.method === 'POST' && url.pathname === '/runtime/rpc') {
        return handleRpc(request)
      }

      if (request.method === 'POST' && url.pathname === '/runtime/shutdown') {
        let body: RuntimeShutdownRequest = {}
        try {
          body = await request.json() as RuntimeShutdownRequest
        } catch {
          body = {}
        }
        return json(await shutdownRuntime(body))
      }

      if (request.method === 'GET' && url.pathname === '/graph') {
        return json(await loadDramaGraph({
          graphId: url.searchParams.get('graphId') ?? undefined,
          importStoryletIfMissing: false,
        }))
      }

      if (request.method === 'GET' && url.pathname === '/plm/runtime/status') {
        return json(await plotPilotRuntime.status({
          checkHealth: url.searchParams.get('checkHealth') !== 'false',
        }))
      }

      if (request.method === 'GET' && url.pathname === '/plm/codex/status') {
        return json(await getPlotPilotCodexStatus())
      }

      if (request.method === 'POST' && url.pathname === '/plm/codex/login/start') {
        return json(await startPlotPilotCodexLogin())
      }

      if (request.method === 'POST' && url.pathname === '/plm/codex/logout') {
        return json(await logoutPlotPilotCodex())
      }

      return notFound(url)
    } catch (error) {
      return errorResponse(500, 'RUNTIME_ERROR', error instanceof Error ? error.message : String(error))
    }
  },
})

console.log(`[drama-runtime] ready at http://${server.hostname}:${server.port}`)
console.log(`[drama-runtime] workspace ${workspaceRoot}`)
