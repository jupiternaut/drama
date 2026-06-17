import type {
  BeatSheetDTO,
  BibleDTO,
  BibleStatusDTO,
  BulkUpdateBibleRequest,
  ChapterDTO,
  ChapterChunkStats,
  ChapterMicroBeatsRequest,
  ChapterMicroBeatsResponse,
  ConsistencyReportDTO,
  CreateNovelRequest,
  EnsureChapterRequest,
  GenerateBeatSheetRequest,
  GenerateBibleStage,
  GenerateBibleStreamEvent,
  GenerateChapterRequest,
  GenerateChapterStreamEvent,
  NovelDTO,
  PlotPilotAutopilotCircuitBreakerResponse,
  PlotPilotAutopilotChapterStreamEvent,
  PlotPilotAutopilotControlResponse,
  PlotPilotAutopilotStartRequest,
  PlotPilotAutopilotStatusResponse,
  PlotPilotAutopilotStreamEvent,
  PlotPilotAiTraceListResponse,
  PlotPilotAiTraceTimelineResponse,
  PlotPilotChurnAlertsResponse,
  PlotPilotContinuePlanningRequest,
  PlotPilotHumanizerSettingsRequest,
  PlotPilotHumanizerSettingsResponse,
  PlotPilotHostedWriteRequest,
  PlotPilotHostedWriteStreamEvent,
  PlotPilotInvocationAcceptRequest,
  PlotPilotInvocationCommitRequest,
  PlotPilotInvocationCreateRequest,
  PlotPilotInvocationPromptDraftRequest,
  PlotPilotInvocationPromptDraftResponse,
  PlotPilotInvocationResponseDTO,
  PlotPilotInvocationResumeRequest,
  PlotPilotInvocationVariableUpdateRequest,
  PlotPilotKnowledgeGraphResponse,
  PlotPilotLlmControlConfig,
  PlotPilotLlmControlPanelData,
  PlotPilotMainPlotOptionItem,
  PlotPilotPlanNovelRequest,
  PlotPilotPlanNovelResponse,
  PlotPilotPlanningStructureResponse,
  PlotPilotSavePlotOutlineRequest,
  PlotPilotSetupStreamEvent,
  PlotPilotSuggestMainPlotOptionsResponse,
  PlotPilotPlotOutlineResponse,
  PlotPilotPromptListResponse,
  PlotPilotPromptStatsResponse,
  PlotPilotReaderSimulationListResponse,
  PlotPilotReaderSimulationResponse,
  PlotPilotReviewChapterResponse,
  PlotPilotTraceListResponse,
  PlotPilotTraceStatsResponse,
  PlotPilotWritingSpecBindingRequest,
  PlotPilotWritingSpecBindingResponse,
  PlotPilotWritingSpecFailure,
  StreamGeneratedBeatDTO,
  UpdateChapterContentRequest,
  UpdateNovelRequest,
} from './plotpilot-types.ts'
import type {
  PlotPilotCodexLoginStartResponse,
  PlotPilotCodexLogoutResponse,
  PlotPilotCodexStatusResponse,
} from './codex.ts'
import type { PlmHealth } from './runtime.ts'

export type PlotPilotFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface PlotPilotClientOptions {
  baseUrl?: string
  origin?: string
  port?: number
  host?: string
  protocol?: 'http' | 'https' | (string & {})
  fetch?: PlotPilotFetch
  headers?: HeadersInit
}

export interface PlotPilotRequestOptions {
  signal?: AbortSignal
  headers?: HeadersInit
}

export interface PlotPilotGenerateBibleStreamOptions extends PlotPilotRequestOptions {
  stage?: GenerateBibleStage
}

