export type DramaGraphEventSource =
  | 'graph'
  | 'plm'
  | 'crew'
  | 'memory'
  | 'runtime'
  | 'manual'
  | (string & {})

export type DramaGraphEventSeverity = 'info' | 'warning' | 'error'

export interface DramaGraphEventTarget {
  graphId?: string
  nodeId?: string
  edgeId?: string
  chapterId?: string
  sceneId?: string
  draftId?: string
  taskId?: string
  agentId?: string
  novelId?: string
}

export interface DramaGraphEventInput {
  type: string
  actor?: string
  source?: DramaGraphEventSource
  target?: DramaGraphEventTarget
  severity?: DramaGraphEventSeverity
  status?: string
  summary?: string
  details?: Record<string, unknown>
}

export interface DramaGraphEvent {
  schema: 'drama.graph_event.v1'
  id: string
  graphId: string
  type: string
  actor?: string
  source?: DramaGraphEventSource
  target?: DramaGraphEventTarget
  severity?: DramaGraphEventSeverity
  status?: string
  summary?: string
  details?: Record<string, unknown>
  createdAt: number
}

export function createDramaGraphEvent(
  graphId: string,
  input: DramaGraphEventInput,
  options: { now?: number; random?: () => number } = {},
): DramaGraphEvent {
  const now = options.now ?? Date.now()
  const random = options.random ?? Math.random
  const normalized = compactDramaGraphEvent(input)
  return {
    schema: 'drama.graph_event.v1',
    id: `${graphId}:${now}:${random().toString(36).slice(2, 8)}`,
    graphId,
    type: normalized.type,
    ...(normalized.actor ? { actor: normalized.actor } : {}),
    ...(normalized.source ? { source: normalized.source } : {}),
    ...(normalized.target ? { target: normalized.target } : {}),
    ...(normalized.severity ? { severity: normalized.severity } : {}),
    ...(normalized.status ? { status: normalized.status } : {}),
    ...(normalized.summary ? { summary: normalized.summary } : {}),
    ...(normalized.details ? { details: normalized.details } : {}),
    createdAt: now,
  }
}

export function compactDramaGraphEvent(input: DramaGraphEventInput): DramaGraphEventInput {
  return {
    ...input,
    target: compactTarget(input.target),
    details: compactDetails(input.details),
  }
}

function compactTarget(target: DramaGraphEventTarget | undefined): DramaGraphEventTarget | undefined {
  if (!target) return undefined
  const compacted = compactDetails(target) as DramaGraphEventTarget | undefined
  return compacted && Object.keys(compacted).length > 0 ? compacted : undefined
}

function compactDetails<T extends object | undefined>(details: T): T | undefined {
  if (!details) return undefined
  const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== '')
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries) as T
}
