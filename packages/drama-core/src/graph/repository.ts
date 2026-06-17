import type { DramaGraph } from './schema.ts'
import type { DramaGraphEventInput } from './events.ts'

export interface DramaGraphSaveResult {
  path: string
  backupPath?: string
}

export interface DramaGraphHistoryBackup {
  path: string
  createdAt: number
  graphName?: string
  nodeCount?: number
  edgeCount?: number
  valid: boolean
  error?: string
}

export interface DramaGraphHistoryEvent {
  id: string
  graphId: string
  type: string
  actor?: string
  source?: string
  target?: Record<string, unknown>
  severity?: string
  status?: string
  summary?: string
  details?: Record<string, unknown>
  createdAt: number
}

export interface DramaGraphHistorySnapshot {
  graphId: string
  backups: DramaGraphHistoryBackup[]
  events: DramaGraphHistoryEvent[]
  eventLogPath: string
}

export interface DramaGraphHistoryOptions {
  maxBackups?: number
  maxEvents?: number
}

export interface DramaGraphRepository {
  loadGraph(graphId: string): Promise<DramaGraph>
  saveGraph(graph: DramaGraph, event: DramaGraphEventInput): Promise<DramaGraphSaveResult>
  recordEvent(graphId: string, event: DramaGraphEventInput): Promise<void>
  listHistory(graphId: string, options?: DramaGraphHistoryOptions): Promise<DramaGraphHistorySnapshot>
  restoreBackup(
    graphId: string,
    backupPath: string,
    event?: DramaGraphEventInput,
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }>
}