export interface PlotPilotClient {
  health(options?: PlotPilotRequestOptions): Promise<PlmHealth>
  listNovels(options?: PlotPilotRequestOptions): Promise<NovelDTO[]>
  getNovel(novelId: string, options?: PlotPilotRequestOptions): Promise<NovelDTO>
  createNovel(data: CreateNovelRequest, options?: PlotPilotRequestOptions): Promise<NovelDTO>
  updateNovel(novelId: string, data: UpdateNovelRequest, options?: PlotPilotRequestOptions): Promise<NovelDTO>
  setNovelAutoApproveMode(novelId: string, enabled: boolean, options?: PlotPilotRequestOptions): Promise<NovelDTO>
  getLlmControl(options?: PlotPilotRequestOptions): Promise<PlotPilotLlmControlPanelData>
  updateLlmControl(
    data: PlotPilotLlmControlConfig,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotLlmControlPanelData>
  getCodexStatus(options?: PlotPilotRequestOptions): Promise<PlotPilotCodexStatusResponse>
  startCodexLogin(options?: PlotPilotRequestOptions): Promise<PlotPilotCodexLoginStartResponse>
  logoutCodex(options?: PlotPilotRequestOptions): Promise<PlotPilotCodexLogoutResponse>
  getWritingSpec(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotWritingSpecBindingResponse>
  setWritingSpec(
    novelId: string,
    data: PlotPilotWritingSpecBindingRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotWritingSpecBindingResponse>
  getHumanizer(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotHumanizerSettingsResponse>
  setHumanizer(
    novelId: string,
    data: PlotPilotHumanizerSettingsRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotHumanizerSettingsResponse>
  createInvocation(
    data: PlotPilotInvocationCreateRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  getInvocation(sessionId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotInvocationResponseDTO>
  acceptInvocation(
    sessionId: string,
    data: PlotPilotInvocationAcceptRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  resumeInvocation(
    sessionId: string,
    data?: PlotPilotInvocationResumeRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  retryInvocation(
    sessionId: string,
    data?: PlotPilotInvocationResumeRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  rejectInvocation(
    sessionId: string,
    data: PlotPilotInvocationAcceptRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  commitInvocation(
    sessionId: string,
    data: PlotPilotInvocationCommitRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  previewInvocationPromptDraft(
    sessionId: string,
    data: PlotPilotInvocationPromptDraftRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationPromptDraftResponse>
  saveInvocationPromptDraft(
    sessionId: string,
    data: PlotPilotInvocationPromptDraftRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  updateInvocationVariables(
    sessionId: string,
    data: PlotPilotInvocationVariableUpdateRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotInvocationResponseDTO>
  getPlotOutline(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotPlotOutlineResponse>
  savePlotOutline(
    novelId: string,
    data: PlotPilotSavePlotOutlineRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotPlotOutlineResponse>
  generatePlotOutline(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotPlotOutlineResponse>
  generatePlotOutlineStream(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<PlotPilotSetupStreamEvent, void, unknown>
  suggestMainPlotOptions(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotSuggestMainPlotOptionsResponse>
  suggestMainPlotOptionsStream(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<PlotPilotSetupStreamEvent, void, unknown>
  planNovel(
    novelId: string,
    data?: PlotPilotPlanNovelRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotPlanNovelResponse>
  getPlanningStructure(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotPlanningStructureResponse>
  continuePlanning(
    novelId: string,
    data: PlotPilotContinuePlanningRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<Record<string, unknown>>
  getBibleStatus(novelId: string, options?: PlotPilotRequestOptions): Promise<BibleStatusDTO>
  getBible(novelId: string, options?: PlotPilotRequestOptions): Promise<BibleDTO>
  updateBible(novelId: string, data: BulkUpdateBibleRequest, options?: PlotPilotRequestOptions): Promise<BibleDTO>
  listChapters(novelId: string, options?: PlotPilotRequestOptions): Promise<ChapterDTO[]>
  getChapter(novelId: string, chapterNumber: number, options?: PlotPilotRequestOptions): Promise<ChapterDTO>
  ensureChapter(
    novelId: string,
    chapterNumber: number,
    data?: EnsureChapterRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<ChapterDTO>
  updateChapter(
    novelId: string,
    chapterNumber: number,
    data: UpdateChapterContentRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<ChapterDTO>
  updateChapterMicroBeats(
    novelId: string,
    chapterNumber: number,
    data: ChapterMicroBeatsRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<ChapterMicroBeatsResponse>
  generateBeatSheet(data: GenerateBeatSheetRequest, options?: PlotPilotRequestOptions): Promise<BeatSheetDTO>
  getBeatSheet(chapterId: string, options?: PlotPilotRequestOptions): Promise<BeatSheetDTO>
  generateBibleStream(
    novelId: string,
    options?: PlotPilotGenerateBibleStreamOptions,
  ): AsyncGenerator<GenerateBibleStreamEvent, void, unknown>
  generateChapterStream(
    novelId: string,
    data: GenerateChapterRequest,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<GenerateChapterStreamEvent, void, unknown>
  hostedWriteStream(
    novelId: string,
    data: PlotPilotHostedWriteRequest,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<PlotPilotHostedWriteStreamEvent, void, unknown>
  getAutopilotStatus(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotAutopilotStatusResponse>
  startAutopilot(
    novelId: string,
    data: PlotPilotAutopilotStartRequest,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotAutopilotControlResponse>
  stopAutopilot(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotAutopilotControlResponse>
  resumeAutopilot(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotAutopilotControlResponse>
  getAutopilotCircuitBreaker(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotAutopilotCircuitBreakerResponse>
  resetAutopilotCircuitBreaker(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotAutopilotControlResponse>
  autopilotLogStream(
    novelId: string,
    afterSeq?: number,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<PlotPilotAutopilotStreamEvent, void, unknown>
  autopilotChapterStream(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<PlotPilotAutopilotChapterStreamEvent, void, unknown>
  autopilotEventsStream(
    novelId: string,
    options?: PlotPilotRequestOptions,
  ): AsyncGenerator<PlotPilotAutopilotStreamEvent, void, unknown>
  reviewChapter(
    novelId: string,
    chapterNumber: number,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotReviewChapterResponse>
  simulateReaders(
    novelId: string,
    chapterNumber: number,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotReaderSimulationResponse>
  getChapterSimulation(
    novelId: string,
    chapterNumber: number,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotReaderSimulationResponse>
  listReaderSimulations(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotReaderSimulationListResponse>
  getChurnAlerts(novelId: string, threshold?: number, options?: PlotPilotRequestOptions): Promise<PlotPilotChurnAlertsResponse>
  inferKnowledgeGraph(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotKnowledgeGraphResponse>
  getKnowledgeGraphStatistics(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotKnowledgeGraphResponse>
  getKnowledgeGraphTriples(
    novelId: string,
    params?: { source_type?: string; min_confidence?: number },
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotKnowledgeGraphResponse>
  searchKnowledgeGraph(
    novelId: string,
    data: { query: string; limit?: number; min_score?: number },
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotKnowledgeGraphResponse>
  listTraces(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotTraceListResponse>
  getTraceStats(novelId: string, options?: PlotPilotRequestOptions): Promise<PlotPilotTraceStatsResponse>
  listAiTraces(novelId: string, limit?: number, options?: PlotPilotRequestOptions): Promise<PlotPilotAiTraceListResponse>
  getAiTraceTimeline(
    novelId: string,
    traceId: string,
    options?: PlotPilotRequestOptions,
  ): Promise<PlotPilotAiTraceTimelineResponse>
  getPromptStats(options?: PlotPilotRequestOptions): Promise<PlotPilotPromptStatsResponse>
  listPrompts(options?: PlotPilotRequestOptions): Promise<PlotPilotPromptListResponse>
}

export type PlotPilotCallOptions = PlotPilotClientOptions & PlotPilotRequestOptions
export type PlotPilotGenerateBibleStreamCallOptions =
  PlotPilotClientOptions & PlotPilotGenerateBibleStreamOptions

export interface PlotPilotRoots {
  healthRoot: string
  apiBaseUrl: string
}

const DEFAULT_PLOTPILOT_PORT = 8005
const API_V1_SUFFIX = '/api/v1'

export class PlotPilotHttpError extends Error {
  readonly status: number
  readonly url: string
  readonly body: string

  constructor(status: number, url: string, body: string) {
    super(`PlotPilot request failed (${status}) ${url}`)
    this.name = 'PlotPilotHttpError'
    this.status = status
    this.url = url
    this.body = body
  }
}

export class PlotPilotResponseParseError extends Error {
  readonly url: string
  readonly body: string

  constructor(url: string, body: string) {
    super(`PlotPilot response was not valid JSON: ${url}`)
    this.name = 'PlotPilotResponseParseError'
    this.url = url
    this.body = body
  }
}

function parsePlotPilotErrorBody(error: unknown): unknown | null {
  if (!(error instanceof PlotPilotHttpError)) return null
  const trimmed = error.body.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

export function extractPlotPilotWritingSpecFailure(error: unknown): PlotPilotWritingSpecFailure | null {
  const body = parsePlotPilotErrorBody(error)
  if (!isRecord(body)) return null

  const detail = isRecord(body.detail) ? body.detail : body
  const code = stringValue(detail.code ?? body.code)
  if (code !== 'writing_spec_failed') return null

  const message = stringValue(
    detail.message ?? body.message,
    'WritingSpec validation failed; chapter was not saved.',
  )
  const failure: PlotPilotWritingSpecFailure = { code, message }
  if (isRecord(detail.report)) failure.report = detail.report
  return failure
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function joinUrl(root: string, path: string): string {
  const normalizedPath = normalizePath(path)
  const trimmedRoot = trimTrailingSlash(root.trim())
  if (!trimmedRoot) return normalizedPath
  return `${trimmedRoot}${normalizedPath}`
}

function encodeSegment(value: string | number | boolean): string {
  return encodeURIComponent(String(value))
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function hasApiV1Suffix(value: string): boolean {
  return trimTrailingSlash(value).toLowerCase().endsWith(API_V1_SUFFIX)
}

function formatHost(host: string): string {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`
  }
  return host
}

function rootsFromBaseUrl(baseUrl: string): PlotPilotRoots {
  const trimmed = trimTrailingSlash(baseUrl.trim())
  if (!trimmed) {
    throw new Error('PlotPilot baseUrl cannot be empty')
  }

  const apiBaseUrl = hasApiV1Suffix(trimmed)
    ? trimmed
    : joinUrl(trimmed, API_V1_SUFFIX)

  if (!hasApiV1Suffix(trimmed)) {
    return { healthRoot: trimmed, apiBaseUrl }
  }

  if (isHttpUrl(trimmed)) {
    return { healthRoot: new URL(trimmed).origin, apiBaseUrl }
  }

  const healthRoot = trimTrailingSlash(trimmed.slice(0, -API_V1_SUFFIX.length))
  return { healthRoot, apiBaseUrl }
}

function rootsFromOrigin(origin: string): PlotPilotRoots {
  const trimmed = trimTrailingSlash(origin.trim())
  if (!trimmed) {
    throw new Error('PlotPilot origin cannot be empty')
  }

  const healthRoot = isHttpUrl(trimmed) ? new URL(trimmed).origin : trimmed
  return {
    healthRoot,
    apiBaseUrl: joinUrl(healthRoot, API_V1_SUFFIX),
  }
}

function rootsFromPort(options: Pick<PlotPilotClientOptions, 'host' | 'port' | 'protocol'>): PlotPilotRoots {
  const port = options.port ?? DEFAULT_PLOTPILOT_PORT
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PlotPilot port: ${port}`)
  }

  const protocol = options.protocol ?? 'http'
  const host = formatHost(options.host ?? '127.0.0.1')
  const origin = `${protocol}://${host}:${port}`
  return {
    healthRoot: origin,
    apiBaseUrl: joinUrl(origin, API_V1_SUFFIX),
  }
}

export function resolvePlotPilotRoots(options: PlotPilotClientOptions = {}): PlotPilotRoots {
  if (options.baseUrl) return rootsFromBaseUrl(options.baseUrl)
  if (options.origin) return rootsFromOrigin(options.origin)
  return rootsFromPort(options)
}

function resolveFetch(fetchImpl?: PlotPilotFetch): PlotPilotFetch {
  if (fetchImpl) return fetchImpl
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis) as PlotPilotFetch
  }
  throw new Error('PlotPilot client requires a fetch implementation')
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers()
  for (const source of sources) {
    if (!source) continue
    const incoming = new Headers(source)
    incoming.forEach((value, key) => headers.set(key, value))
  }
  return headers
}

function queryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    query.set(key, String(value))
  }
  return query.toString()
}

function apiPath(path: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const qs = params ? queryString(params) : ''
  return qs ? `${normalizePath(path)}?${qs}` : normalizePath(path)
}

async function readErrorBody(response: Response): Promise<string> {
  return response.text().catch(() => '')
}

async function requestJson<T>(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  path: string,
  init: RequestInit,
  clientHeaders: HeadersInit | undefined,
  requestOptions: PlotPilotRequestOptions | undefined,
): Promise<T> {
  const url = path === '/health'
    ? joinUrl(roots.healthRoot, path)
    : joinUrl(roots.apiBaseUrl, path)
  const headers = mergeHeaders(clientHeaders, requestOptions?.headers, init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetchImpl(url, {
    ...init,
    headers,
    signal: requestOptions?.signal ?? init.signal,
  })

  if (!response.ok) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.text()
  if (!body.trim()) {
    return undefined as T
  }

  try {
    return JSON.parse(body) as T
  } catch {
    throw new PlotPilotResponseParseError(url, body)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function stringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const knownBibleDataTypes = new Set([
  'style',
  'style_chunk',
  'worldbuilding_dimension',
  'worldbuilding_field',
  'worldbuilding_chunk',
  'character',
  'character_chunk',
  'location',
  'location_chunk',
])

function looksLikeBibleDataPayload(payload: Record<string, unknown>): boolean {
  const type = optionalString(payload.type)
  return (
    (type != null && knownBibleDataTypes.has(type)) ||
    typeof payload.data_type === 'string' ||
    Object.prototype.hasOwnProperty.call(payload, 'content') ||
    Object.prototype.hasOwnProperty.call(payload, 'chunk') ||
    Object.prototype.hasOwnProperty.call(payload, 'dimension')
  )
}

function normalizeDataEvent(payload: Record<string, unknown>): GenerateBibleStreamEvent {
  const event: Extract<GenerateBibleStreamEvent, { type: 'data' }> = {
    type: 'data',
    data_type: stringValue(payload.data_type ?? payload.type, 'data'),
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'content')) event.content = payload.content
  const chunk = optionalString(payload.chunk)
  if (chunk !== undefined) event.chunk = chunk
  const dimension = optionalString(payload.dimension)
  if (dimension !== undefined) event.dimension = dimension
  const label = optionalString(payload.label)
  if (label !== undefined) event.label = label
  const field = optionalString(payload.field)
  if (field !== undefined) event.field = field
  const value = optionalString(payload.value)
  if (value !== undefined) event.value = value
  const index = numberValue(payload.index)
  if (index !== undefined) event.index = index

  return event
}

function normalizeStreamEvent(
  eventName: string | undefined,
  raw: unknown,
  fallbackNovelId: string,
): GenerateBibleStreamEvent | null {
  if (raw === null || raw === undefined || raw === '[DONE]') return null

  if (!isRecord(raw)) {
    return {
      type: 'unknown',
      event: eventName,
      raw,
    }
  }

  const type = stringValue(eventName || raw.type, '').trim()
  if (type === 'phase') {
    const event: Extract<GenerateBibleStreamEvent, { type: 'phase' }> = {
      type: 'phase',
      phase: stringValue(raw.phase),
    }
    const message = optionalString(raw.message)
    if (message !== undefined) event.message = message
    return event
  }

  if (type === 'data' || looksLikeBibleDataPayload(raw)) {
    return normalizeDataEvent(raw)
  }

  if (type === 'approval_required') {
    const event: Extract<GenerateBibleStreamEvent, { type: 'approval_required' }> = {
      type: 'approval_required',
      session_id: stringValue(raw.session_id),
    }
    const status = optionalString(raw.status)
    if (status !== undefined) event.status = status
    const nextAction = optionalString(raw.next_action)
    if (nextAction !== undefined) event.next_action = nextAction
    const stage = optionalString(raw.stage)
    if (stage !== undefined) event.stage = stage
    return event
  }

  if (type === 'done') {
    const event: Extract<GenerateBibleStreamEvent, { type: 'done' }> = {
      type: 'done',
      novel_id: stringValue(raw.novel_id, fallbackNovelId),
    }
    const message = optionalString(raw.message)
    if (message !== undefined) event.message = message
    const invocationSessionId = optionalString(raw.invocation_session_id)
    if (invocationSessionId !== undefined) event.invocation_session_id = invocationSessionId
    return event
  }

  if (type === 'error') {
    return {
      type: 'error',
      message: stringValue(raw.message ?? raw.error, 'Stream error'),
    }
  }

  return {
    type: 'unknown',
    event: eventName,
    raw,
  }
}

function parseJsonPayload(text: string): unknown | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed === '[DONE]') return '[DONE]'
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

function parseSseBlock(block: string): { eventName?: string; payload: unknown } | null {
  let eventName: string | undefined
  const dataLines: string[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      const data = line.slice('data:'.length)
      dataLines.push(data.startsWith(' ') ? data.slice(1) : data)
    }
  }

  if (!eventName && dataLines.length === 0) return null
  const payload = parseJsonPayload(dataLines.join('\n'))
  if (payload === null) return null
  return { eventName, payload }
}

function drainSseFrames(
  bufferRef: { value: string },
  fallbackNovelId: string,
  final = false,
): GenerateBibleStreamEvent[] {
  const events: GenerateBibleStreamEvent[] = []
  let separatorIndex = bufferRef.value.indexOf('\n\n')
  while (separatorIndex >= 0) {
    const block = bufferRef.value.slice(0, separatorIndex)
    bufferRef.value = bufferRef.value.slice(separatorIndex + 2)
    const parsed = parseSseBlock(block)
    const event = parsed
      ? normalizeStreamEvent(parsed.eventName, parsed.payload, fallbackNovelId)
      : null
    if (event) events.push(event)
    separatorIndex = bufferRef.value.indexOf('\n\n')
  }

  if (final && bufferRef.value.trim()) {
    const parsed = parseSseBlock(bufferRef.value)
    const event = parsed
      ? normalizeStreamEvent(parsed.eventName, parsed.payload, fallbackNovelId)
      : null
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function drainNdjsonFrames(
  bufferRef: { value: string },
  fallbackNovelId: string,
  final = false,
): GenerateBibleStreamEvent[] {
  const events: GenerateBibleStreamEvent[] = []
  let newlineIndex = bufferRef.value.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = bufferRef.value.slice(0, newlineIndex).trim()
    bufferRef.value = bufferRef.value.slice(newlineIndex + 1)
    if (line) {
      const payloadText = line.startsWith('data:')
        ? line.slice('data:'.length).trim()
        : line
      const payload = parseJsonPayload(payloadText)
      const event = payload === null ? null : normalizeStreamEvent(undefined, payload, fallbackNovelId)
      if (event) events.push(event)
    }
    newlineIndex = bufferRef.value.indexOf('\n')
  }

  if (final && bufferRef.value.trim()) {
    const payloadText = bufferRef.value.trim().startsWith('data:')
      ? bufferRef.value.trim().slice('data:'.length).trim()
      : bufferRef.value.trim()
    const payload = parseJsonPayload(payloadText)
    const event = payload === null ? null : normalizeStreamEvent(undefined, payload, fallbackNovelId)
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function hasTerminalEvent(events: GenerateBibleStreamEvent[]): boolean {
  return events.some(event =>
    event.type === 'done' ||
    event.type === 'error' ||
    event.type === 'approval_required'
  )
}

async function* readBibleStreamEvents(
  response: Response,
  fallbackNovelId: string,
): AsyncGenerator<GenerateBibleStreamEvent, void, unknown> {
  if (!response.body) return

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  let mode: 'sse' | 'ndjson' | null = contentType.includes('text/event-stream')
    ? 'sse'
    : contentType.includes('ndjson')
      ? 'ndjson'
      : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferRef = { value: '' }

  const drain = (final = false): GenerateBibleStreamEvent[] => {
    bufferRef.value = bufferRef.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (mode === null) {
      mode = /^\s*(event|data):/m.test(bufferRef.value) ? 'sse' : 'ndjson'
    }
    return mode === 'sse'
      ? drainSseFrames(bufferRef, fallbackNovelId, final)
      : drainNdjsonFrames(bufferRef, fallbackNovelId, final)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      bufferRef.value += decoder.decode(value, { stream: true })
    }
    if (done) {
      bufferRef.value += decoder.decode()
    }

    const events = drain(done)
    for (const event of events) {
      yield event
    }
    if (hasTerminalEvent(events)) return

    if (done) {
      return
    }
  }
}

function stringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item).trim()).filter(Boolean)
    return values.length > 0 ? values : undefined
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return undefined
}

function normalizeGeneratedBeats(raw: unknown): StreamGeneratedBeatDTO[] {
  if (!Array.isArray(raw)) return []

  const beats: StreamGeneratedBeatDTO[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const description = stringValue(item.description ?? item.text ?? item.intent ?? item.scene_goal).trim()
    if (!description) continue
    beats.push({
      description,
      target_words: numberValue(item.target_words) ?? 0,
      focus: stringValue(item.focus ?? item.type, 'pacing').trim() || 'pacing',
      location_id: optionalString(item.location_id),
      function: optionalString(item.function),
      pov: optionalString(item.pov),
      cast_refs: stringList(item.cast_refs),
      location_refs: stringList(item.location_refs),
      prop_refs: stringList(item.prop_refs),
      knowledge_refs: stringList(item.knowledge_refs),
      visible_action: optionalString(item.visible_action),
      conflict: optionalString(item.conflict),
      delta: optionalString(item.delta),
      handoff_to_next: optionalString(item.handoff_to_next),
      must_include: stringList(item.must_include),
      must_not_include: stringList(item.must_not_include),
      active_action: optionalString(item.active_action),
      emotion_gap: optionalString(item.emotion_gap),
      forbidden_drift: optionalString(item.forbidden_drift),
    })
  }
  return beats
}

function defaultConsistencyReport(): ConsistencyReportDTO {
  return { issues: [], warnings: [], suggestions: [] }
}

function normalizeConsistencyReport(raw: unknown): ConsistencyReportDTO {
  if (!isRecord(raw)) return defaultConsistencyReport()
  return {
    issues: Array.isArray(raw.issues) ? raw.issues as ConsistencyReportDTO['issues'] : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings as ConsistencyReportDTO['warnings'] : [],
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.map((item) => String(item)).filter(Boolean)
      : [],
  }
}

function normalizeChapterChunkStats(raw: unknown): ChapterChunkStats {
  if (!isRecord(raw)) {
    return { chars: 0, chunks: 0, estimated_tokens: 0 }
  }
  return {
    chars: numberValue(raw.chars) ?? 0,
    chunks: numberValue(raw.chunks) ?? 0,
    estimated_tokens: numberValue(raw.estimated_tokens) ?? 0,
  }
}

function normalizeChapterStreamEvent(
  eventName: string | undefined,
  raw: unknown,
): GenerateChapterStreamEvent | null {
  if (raw === null || raw === undefined || raw === '[DONE]') return null

  if (!isRecord(raw)) {
    return {
      type: 'unknown',
      event: eventName,
      raw,
    }
  }

  const type = stringValue(eventName || raw.type, '').trim()
  if (type === 'phase') {
    const event: Extract<GenerateChapterStreamEvent, { type: 'phase' }> = {
      type: 'phase',
      phase: stringValue(raw.phase),
    }
    const message = optionalString(raw.message)
    if (message !== undefined) event.message = message
    return event
  }

  if (type === 'llm_chunk') {
    return {
      type: 'llm_chunk',
      stage: stringValue(raw.stage),
      text: stringValue(raw.text),
    }
  }

  if (type === 'beats_generated') {
    return {
      type: 'beats_generated',
      beats: normalizeGeneratedBeats(raw.beats),
    }
  }

  if (type === 'approval_required') {
    const event: Extract<GenerateChapterStreamEvent, { type: 'approval_required' }> = {
      type: 'approval_required',
      session_id: stringValue(raw.session_id),
    }
    const status = optionalString(raw.status)
    if (status !== undefined) event.status = status
    const nextAction = optionalString(raw.next_action)
    if (nextAction !== undefined) event.next_action = nextAction
    return event
  }

  if (type === 'chunk') {
    return {
      type: 'chunk',
      text: stringValue(raw.text),
      stats: normalizeChapterChunkStats(raw.stats),
    }
  }

  if (type === 'done') {
    const event: Extract<GenerateChapterStreamEvent, { type: 'done' }> = {
      type: 'done',
      content: stringValue(raw.content),
      consistency_report: normalizeConsistencyReport(raw.consistency_report),
      token_count: numberValue(raw.token_count) ?? 0,
      output_tokens: numberValue(raw.output_tokens) ?? 0,
      total_tokens: numberValue(raw.total_tokens) ?? 0,
      chars: numberValue(raw.chars) ?? 0,
    }
    if (Array.isArray(raw.style_warnings)) {
      event.style_warnings = raw.style_warnings as Extract<GenerateChapterStreamEvent, { type: 'done' }>['style_warnings']
    }
    if (Array.isArray(raw.ghost_annotations)) event.ghost_annotations = raw.ghost_annotations
    const beats = normalizeGeneratedBeats(raw.beats)
    if (beats.length > 0) event.beats = beats
    return event
  }

  if (type === 'error') {
    return {
      type: 'error',
      message: stringValue(raw.message ?? raw.error, 'Stream error'),
    }
  }

  return {
    type: 'unknown',
    event: eventName,
    raw,
  }
}

function drainChapterSseFrames(
  bufferRef: { value: string },
  final = false,
): GenerateChapterStreamEvent[] {
  const events: GenerateChapterStreamEvent[] = []
  let separatorIndex = bufferRef.value.indexOf('\n\n')
  while (separatorIndex >= 0) {
    const block = bufferRef.value.slice(0, separatorIndex)
    bufferRef.value = bufferRef.value.slice(separatorIndex + 2)
    const parsed = parseSseBlock(block)
    const event = parsed
      ? normalizeChapterStreamEvent(parsed.eventName, parsed.payload)
      : null
    if (event) events.push(event)
    separatorIndex = bufferRef.value.indexOf('\n\n')
  }

  if (final && bufferRef.value.trim()) {
    const parsed = parseSseBlock(bufferRef.value)
    const event = parsed
      ? normalizeChapterStreamEvent(parsed.eventName, parsed.payload)
      : null
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function drainChapterNdjsonFrames(
  bufferRef: { value: string },
  final = false,
): GenerateChapterStreamEvent[] {
  const events: GenerateChapterStreamEvent[] = []
  let newlineIndex = bufferRef.value.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = bufferRef.value.slice(0, newlineIndex).trim()
    bufferRef.value = bufferRef.value.slice(newlineIndex + 1)
    if (line) {
      const payloadText = line.startsWith('data:')
        ? line.slice('data:'.length).trim()
        : line
      const payload = parseJsonPayload(payloadText)
      const event = payload === null ? null : normalizeChapterStreamEvent(undefined, payload)
      if (event) events.push(event)
    }
    newlineIndex = bufferRef.value.indexOf('\n')
  }

  if (final && bufferRef.value.trim()) {
    const payloadText = bufferRef.value.trim().startsWith('data:')
      ? bufferRef.value.trim().slice('data:'.length).trim()
      : bufferRef.value.trim()
    const payload = parseJsonPayload(payloadText)
    const event = payload === null ? null : normalizeChapterStreamEvent(undefined, payload)
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function hasTerminalChapterEvent(events: GenerateChapterStreamEvent[]): boolean {
  return events.some(event =>
    event.type === 'done' ||
    event.type === 'error' ||
    event.type === 'approval_required'
  )
}

async function* readChapterStreamEvents(
  response: Response,
): AsyncGenerator<GenerateChapterStreamEvent, void, unknown> {
  if (!response.body) return

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  let mode: 'sse' | 'ndjson' | null = contentType.includes('text/event-stream')
    ? 'sse'
    : contentType.includes('ndjson')
      ? 'ndjson'
      : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferRef = { value: '' }

  const drain = (final = false): GenerateChapterStreamEvent[] => {
    bufferRef.value = bufferRef.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (mode === null) {
      mode = /^\s*(event|data):/m.test(bufferRef.value) ? 'sse' : 'ndjson'
    }
    return mode === 'sse'
      ? drainChapterSseFrames(bufferRef, final)
      : drainChapterNdjsonFrames(bufferRef, final)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      bufferRef.value += decoder.decode(value, { stream: true })
    }
    if (done) {
      bufferRef.value += decoder.decode()
    }

    const events = drain(done)
    for (const event of events) {
      yield event
    }
    if (hasTerminalChapterEvent(events)) return

    if (done) {
      return
    }
  }
}

function normalizeHostedWriteStreamEvent(
  eventName: string | undefined,
  raw: unknown,
): PlotPilotHostedWriteStreamEvent | null {
  if (raw === null || raw === undefined || raw === '[DONE]') return null

  if (!isRecord(raw)) {
    return {
      type: 'unknown',
      event: eventName,
      raw,
    }
  }

  const type = stringValue(eventName || raw.type, '').trim()
  if (type === 'approval_required') {
    return {
      ...raw,
      type: 'approval_required',
      session_id: stringValue(raw.session_id),
      status: optionalString(raw.status),
      next_action: optionalString(raw.next_action),
    }
  }
  if (type === 'error') {
    return {
      ...raw,
      type: 'error',
      message: stringValue(raw.message ?? raw.error, 'Stream error'),
    }
  }
  if (type === 'chunk') {
    return {
      ...raw,
      type: 'chunk',
      text: optionalString(raw.text),
      stats: isRecord(raw.stats) ? normalizeChapterChunkStats(raw.stats) : undefined,
    }
  }
  if (
    type === 'session' ||
    type === 'chapter_start' ||
    type === 'outline' ||
    type === 'saved' ||
    type === 'session_done'
  ) {
    return {
      ...raw,
      type,
    } as PlotPilotHostedWriteStreamEvent
  }

  return {
    type: 'unknown',
    event: eventName,
    raw,
  }
}

function drainHostedWriteSseFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotHostedWriteStreamEvent[] {
  const events: PlotPilotHostedWriteStreamEvent[] = []
  let separatorIndex = bufferRef.value.indexOf('\n\n')
  while (separatorIndex >= 0) {
    const block = bufferRef.value.slice(0, separatorIndex)
    bufferRef.value = bufferRef.value.slice(separatorIndex + 2)
    const parsed = parseSseBlock(block)
    const event = parsed ? normalizeHostedWriteStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    separatorIndex = bufferRef.value.indexOf('\n\n')
  }

  if (final && bufferRef.value.trim()) {
    const parsed = parseSseBlock(bufferRef.value)
    const event = parsed ? normalizeHostedWriteStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function drainHostedWriteNdjsonFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotHostedWriteStreamEvent[] {
  const events: PlotPilotHostedWriteStreamEvent[] = []
  let newlineIndex = bufferRef.value.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = bufferRef.value.slice(0, newlineIndex).trim()
    bufferRef.value = bufferRef.value.slice(newlineIndex + 1)
    if (line) {
      const payloadText = line.startsWith('data:')
        ? line.slice('data:'.length).trim()
        : line
      const payload = parseJsonPayload(payloadText)
      const event = payload === null ? null : normalizeHostedWriteStreamEvent(undefined, payload)
      if (event) events.push(event)
    }
    newlineIndex = bufferRef.value.indexOf('\n')
  }

  if (final && bufferRef.value.trim()) {
    const payloadText = bufferRef.value.trim().startsWith('data:')
      ? bufferRef.value.trim().slice('data:'.length).trim()
      : bufferRef.value.trim()
    const payload = parseJsonPayload(payloadText)
    const event = payload === null ? null : normalizeHostedWriteStreamEvent(undefined, payload)
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function hasTerminalHostedWriteEvent(events: PlotPilotHostedWriteStreamEvent[]): boolean {
  return events.some(event =>
    event.type === 'session_done' ||
    event.type === 'error' ||
    event.type === 'approval_required'
  )
}

async function* readHostedWriteStreamEvents(
  response: Response,
): AsyncGenerator<PlotPilotHostedWriteStreamEvent, void, unknown> {
  if (!response.body) return

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  let mode: 'sse' | 'ndjson' | null = contentType.includes('text/event-stream')
    ? 'sse'
    : contentType.includes('ndjson')
      ? 'ndjson'
      : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferRef = { value: '' }

  const drain = (final = false): PlotPilotHostedWriteStreamEvent[] => {
    bufferRef.value = bufferRef.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (mode === null) {
      mode = /^\s*(event|data):/m.test(bufferRef.value) ? 'sse' : 'ndjson'
    }
    return mode === 'sse'
      ? drainHostedWriteSseFrames(bufferRef, final)
      : drainHostedWriteNdjsonFrames(bufferRef, final)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      bufferRef.value += decoder.decode(value, { stream: true })
    }
    if (done) {
      bufferRef.value += decoder.decode()
    }

    const events = drain(done)
    for (const event of events) {
      yield event
    }
    if (hasTerminalHostedWriteEvent(events)) return

    if (done) return
  }
}

function normalizeAutopilotStreamEvent(
  eventName: string | undefined,
  raw: unknown,
): PlotPilotAutopilotStreamEvent | null {
  if (raw === null || raw === undefined || raw === '[DONE]') return null

  if (!isRecord(raw)) {
    return {
      type: 'unknown',
      event: eventName,
      raw,
    }
  }

  return {
    ...raw,
    type: stringValue(eventName || raw.type, 'event').trim() || 'event',
    message: optionalString(raw.message),
    timestamp: optionalString(raw.timestamp),
    metadata: isRecord(raw.metadata) ? raw.metadata : undefined,
  }
}

function normalizeSetupStreamEvent(
  eventName: string | undefined,
  raw: unknown,
): PlotPilotSetupStreamEvent | null {
  if (raw === null || raw === undefined || raw === '[DONE]') return null
  if (!isRecord(raw)) return { type: 'unknown', raw }

  const type = stringValue(eventName || raw.type, 'event').trim() || 'event'
  if (type === 'approval_required') {
    return {
      ...raw,
      type,
      session_id: stringValue(raw.session_id),
      status: optionalString(raw.status),
      next_action: optionalString(raw.next_action),
    }
  }
  if (type === 'error') {
    return {
      ...raw,
      type,
      message: stringValue(raw.message ?? raw.error, 'Stream error'),
    }
  }
  if (type === 'done') {
    return {
      ...raw,
      type,
      plot_options: Array.isArray(raw.plot_options)
        ? raw.plot_options as PlotPilotMainPlotOptionItem[]
        : undefined,
      plot_outline: isRecord(raw.plot_outline)
        ? raw.plot_outline
        : raw.plot_outline === null
          ? null
          : undefined,
      invocation_session_id: optionalString(raw.invocation_session_id),
    }
  }
  return {
    ...raw,
    type,
  }
}

function normalizeAutopilotChapterStreamEvent(
  eventName: string | undefined,
  raw: unknown,
): PlotPilotAutopilotChapterStreamEvent | null {
  if (raw === null || raw === undefined || raw === '[DONE]') return null
  if (!isRecord(raw)) return { type: 'unknown', raw }

  return {
    ...raw,
    type: stringValue(eventName || raw.type, 'event').trim() || 'event',
    message: optionalString(raw.message),
    timestamp: optionalString(raw.timestamp),
    metadata: isRecord(raw.metadata) ? raw.metadata : undefined,
  } as PlotPilotAutopilotChapterStreamEvent
}

function drainAutopilotSseFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotAutopilotStreamEvent[] {
  const events: PlotPilotAutopilotStreamEvent[] = []
  let separatorIndex = bufferRef.value.indexOf('\n\n')
  while (separatorIndex >= 0) {
    const block = bufferRef.value.slice(0, separatorIndex)
    bufferRef.value = bufferRef.value.slice(separatorIndex + 2)
    const parsed = parseSseBlock(block)
    const event = parsed ? normalizeAutopilotStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    separatorIndex = bufferRef.value.indexOf('\n\n')
  }

  if (final && bufferRef.value.trim()) {
    const parsed = parseSseBlock(bufferRef.value)
    const event = parsed ? normalizeAutopilotStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function drainAutopilotNdjsonFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotAutopilotStreamEvent[] {
  const events: PlotPilotAutopilotStreamEvent[] = []
  let newlineIndex = bufferRef.value.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = bufferRef.value.slice(0, newlineIndex).trim()
    bufferRef.value = bufferRef.value.slice(newlineIndex + 1)
    if (line) {
      const payloadText = line.startsWith('data:')
        ? line.slice('data:'.length).trim()
        : line
      const payload = parseJsonPayload(payloadText)
      const event = payload === null ? null : normalizeAutopilotStreamEvent(undefined, payload)
      if (event) events.push(event)
    }
    newlineIndex = bufferRef.value.indexOf('\n')
  }

  if (final && bufferRef.value.trim()) {
    const payloadText = bufferRef.value.trim().startsWith('data:')
      ? bufferRef.value.trim().slice('data:'.length).trim()
      : bufferRef.value.trim()
    const payload = parseJsonPayload(payloadText)
    const event = payload === null ? null : normalizeAutopilotStreamEvent(undefined, payload)
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function hasTerminalAutopilotEvent(events: PlotPilotAutopilotStreamEvent[]): boolean {
  return events.some((event) => (
    event.type === 'error' ||
    event.type === 'autopilot_complete' ||
    event.type === 'autopilot_stopped' ||
    event.type === 'paused_for_review'
  ))
}

async function* readAutopilotStreamEvents(
  response: Response,
): AsyncGenerator<PlotPilotAutopilotStreamEvent, void, unknown> {
  if (!response.body) return

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  let mode: 'sse' | 'ndjson' | null = contentType.includes('text/event-stream')
    ? 'sse'
    : contentType.includes('ndjson')
      ? 'ndjson'
      : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferRef = { value: '' }

  const drain = (final = false): PlotPilotAutopilotStreamEvent[] => {
    bufferRef.value = bufferRef.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (mode === null) {
      mode = /^\s*(event|data):/m.test(bufferRef.value) ? 'sse' : 'ndjson'
    }
    return mode === 'sse'
      ? drainAutopilotSseFrames(bufferRef, final)
      : drainAutopilotNdjsonFrames(bufferRef, final)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      bufferRef.value += decoder.decode(value, { stream: true })
    }
    if (done) {
      bufferRef.value += decoder.decode()
    }

    const events = drain(done)
    for (const event of events) {
      yield event
    }
    if (hasTerminalAutopilotEvent(events)) return

    if (done) {
      return
    }
  }
}

function drainSetupSseFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotSetupStreamEvent[] {
  const events: PlotPilotSetupStreamEvent[] = []
  let separatorIndex = bufferRef.value.indexOf('\n\n')
  while (separatorIndex >= 0) {
    const block = bufferRef.value.slice(0, separatorIndex)
    bufferRef.value = bufferRef.value.slice(separatorIndex + 2)
    const parsed = parseSseBlock(block)
    const event = parsed ? normalizeSetupStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    separatorIndex = bufferRef.value.indexOf('\n\n')
  }

  if (final && bufferRef.value.trim()) {
    const parsed = parseSseBlock(bufferRef.value)
    const event = parsed ? normalizeSetupStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function drainSetupNdjsonFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotSetupStreamEvent[] {
  const events: PlotPilotSetupStreamEvent[] = []
  let newlineIndex = bufferRef.value.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = bufferRef.value.slice(0, newlineIndex).trim()
    bufferRef.value = bufferRef.value.slice(newlineIndex + 1)
    if (line) {
      const payloadText = line.startsWith('data:')
        ? line.slice('data:'.length).trim()
        : line
      const payload = parseJsonPayload(payloadText)
      const event = payload === null ? null : normalizeSetupStreamEvent(undefined, payload)
      if (event) events.push(event)
    }
    newlineIndex = bufferRef.value.indexOf('\n')
  }

  if (final && bufferRef.value.trim()) {
    const payloadText = bufferRef.value.trim().startsWith('data:')
      ? bufferRef.value.trim().slice('data:'.length).trim()
      : bufferRef.value.trim()
    const payload = parseJsonPayload(payloadText)
    const event = payload === null ? null : normalizeSetupStreamEvent(undefined, payload)
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function hasTerminalSetupEvent(events: PlotPilotSetupStreamEvent[]): boolean {
  return events.some((event) => (
    event.type === 'done' ||
    event.type === 'error'
  ))
}

async function* readSetupStreamEvents(
  response: Response,
): AsyncGenerator<PlotPilotSetupStreamEvent, void, unknown> {
  if (!response.body) return

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  let mode: 'sse' | 'ndjson' | null = contentType.includes('text/event-stream')
    ? 'sse'
    : contentType.includes('ndjson')
      ? 'ndjson'
      : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferRef = { value: '' }

  const drain = (final = false): PlotPilotSetupStreamEvent[] => {
    bufferRef.value = bufferRef.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (mode === null) {
      mode = /^\s*(event|data):/m.test(bufferRef.value) ? 'sse' : 'ndjson'
    }
    return mode === 'sse'
      ? drainSetupSseFrames(bufferRef, final)
      : drainSetupNdjsonFrames(bufferRef, final)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      bufferRef.value += decoder.decode(value, { stream: true })
    }
    if (done) {
      bufferRef.value += decoder.decode()
    }

    const events = drain(done)
    for (const event of events) {
      yield event
    }
    if (hasTerminalSetupEvent(events)) return

    if (done) return
  }
}

function drainAutopilotChapterSseFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotAutopilotChapterStreamEvent[] {
  const events: PlotPilotAutopilotChapterStreamEvent[] = []
  let separatorIndex = bufferRef.value.indexOf('\n\n')
  while (separatorIndex >= 0) {
    const block = bufferRef.value.slice(0, separatorIndex)
    bufferRef.value = bufferRef.value.slice(separatorIndex + 2)
    const parsed = parseSseBlock(block)
    const event = parsed ? normalizeAutopilotChapterStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    separatorIndex = bufferRef.value.indexOf('\n\n')
  }

  if (final && bufferRef.value.trim()) {
    const parsed = parseSseBlock(bufferRef.value)
    const event = parsed ? normalizeAutopilotChapterStreamEvent(parsed.eventName, parsed.payload) : null
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function drainAutopilotChapterNdjsonFrames(
  bufferRef: { value: string },
  final = false,
): PlotPilotAutopilotChapterStreamEvent[] {
  const events: PlotPilotAutopilotChapterStreamEvent[] = []
  let newlineIndex = bufferRef.value.indexOf('\n')
  while (newlineIndex >= 0) {
    const line = bufferRef.value.slice(0, newlineIndex).trim()
    bufferRef.value = bufferRef.value.slice(newlineIndex + 1)
    if (line) {
      const payloadText = line.startsWith('data:')
        ? line.slice('data:'.length).trim()
        : line
      const payload = parseJsonPayload(payloadText)
      const event = payload === null ? null : normalizeAutopilotChapterStreamEvent(undefined, payload)
      if (event) events.push(event)
    }
    newlineIndex = bufferRef.value.indexOf('\n')
  }

  if (final && bufferRef.value.trim()) {
    const payloadText = bufferRef.value.trim().startsWith('data:')
      ? bufferRef.value.trim().slice('data:'.length).trim()
      : bufferRef.value.trim()
    const payload = parseJsonPayload(payloadText)
    const event = payload === null ? null : normalizeAutopilotChapterStreamEvent(undefined, payload)
    if (event) events.push(event)
    bufferRef.value = ''
  }

  return events
}

function hasTerminalAutopilotChapterEvent(events: PlotPilotAutopilotChapterStreamEvent[]): boolean {
  return events.some((event) => (
    event.type === 'autopilot_stopped' ||
    event.type === 'paused_for_review' ||
    event.type === 'error'
  ))
}

async function* readAutopilotChapterStreamEvents(
  response: Response,
): AsyncGenerator<PlotPilotAutopilotChapterStreamEvent, void, unknown> {
  if (!response.body) return

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  let mode: 'sse' | 'ndjson' | null = contentType.includes('text/event-stream')
    ? 'sse'
    : contentType.includes('ndjson')
      ? 'ndjson'
      : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const bufferRef = { value: '' }

  const drain = (final = false): PlotPilotAutopilotChapterStreamEvent[] => {
    bufferRef.value = bufferRef.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (mode === null) {
      mode = /^\s*(event|data):/m.test(bufferRef.value) ? 'sse' : 'ndjson'
    }
    return mode === 'sse'
      ? drainAutopilotChapterSseFrames(bufferRef, final)
      : drainAutopilotChapterNdjsonFrames(bufferRef, final)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (value) {
      bufferRef.value += decoder.decode(value, { stream: true })
    }
    if (done) {
      bufferRef.value += decoder.decode()
    }

    const events = drain(done)
    for (const event of events) {
      yield event
    }
    if (hasTerminalAutopilotChapterEvent(events)) return

    if (done) return
  }
}

async function* generateBibleStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  novelId: string,
  options: PlotPilotGenerateBibleStreamOptions = {},
): AsyncGenerator<GenerateBibleStreamEvent, void, unknown> {
  const path = apiPath(`/bible/novels/${encodeSegment(novelId)}/generate-stream`, {
    stage: options.stage ?? 'worldbuilding',
  })
  const url = joinUrl(roots.apiBaseUrl, path)
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: '{}',
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readBibleStreamEvents(response, novelId)
}

async function* generateChapterStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  novelId: string,
  data: GenerateChapterRequest,
  options: PlotPilotRequestOptions = {},
): AsyncGenerator<GenerateChapterStreamEvent, void, unknown> {
  const url = joinUrl(roots.apiBaseUrl, `/novels/${encodeSegment(novelId)}/generate-chapter-stream`)
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readChapterStreamEvents(response)
}

async function* hostedWriteStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  novelId: string,
  data: PlotPilotHostedWriteRequest,
  options: PlotPilotRequestOptions = {},
): AsyncGenerator<PlotPilotHostedWriteStreamEvent, void, unknown> {
  const url = joinUrl(roots.apiBaseUrl, `/novels/${encodeSegment(novelId)}/hosted-write-stream`)
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readHostedWriteStreamEvents(response)
}

async function* autopilotLogStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  novelId: string,
  afterSeq?: number,
  options: PlotPilotRequestOptions = {},
): AsyncGenerator<PlotPilotAutopilotStreamEvent, void, unknown> {
  const url = joinUrl(
    roots.apiBaseUrl,
    apiPath(`/autopilot/${encodeSegment(novelId)}/stream`, {
      after_seq: afterSeq && afterSeq > 0 ? afterSeq : undefined,
    }),
  )
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')

  const response = await fetchImpl(url, {
    method: 'GET',
    headers,
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readAutopilotStreamEvents(response)
}

async function* setupStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  path: string,
  options: PlotPilotRequestOptions = {},
): AsyncGenerator<PlotPilotSetupStreamEvent, void, unknown> {
  const url = joinUrl(roots.apiBaseUrl, path)
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readSetupStreamEvents(response)
}

async function* autopilotChapterStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  novelId: string,
  options: PlotPilotRequestOptions = {},
): AsyncGenerator<PlotPilotAutopilotChapterStreamEvent, void, unknown> {
  const url = joinUrl(roots.apiBaseUrl, `/autopilot/${encodeSegment(novelId)}/chapter-stream`)
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')

  const response = await fetchImpl(url, {
    method: 'GET',
    headers,
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readAutopilotChapterStreamEvents(response)
}

async function* autopilotEventsStreamFromRoots(
  fetchImpl: PlotPilotFetch,
  roots: PlotPilotRoots,
  clientHeaders: HeadersInit | undefined,
  novelId: string,
  options: PlotPilotRequestOptions = {},
): AsyncGenerator<PlotPilotAutopilotStreamEvent, void, unknown> {
  const url = joinUrl(roots.apiBaseUrl, `/autopilot/${encodeSegment(novelId)}/events`)
  const headers = mergeHeaders(clientHeaders, options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'text/event-stream')

  const response = await fetchImpl(url, {
    method: 'GET',
    headers,
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new PlotPilotHttpError(response.status, url, await readErrorBody(response))
  }

  yield* readAutopilotStreamEvents(response)
}

function requestOptionsFromCallOptions(options: PlotPilotCallOptions): PlotPilotRequestOptions {
  return {
    signal: options.signal,
    headers: options.headers,
  }
}

export function createPlotPilotClient(options: PlotPilotClientOptions = {}): PlotPilotClient {
  const roots = resolvePlotPilotRoots(options)
  const fetchImpl = resolveFetch(options.fetch)
  const clientHeaders = options.headers

  return {
    health(requestOptions) {
      return requestJson<PlmHealth>(
        fetchImpl,
        roots,
        '/health',
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    listNovels(requestOptions) {
      return requestJson<NovelDTO[]>(
        fetchImpl,
        roots,
        '/novels/',
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getNovel(novelId, requestOptions) {
      return requestJson<NovelDTO>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    createNovel(data, requestOptions) {
      return requestJson<NovelDTO>(
        fetchImpl,
        roots,
        '/novels/',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    updateNovel(novelId, data, requestOptions) {
      return requestJson<NovelDTO>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    setNovelAutoApproveMode(novelId, enabled, requestOptions) {
      return requestJson<NovelDTO>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/auto-approve-mode`,
        {
          method: 'PATCH',
          body: JSON.stringify({ auto_approve_mode: enabled }),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getLlmControl(requestOptions) {
      return requestJson<PlotPilotLlmControlPanelData>(
        fetchImpl,
        roots,
        '/llm-control',
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    updateLlmControl(data, requestOptions) {
      return requestJson<PlotPilotLlmControlPanelData>(
        fetchImpl,
        roots,
        '/llm-control',
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getCodexStatus(requestOptions) {
      return requestJson<PlotPilotCodexStatusResponse>(
        fetchImpl,
        roots,
        '/llm-control/codex/status',
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    startCodexLogin(requestOptions) {
      return requestJson<PlotPilotCodexLoginStartResponse>(
        fetchImpl,
        roots,
        '/llm-control/codex/login/start',
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    logoutCodex(requestOptions) {
      return requestJson<PlotPilotCodexLogoutResponse>(
        fetchImpl,
        roots,
        '/llm-control/codex/logout',
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    getWritingSpec(novelId, requestOptions) {
      return requestJson<PlotPilotWritingSpecBindingResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/writing-spec`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    setWritingSpec(novelId, data, requestOptions) {
      return requestJson<PlotPilotWritingSpecBindingResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/writing-spec`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getHumanizer(novelId, requestOptions) {
      return requestJson<PlotPilotHumanizerSettingsResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/humanizer`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    setHumanizer(novelId, data, requestOptions) {
      return requestJson<PlotPilotHumanizerSettingsResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/humanizer`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    createInvocation(data, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        '/ai-invocations',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getInvocation(sessionId, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    acceptInvocation(sessionId, data, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/accept`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    resumeInvocation(sessionId, data = {}, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/resume`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    retryInvocation(sessionId, data = {}, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/retry`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    rejectInvocation(sessionId, data, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    commitInvocation(sessionId, data, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/commits`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    previewInvocationPromptDraft(sessionId, data, requestOptions) {
      return requestJson<PlotPilotInvocationPromptDraftResponse>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/prompt-draft/preview`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    saveInvocationPromptDraft(sessionId, data, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/prompt-draft`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    updateInvocationVariables(sessionId, data, requestOptions) {
      return requestJson<PlotPilotInvocationResponseDTO>(
        fetchImpl,
        roots,
        `/ai-invocations/${encodeSegment(sessionId)}/variables`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getPlotOutline(novelId, requestOptions) {
      return requestJson<PlotPilotPlotOutlineResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/setup/plot-outline`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    savePlotOutline(novelId, data, requestOptions) {
      return requestJson<PlotPilotPlotOutlineResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/setup/plot-outline`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    generatePlotOutline(novelId, requestOptions) {
      return requestJson<PlotPilotPlotOutlineResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/setup/generate-plot-outline`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    generatePlotOutlineStream(novelId, requestOptions) {
      return setupStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        `/novels/${encodeSegment(novelId)}/setup/generate-plot-outline-stream`,
        requestOptions,
      )
    },
    suggestMainPlotOptions(novelId, requestOptions) {
      return requestJson<PlotPilotSuggestMainPlotOptionsResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/setup/suggest-main-plot-options`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    suggestMainPlotOptionsStream(novelId, requestOptions) {
      return setupStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        `/novels/${encodeSegment(novelId)}/setup/suggest-main-plot-options-stream`,
        requestOptions,
      )
    },
    planNovel(novelId, data = {}, requestOptions) {
      return requestJson<PlotPilotPlanNovelResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/plan`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getPlanningStructure(novelId, requestOptions) {
      return requestJson<PlotPilotPlanningStructureResponse>(
        fetchImpl,
        roots,
        `/planning/novels/${encodeSegment(novelId)}/structure`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    continuePlanning(novelId, data, requestOptions) {
      return requestJson<Record<string, unknown>>(
        fetchImpl,
        roots,
        `/planning/novels/${encodeSegment(novelId)}/continue`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getBibleStatus(novelId, requestOptions) {
      return requestJson<BibleStatusDTO>(
        fetchImpl,
        roots,
        `/bible/novels/${encodeSegment(novelId)}/bible/status`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getBible(novelId, requestOptions) {
      return requestJson<BibleDTO>(
        fetchImpl,
        roots,
        `/bible/novels/${encodeSegment(novelId)}/bible`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    updateBible(novelId, data, requestOptions) {
      return requestJson<BibleDTO>(
        fetchImpl,
        roots,
        `/bible/novels/${encodeSegment(novelId)}/bible`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    listChapters(novelId, requestOptions) {
      return requestJson<ChapterDTO[]>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/chapters`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getChapter(novelId, chapterNumber, requestOptions) {
      return requestJson<ChapterDTO>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    ensureChapter(novelId, chapterNumber, data = {}, requestOptions) {
      return requestJson<ChapterDTO>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}/ensure`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    updateChapter(novelId, chapterNumber, data, requestOptions) {
      return requestJson<ChapterDTO>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    updateChapterMicroBeats(novelId, chapterNumber, data, requestOptions) {
      return requestJson<ChapterMicroBeatsResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}/micro-beats`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    generateBeatSheet(data, requestOptions) {
      return requestJson<BeatSheetDTO>(
        fetchImpl,
        roots,
        '/beat-sheets/generate',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    getBeatSheet(chapterId, requestOptions) {
      return requestJson<BeatSheetDTO>(
        fetchImpl,
        roots,
        `/beat-sheets/${encodeSegment(chapterId)}`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    generateBibleStream(novelId, streamOptions) {
      return generateBibleStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        novelId,
        streamOptions,
      )
    },
    generateChapterStream(novelId, data, streamOptions) {
      return generateChapterStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        novelId,
        data,
        streamOptions,
      )
    },
    hostedWriteStream(novelId, data, streamOptions) {
      return hostedWriteStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        novelId,
        data,
        streamOptions,
      )
    },
    getAutopilotStatus(novelId, requestOptions) {
      return requestJson<PlotPilotAutopilotStatusResponse>(
        fetchImpl,
        roots,
        `/autopilot/${encodeSegment(novelId)}/status`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    startAutopilot(novelId, data, requestOptions) {
      return requestJson<PlotPilotAutopilotControlResponse>(
        fetchImpl,
        roots,
        `/autopilot/${encodeSegment(novelId)}/start`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        clientHeaders,
        requestOptions,
      )
    },
    stopAutopilot(novelId, requestOptions) {
      return requestJson<PlotPilotAutopilotControlResponse>(
        fetchImpl,
        roots,
        `/autopilot/${encodeSegment(novelId)}/stop`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    resumeAutopilot(novelId, requestOptions) {
      return requestJson<PlotPilotAutopilotControlResponse>(
        fetchImpl,
        roots,
        `/autopilot/${encodeSegment(novelId)}/resume`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    getAutopilotCircuitBreaker(novelId, requestOptions) {
      return requestJson<PlotPilotAutopilotCircuitBreakerResponse>(
        fetchImpl,
        roots,
        `/autopilot/${encodeSegment(novelId)}/circuit-breaker`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    resetAutopilotCircuitBreaker(novelId, requestOptions) {
      return requestJson<PlotPilotAutopilotControlResponse>(
        fetchImpl,
        roots,
        `/autopilot/${encodeSegment(novelId)}/circuit-breaker/reset`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    autopilotLogStream(novelId, afterSeq, streamOptions) {
      return autopilotLogStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        novelId,
        afterSeq,
        streamOptions,
      )
    },
    autopilotChapterStream(novelId, streamOptions) {
      return autopilotChapterStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        novelId,
        streamOptions,
      )
    },
    autopilotEventsStream(novelId, streamOptions) {
      return autopilotEventsStreamFromRoots(
        fetchImpl,
        roots,
        clientHeaders,
        novelId,
        streamOptions,
      )
    },
    reviewChapter(novelId, chapterNumber, requestOptions) {
      return requestJson<PlotPilotReviewChapterResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}/review`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    simulateReaders(novelId, chapterNumber, requestOptions) {
      return requestJson<PlotPilotReaderSimulationResponse>(
        fetchImpl,
        roots,
        `/reader/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}/simulate`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    getChapterSimulation(novelId, chapterNumber, requestOptions) {
      return requestJson<PlotPilotReaderSimulationResponse>(
        fetchImpl,
        roots,
        `/reader/novels/${encodeSegment(novelId)}/chapters/${encodeSegment(chapterNumber)}/simulation`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    listReaderSimulations(novelId, requestOptions) {
      return requestJson<PlotPilotReaderSimulationListResponse>(
        fetchImpl,
        roots,
        `/reader/novels/${encodeSegment(novelId)}/simulations`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getChurnAlerts(novelId, threshold = 60, requestOptions) {
      return requestJson<PlotPilotChurnAlertsResponse>(
        fetchImpl,
        roots,
        apiPath(`/reader/novels/${encodeSegment(novelId)}/churn-alerts`, { threshold }),
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    inferKnowledgeGraph(novelId, requestOptions) {
      return requestJson<PlotPilotKnowledgeGraphResponse>(
        fetchImpl,
        roots,
        `/knowledge-graph/novels/${encodeSegment(novelId)}/infer`,
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    getKnowledgeGraphStatistics(novelId, requestOptions) {
      return requestJson<PlotPilotKnowledgeGraphResponse>(
        fetchImpl,
        roots,
        `/knowledge-graph/novels/${encodeSegment(novelId)}/statistics`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getKnowledgeGraphTriples(novelId, params = {}, requestOptions) {
      return requestJson<PlotPilotKnowledgeGraphResponse>(
        fetchImpl,
        roots,
        apiPath(`/knowledge-graph/novels/${encodeSegment(novelId)}/triples`, params),
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    searchKnowledgeGraph(novelId, data, requestOptions) {
      return requestJson<PlotPilotKnowledgeGraphResponse>(
        fetchImpl,
        roots,
        apiPath(`/knowledge-graph/novels/${encodeSegment(novelId)}/search`, {
          query: data.query,
          limit: data.limit ?? 10,
          min_score: data.min_score ?? 0.5,
        }),
        { method: 'POST' },
        clientHeaders,
        requestOptions,
      )
    },
    listTraces(novelId, requestOptions) {
      return requestJson<PlotPilotTraceListResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/traces`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getTraceStats(novelId, requestOptions) {
      return requestJson<PlotPilotTraceStatsResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/traces/stats`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    listAiTraces(novelId, limit = 80, requestOptions) {
      return requestJson<PlotPilotAiTraceListResponse>(
        fetchImpl,
        roots,
        apiPath(`/novels/${encodeSegment(novelId)}/ai-traces`, { limit }),
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getAiTraceTimeline(novelId, traceId, requestOptions) {
      return requestJson<PlotPilotAiTraceTimelineResponse>(
        fetchImpl,
        roots,
        `/novels/${encodeSegment(novelId)}/traces/${encodeSegment(traceId)}/timeline`,
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    getPromptStats(requestOptions) {
      return requestJson<PlotPilotPromptStatsResponse>(
        fetchImpl,
        roots,
        '/llm-control/prompts/stats',
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
    listPrompts(requestOptions) {
      return requestJson<PlotPilotPromptListResponse>(
        fetchImpl,
        roots,
        '/llm-control/prompts',
        { method: 'GET' },
        clientHeaders,
        requestOptions,
      )
    },
  }
}

export function health(options: PlotPilotCallOptions = {}): Promise<PlmHealth> {
  return createPlotPilotClient(options).health(requestOptionsFromCallOptions(options))
}

export function listNovels(options: PlotPilotCallOptions = {}): Promise<NovelDTO[]> {
  return createPlotPilotClient(options).listNovels(requestOptionsFromCallOptions(options))
}

export function getNovel(
  novelId: string,
  options: PlotPilotCallOptions = {},
): Promise<NovelDTO> {
  return createPlotPilotClient(options).getNovel(novelId, requestOptionsFromCallOptions(options))
}

export function createNovel(
  data: CreateNovelRequest,
  options: PlotPilotCallOptions = {},
): Promise<NovelDTO> {
  return createPlotPilotClient(options).createNovel(data, requestOptionsFromCallOptions(options))
}

export function getBible(
  novelId: string,
  options: PlotPilotCallOptions = {},
): Promise<BibleDTO> {
  return createPlotPilotClient(options).getBible(novelId, requestOptionsFromCallOptions(options))
}

export function generateBibleStream(
  novelId: string,
  options: PlotPilotGenerateBibleStreamCallOptions = {},
): AsyncGenerator<GenerateBibleStreamEvent, void, unknown> {
  return createPlotPilotClient(options).generateBibleStream(novelId, options)
}

export function generateChapterStream(
  novelId: string,
  data: GenerateChapterRequest,
  options: PlotPilotCallOptions = {},
): AsyncGenerator<GenerateChapterStreamEvent, void, unknown> {
  return createPlotPilotClient(options).generateChapterStream(novelId, data, requestOptionsFromCallOptions(options))
}
