export type DramaGraphNodeKind =
  | 'story'
  | 'world'
  | 'character'
  | 'location'
  | 'plot'
  | 'chapter'
  | 'scene'
  | 'other'

export type DramaEdgeType =
  | 'contains'
  | 'next'
  | 'blocks'
  | 'supports'
  | 'reveals'
  | 'causal'
  | 'observes'
  | 'custom'

export interface DramaSourceRef {
  format: 'storylet' | 'plotpilot' | 'native'
  id: string
  kind: 'graph' | 'card' | 'edge' | 'novel' | 'chapter' | 'task'
}

export interface DramaGraphField {
  id: string
  key: string
  label: string
  value: unknown
  text: string
  sourceRefs?: DramaSourceRef[]
}

export interface DramaNode {
  id: string
  kind: DramaGraphNodeKind
  title: string
  description?: string
  fields: DramaGraphField[]
  position: { x: number; y: number }
  size: { width: number; height: number }
  sourceRefs: DramaSourceRef[]
  createdAt: number
  updatedAt: number
}

export interface DramaEdge {
  id: string
  sourceId: string
  targetId: string
  type: DramaEdgeType
  label: string
  sourceRefs: DramaSourceRef[]
  createdAt: number
  updatedAt: number
}

export type DramaContentStatus = 'empty' | 'draft' | 'revision' | 'final' | 'blocked'

export interface DramaScene {
  id: string
  nodeId: string
  chapterId?: string
  order?: number
  status: DramaContentStatus
  draftIds: string[]
}

export interface DramaChapter {
  id: string
  nodeId?: string
  title: string
  number: number
  sceneIds: string[]
  draftIds: string[]
  status: DramaContentStatus
}

export interface DramaBible {
  id: string
  title: string
  worldNodeIds: string[]
  characterNodeIds: string[]
  locationNodeIds: string[]
  plotNodeIds: string[]
}

export interface DramaDraft {
  id: string
  targetType: 'graph' | 'chapter' | 'scene' | 'node'
  targetId: string
  content: string
  status: Exclude<DramaContentStatus, 'empty'>
  source: 'manual' | 'plotpilot' | 'crew'
  createdAt: number
  updatedAt: number
}

export interface DramaTaskBinding {
  id: string
  nodeId?: string
  edgeId?: string
  taskId: string
  agentId?: string
  crewId?: string
  status: 'pending' | 'active' | 'done' | 'cancelled'
  createdAt: number
  updatedAt: number
}

export interface DramaGraph {
  schema: 'drama.graph.v1'
  id: string
  title: string
  createdAt: number
  updatedAt: number
  source: {
    format: 'native' | 'storylet'
    path?: string
    graphId?: string
  }
  bible: DramaBible
  nodes: DramaNode[]
  edges: DramaEdge[]
  scenes: DramaScene[]
  chapters: DramaChapter[]
  drafts: DramaDraft[]
  taskBindings: DramaTaskBinding[]
  metadata: Record<string, unknown>
}

export interface DramaGraphSummary {
  nodeCount: number
  edgeCount: number
  sceneCount: number
  chapterCount: number
  draftCount: number
  taskBindingCount: number
}

export type DramaGraphDiagnosticSeverity = 'error' | 'warning' | 'info'

export type DramaGraphDiagnosticKind =
  | 'dangling_edge'
  | 'self_loop'
  | 'duplicate_edge'
  | 'isolated_node'
  | 'chapter_next_gap'
  | 'contains_cycle'

export interface DramaGraphDiagnostic {
  id: string
  severity: DramaGraphDiagnosticSeverity
  kind: DramaGraphDiagnosticKind
  message: string
  nodeIds?: string[]
  edgeIds?: string[]
}

export interface CreateDramaGraphOptions {
  id?: string
  title?: string
  now?: number
  source?: {
    path?: string
    graphId?: string
  }
}

export interface DramaNodePositionUpdate {
  nodeId: string
  position: { x: number; y: number }
}

export interface DramaNodeCreateInput {
  nodeId?: string
  kind: DramaGraphNodeKind
  title: string
  description?: string
  position?: { x: number; y: number }
  fields?: Array<{
    id?: string
    key: string
    label: string
    value?: unknown
    text?: string
  }>
}

export interface DramaNodeFieldUpdate {
  id: string
  key?: string
  label?: string
  value?: unknown
  text?: string
}

export interface DramaNodeUpdate {
  nodeId: string
  title?: string
  kind?: DramaGraphNodeKind
  description?: string
  fields?: DramaNodeFieldUpdate[]
}

export interface DramaNodeDeleteInput {
  nodeId: string
}

export interface DramaEdgeUpdate {
  edgeId: string
  label?: string
  type?: DramaEdgeType
}

export interface DramaEdgeCreateInput {
  edgeId?: string
  sourceId: string
  targetId: string
  type: DramaEdgeType
  label: string
}

export interface DramaDraftFieldUpsert {
  key: string
  label: string
  value?: unknown
  text?: string
}

export interface DramaDraftUpsertInput {
  draftId?: string
  targetType: DramaDraft['targetType']
  targetId: string
  content: string
  status?: DramaDraft['status']
  source?: DramaDraft['source']
  nodeId?: string
  chapterId?: string
  sceneId?: string
  fields?: DramaDraftFieldUpsert[]
}

export interface DramaTaskBindingUpsertInput {
  bindingId?: string
  nodeId?: string
  edgeId?: string
  taskId: string
  agentId?: string
  crewId?: string
  status?: DramaTaskBinding['status']
}

export interface DramaTaskBindingDeleteInput {
  bindingId: string
}

export function createEmptyDramaGraph(options: CreateDramaGraphOptions = {}): DramaGraph {
  const now = options.now ?? Date.now()
  const id = options.id?.trim() || 'default'
  const title = options.title?.trim() || 'Drama Graph'
  const source = options.source

  return {
    schema: 'drama.graph.v1',
    id,
    title,
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'native',
      path: source?.path,
      graphId: source?.graphId ?? id,
    },
    bible: {
      id: `${id}-bible`,
      title: `${title} Bible`,
      worldNodeIds: [],
      characterNodeIds: [],
      locationNodeIds: [],
      plotNodeIds: [],
    },
    nodes: [],
    edges: [],
    scenes: [],
    chapters: [],
    drafts: [],
    taskBindings: [],
    metadata: {},
  }
}

export function summarizeDramaGraph(graph: DramaGraph): DramaGraphSummary {
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    sceneCount: graph.scenes.length,
    chapterCount: graph.chapters.length,
    draftCount: graph.drafts.length,
    taskBindingCount: graph.taskBindings.length,
  }
}

export function isDramaGraph(value: unknown): value is DramaGraph {
  if (!value || typeof value !== 'object') return false
  const graph = value as Partial<DramaGraph>
  return graph.schema === 'drama.graph.v1'
    && typeof graph.id === 'string'
    && typeof graph.title === 'string'
    && Array.isArray(graph.nodes)
    && Array.isArray(graph.edges)
    && Array.isArray(graph.scenes)
    && Array.isArray(graph.chapters)
    && Array.isArray(graph.drafts)
    && Array.isArray(graph.taskBindings)
}
