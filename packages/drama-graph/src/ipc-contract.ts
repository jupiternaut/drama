import type {
  DramaDraftUpsertInput,
  DramaEdgeCreateInput,
  DramaEdgeUpdate,
  DramaGraphEventInput,
  DramaGraph,
  DramaNodeCreateInput,
  DramaNodeDeleteInput,
  DramaNodePositionUpdate,
  DramaNodeUpdate,
  DramaTaskBindingDeleteInput,
  DramaTaskBindingUpsertInput,
} from '@drama/core'

export interface DramaGraphLoadOptions {
  graphId?: string
  storyletPath?: string
  importStoryletIfMissing?: boolean
}

export interface DramaGraphLoadResult {
  graph: DramaGraph
  path: string
  sourcePath?: string
  imported: boolean
  backupPath?: string
}

export interface DramaGraphNodePositionUpdateRequest {
  graphId: string
  updates: DramaNodePositionUpdate[]
}

export interface DramaGraphNodeUpdateRequest {
  graphId: string
  update: DramaNodeUpdate
}

export interface DramaGraphNodeCreateRequest {
  graphId: string
  input: DramaNodeCreateInput
}

export interface DramaGraphNodeDeleteRequest {
  graphId: string
  input: DramaNodeDeleteInput
}

export interface DramaGraphDraftUpsertRequest {
  graphId: string
  input: DramaDraftUpsertInput
  event?: DramaGraphEventInput
}

export interface DramaGraphEventRecordRequest {
  graphId?: string
  event: DramaGraphEventInput
}

export interface DramaGraphEdgeUpdateRequest {
  graphId: string
  update: DramaEdgeUpdate
}

export interface DramaGraphEdgeCreateRequest {
  graphId: string
  input: DramaEdgeCreateInput
}

export interface DramaGraphEdgeDeleteRequest {
  graphId: string
  edgeId: string
}

export interface DramaGraphTaskBindingUpsertRequest {
  graphId: string
  input: DramaTaskBindingUpsertInput
}

export interface DramaGraphTaskBindingDeleteRequest {
  graphId: string
  input: DramaTaskBindingDeleteInput
}

export interface DramaGraphMutationResult {
  graph: DramaGraph
  path: string
  backupPath?: string
}

export interface DramaGraphHistoryRequest {
  graphId: string
  maxBackups?: number
  maxEvents?: number
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

export interface DramaGraphHistoryResult {
  graphId: string
  backups: DramaGraphHistoryBackup[]
  events: DramaGraphHistoryEvent[]
  eventLogPath: string
}

export interface DramaGraphRestoreBackupRequest {
  graphId: string
  backupPath: string
}

export type DramaProjectFileSource = 'graph' | 'plm' | 'storylet' | 'manual' | string

export interface DramaProjectFileRecordRequest {
  projectId: string
  source: DramaProjectFileSource
  type: string
  title?: string
  summary?: Record<string, unknown>
  payload?: unknown
}

export interface DramaProjectFileRecordResult {
  projectDir: string
  filePath: string
}
