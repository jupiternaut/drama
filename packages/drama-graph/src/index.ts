import type {
  StoryletCardKind,
  StoryletCardState,
  StoryletEdgeState,
  StoryletFieldState,
  StoryletStoryState,
} from './storylet-types.ts'

import type {
  CreateDramaGraphOptions,
  DramaBible,
  DramaChapter,
  DramaDraft,
  DramaDraftFieldUpsert,
  DramaDraftUpsertInput,
  DramaEdge,
  DramaEdgeCreateInput,
  DramaEdgeType,
  DramaEdgeUpdate,
  DramaGraph,
  DramaGraphDiagnostic,
  DramaGraphDiagnosticKind,
  DramaGraphDiagnosticSeverity,
  DramaGraphField,
  DramaGraphNodeKind,
  DramaGraphSummary,
  DramaNode,
  DramaNodeCreateInput,
  DramaNodeDeleteInput,
  DramaNodeFieldUpdate,
  DramaNodePositionUpdate,
  DramaNodeUpdate,
  DramaScene,
  DramaSourceRef,
  DramaTaskBinding,
  DramaTaskBindingDeleteInput,
  DramaTaskBindingUpsertInput,
} from '@drama/core'
export type {
  CreateDramaGraphOptions,
  DramaBible,
  DramaChapter,
  DramaDraft,
  DramaDraftFieldUpsert,
  DramaDraftUpsertInput,
  DramaEdge,
  DramaEdgeCreateInput,
  DramaEdgeType,
  DramaEdgeUpdate,
  DramaGraph,
  DramaGraphDiagnostic,
  DramaGraphDiagnosticKind,
  DramaGraphDiagnosticSeverity,
  DramaGraphField,
  DramaGraphNodeKind,
  DramaGraphSummary,
  DramaNode,
  DramaNodeCreateInput,
  DramaNodeDeleteInput,
  DramaNodeFieldUpdate,
  DramaNodePositionUpdate,
  DramaNodeUpdate,
  DramaScene,
  DramaSourceRef,
  DramaTaskBinding,
  DramaTaskBindingDeleteInput,
  DramaTaskBindingUpsertInput,
} from '@drama/core'
export { createEmptyDramaGraph } from '@drama/core'
export * from './native-model.ts'

export interface StoryletExportGraph {
  id: string
  name: string
  cards: Array<{
    id: string
    title: string
    description?: string
    moduleType: string
    fields: Array<{
      id: string
      key: string
      name: string
      value: unknown
    }>
    position: { x: number; y: number }
  }>
  connections: Array<{
    id: string
    sourceCardId: string
    targetCardId: string
    relationshipLabel: string
    relationshipType: string
  }>
}

const DEFAULT_NODE_SIZE: Record<DramaGraphNodeKind, { width: number; height: number }> = {
  story: { width: 280, height: 156 },
  world: { width: 280, height: 156 },
  character: { width: 232, height: 148 },
  location: { width: 232, height: 132 },
  plot: { width: 280, height: 150 },
  chapter: { width: 300, height: 168 },
  scene: { width: 300, height: 190 },
  other: { width: 240, height: 128 },
}

function sourceRef(format: DramaSourceRef['format'], id: string, kind: DramaSourceRef['kind']): DramaSourceRef {
  return { format, id, kind }
}

function fieldId(nodeId: string, field: StoryletFieldState, index: number): string {
  return field.id || `${nodeId}:field:${field.key || field.name || index}`
}

function normalizeField(nodeId: string, field: StoryletFieldState, index: number): DramaGraphField {
  const key = field.key || field.name || field.id || `field_${index + 1}`
  return {
    id: fieldId(nodeId, field, index),
    key,
    label: field.name || field.key || field.id || '字段',
    value: field.value,
    text: field.text,
    sourceRefs: field.id ? [sourceRef('storylet', field.id, 'card')] : undefined,
  }
}

function fallbackPosition(index: number): { x: number; y: number } {
  return {
    x: 80 + (index % 6) * 340,
    y: 80 + Math.floor(index / 6) * 220,
  }
}

function normalizeEdgeType(edge: StoryletEdgeState): DramaEdgeType {
  const key = `${edge.type ?? ''} ${edge.label ?? ''}`.toLowerCase()
  if (key.includes('contains') || key.includes('包含')) return 'contains'
  if (key.includes('next')) return 'next'
  if (key.includes('block') || key.includes('阻碍')) return 'blocks'
  if (key.includes('support') || key.includes('支持')) return 'supports'
  if (key.includes('reveal') || key.includes('揭示')) return 'reveals'
  if (key.includes('cause') || key.includes('causal')) return 'causal'
  if (key.includes('observe') || key.includes('witness')) return 'observes'
  return 'custom'
}

function sceneOrder(card: StoryletCardState): number | undefined {
  const raw = card.fields.find((field) => ['sceneNumber', '场景编号'].includes(field.key ?? field.name ?? ''))?.text
  if (!raw) return undefined
  const parsed = Number(raw.match(/\d+/)?.[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

export function dramaGraphFromStoryletState(
  storyState: StoryletStoryState,
  options: { now?: number; sourcePath?: string } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const nodes: DramaNode[] = storyState.cards.map((card, index) => ({
    id: card.id,
    kind: card.kind,
    title: card.title,
    description: card.description,
    fields: card.fields.map((field, fieldIndex) => normalizeField(card.id, field, fieldIndex)),
    position: card.position ?? fallbackPosition(index),
    size: DEFAULT_NODE_SIZE[card.kind],
    sourceRefs: [sourceRef('storylet', card.id, 'card')],
    createdAt: now,
    updatedAt: now,
  }))

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: DramaEdge[] = storyState.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      type: normalizeEdgeType(edge),
      label: edge.label || edge.type || 'relates',
      sourceRefs: [sourceRef('storylet', edge.id, 'edge')],
      createdAt: now,
      updatedAt: now,
    }))

  const chapterNodes = nodes.filter((node) => node.kind === 'chapter')
  const sceneNodes = nodes.filter((node) => node.kind === 'scene')
  const chapters: DramaChapter[] = chapterNodes.map((node, index) => ({
    id: `chapter:${node.id}`,
    nodeId: node.id,
    title: node.title,
    number: index + 1,
    sceneIds: [],
    draftIds: [],
    status: 'empty',
  }))

  return {
    schema: 'drama.graph.v1',
    id: storyState.graphId,
    title: storyState.graphName,
    createdAt: now,
    updatedAt: now,
    source: {
      format: 'storylet',
      path: options.sourcePath,
      graphId: storyState.graphId,
    },
    bible: {
      id: `${storyState.graphId}:bible`,
      title: `${storyState.graphName} Bible`,
      worldNodeIds: nodes.filter((node) => node.kind === 'world' || node.kind === 'story').map((node) => node.id),
      characterNodeIds: nodes.filter((node) => node.kind === 'character').map((node) => node.id),
      locationNodeIds: nodes.filter((node) => node.kind === 'location').map((node) => node.id),
      plotNodeIds: nodes.filter((node) => node.kind === 'plot').map((node) => node.id),
    },
    nodes,
    edges,
    scenes: sceneNodes.map((node) => ({
      id: `scene:${node.id}`,
      nodeId: node.id,
      order: sceneOrder(storyState.cards.find((card) => card.id === node.id)!),
      status: 'empty',
      draftIds: [],
    })),
    chapters,
    drafts: [],
    taskBindings: [],
    metadata: {
      importedFrom: 'storylet',
      storyletSummary: storyState.summary,
    },
  }
}

export function dramaGraphToStoryletExport(graph: DramaGraph): StoryletExportGraph {
  return {
    id: graph.id,
    name: graph.title,
    cards: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      moduleType: node.kind,
      fields: node.fields.map((field) => ({
        id: field.id,
        key: field.key,
        name: field.label,
        value: field.value,
      })),
      position: node.position,
    })),
    connections: graph.edges.map((edge) => ({
      id: edge.id,
      sourceCardId: edge.sourceId,
      targetCardId: edge.targetId,
      relationshipLabel: edge.label,
      relationshipType: edge.type,
    })),
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

export function detectDramaGraphDiagnostics(graph: DramaGraph): DramaGraphDiagnostic[] {
  const diagnostics: DramaGraphDiagnostic[] = []
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  const incidentByNodeId = new Map(graph.nodes.map((node) => [node.id, 0]))

  for (const edge of graph.edges) {
    const sourceExists = nodeIds.has(edge.sourceId)
    const targetExists = nodeIds.has(edge.targetId)
    if (!sourceExists || !targetExists) {
      diagnostics.push({
        id: `dangling-edge:${edge.id}`,
        severity: 'error',
        kind: 'dangling_edge',
        message: `关系边 ${edge.id} 指向不存在的节点`,
        nodeIds: [edge.sourceId, edge.targetId].filter((id) => nodeIds.has(id)),
        edgeIds: [edge.id],
      })
      continue
    }
    incidentByNodeId.set(edge.sourceId, (incidentByNodeId.get(edge.sourceId) ?? 0) + 1)
    incidentByNodeId.set(edge.targetId, (incidentByNodeId.get(edge.targetId) ?? 0) + 1)
    if (edge.sourceId === edge.targetId) {
      diagnostics.push({
        id: `self-loop:${edge.id}`,
        severity: 'warning',
        kind: 'self_loop',
        message: `关系边 ${edge.id} 连接到自身`,
        nodeIds: [edge.sourceId],
        edgeIds: [edge.id],
      })
    }
  }

  const edgeIdsBySignature = new Map<string, string[]>()
  for (const edge of graph.edges) {
    const signature = `${edge.sourceId}->${edge.targetId}:${edge.type}:${edge.label}`
    edgeIdsBySignature.set(signature, [...(edgeIdsBySignature.get(signature) ?? []), edge.id])
  }
  for (const [signature, edgeIds] of edgeIdsBySignature) {
    if (edgeIds.length <= 1) continue
    const [sourceId, rest] = signature.split('->')
    const [targetId] = (rest ?? '').split(':')
    if (!sourceId || !targetId) continue
    diagnostics.push({
      id: `duplicate-edge:${edgeIds.join(',')}`,
      severity: 'warning',
      kind: 'duplicate_edge',
      message: `重复关系边：${sourceId} -> ${targetId}`,
      nodeIds: [sourceId, targetId].filter((id) => nodeIds.has(id)),
      edgeIds,
    })
  }

  for (const node of graph.nodes) {
    if ((incidentByNodeId.get(node.id) ?? 0) > 0) continue
    diagnostics.push({
      id: `isolated-node:${node.id}`,
      severity: 'info',
      kind: 'isolated_node',
      message: `节点「${node.title}」没有任何关系边`,
      nodeIds: [node.id],
    })
  }

  const nextEdges = graph.edges.filter((edge) => edge.type === 'next')
  const chapterNodeIds = graph.chapters
    .slice()
    .sort((left, right) => left.number - right.number)
    .map((chapter) => chapter.nodeId)
    .filter((nodeId): nodeId is string => Boolean(nodeId))
  for (let index = 0; index < chapterNodeIds.length - 1; index += 1) {
    const sourceId = chapterNodeIds[index]
    const targetId = chapterNodeIds[index + 1]
    if (!sourceId || !targetId) continue
    const hasNext = nextEdges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId)
    if (hasNext) continue
    diagnostics.push({
      id: `chapter-next-gap:${sourceId}:${targetId}`,
      severity: 'warning',
      kind: 'chapter_next_gap',
      message: `章节链缺少 next：${sourceId} -> ${targetId}`,
      nodeIds: [sourceId, targetId],
    })
  }

  diagnostics.push(...detectContainsCycles(graph))
  return diagnostics
}

export function updateDramaGraphNodePositions(
  graph: DramaGraph,
  updates: DramaNodePositionUpdate[],
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const updateByNodeId = new Map(updates.map((update) => [update.nodeId, update.position]))
  let changed = false
  const nodes = graph.nodes.map((node) => {
    const nextPosition = updateByNodeId.get(node.id)
    if (!nextPosition) return node
    if (node.position.x === nextPosition.x && node.position.y === nextPosition.y) return node
    changed = true
    return {
      ...node,
      position: {
        x: nextPosition.x,
        y: nextPosition.y,
      },
      updatedAt: now,
    }
  })

  if (!changed) return graph

  return {
    ...graph,
    nodes,
    updatedAt: now,
  }
}

export function createDramaGraphNode(
  graph: DramaGraph,
  input: DramaNodeCreateInput,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const nodeId = input.nodeId?.trim() || nextNodeId(graph, input.kind)
  if (graph.nodes.some((node) => node.id === nodeId)) {
    throw new Error(`Cannot create Drama node: duplicate node id (${nodeId})`)
  }

  const position = input.position ?? fallbackPosition(graph.nodes.length)
  const title = input.title.trim() || kindLabel(input.kind)
  const node: DramaNode = {
    id: nodeId,
    kind: input.kind,
    title,
    description: input.description,
    fields: (input.fields ?? []).map((field, index) => ({
      id: field.id?.trim() || `${nodeId}:field:${safeIdSegment(field.key || field.label || String(index + 1))}`,
      key: field.key,
      label: field.label,
      value: Object.prototype.hasOwnProperty.call(field, 'value') ? field.value : field.text ?? '',
      text: field.text ?? String(field.value ?? ''),
    })),
    position,
    size: DEFAULT_NODE_SIZE[input.kind],
    sourceRefs: [sourceRef('native', nodeId, 'card')],
    createdAt: now,
    updatedAt: now,
  }

  return reconcileDramaGraphDerivedCollections({
    ...graph,
    nodes: [...graph.nodes, node],
    updatedAt: now,
  })
}

export function updateDramaGraphNode(
  graph: DramaGraph,
  update: DramaNodeUpdate,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  let changed = false
  const nodes = graph.nodes.map((node) => {
    if (node.id !== update.nodeId) return node

    const nextFields = update.fields
      ? node.fields.map((field) => {
          const fieldUpdate = update.fields?.find((candidate) => candidate.id === field.id)
          if (!fieldUpdate) return field
          return {
            ...field,
            key: fieldUpdate.key ?? field.key,
            label: fieldUpdate.label ?? field.label,
            value: Object.prototype.hasOwnProperty.call(fieldUpdate, 'value') ? fieldUpdate.value : field.value,
            text: fieldUpdate.text ?? field.text,
          }
        })
      : node.fields

    const nextNode: DramaNode = {
      ...node,
      title: update.title ?? node.title,
      kind: update.kind ?? node.kind,
      description: update.description ?? node.description,
      fields: nextFields,
    }

    const nodeChanged = nextNode.title !== node.title
      || nextNode.kind !== node.kind
      || nextNode.description !== node.description
      || nextFields.some((field, index) => {
        const previous = node.fields[index]
        return !previous
          || field.key !== previous.key
          || field.label !== previous.label
          || field.text !== previous.text
          || field.value !== previous.value
      })

    if (!nodeChanged) return node
    changed = true
    return {
      ...nextNode,
      updatedAt: now,
    }
  })

  if (!changed) return graph

  return reconcileDramaGraphDerivedCollections({
    ...graph,
    nodes,
    updatedAt: now,
  })
}

export function deleteDramaGraphNode(
  graph: DramaGraph,
  input: DramaNodeDeleteInput,
  options: { now?: number } = {},
): DramaGraph {
  const nodeExists = graph.nodes.some((node) => node.id === input.nodeId)
  if (!nodeExists) return graph
  const now = options.now ?? Date.now()
  const deletedEdgeIds = new Set(
    graph.edges
      .filter((edge) => edge.sourceId === input.nodeId || edge.targetId === input.nodeId)
      .map((edge) => edge.id),
  )

  return reconcileDramaGraphDerivedCollections({
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== input.nodeId),
    edges: graph.edges.filter((edge) => !deletedEdgeIds.has(edge.id)),
    drafts: graph.drafts.filter((draft) => !(draft.targetType === 'node' && draft.targetId === input.nodeId)),
    taskBindings: graph.taskBindings.filter((binding) => (
      binding.nodeId !== input.nodeId && (!binding.edgeId || !deletedEdgeIds.has(binding.edgeId))
    )),
    updatedAt: now,
  })
}

export function upsertDramaGraphDraft(
  graph: DramaGraph,
  input: DramaDraftUpsertInput,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const source = input.source ?? 'manual'
  const status = input.status ?? 'draft'
  const targetId = input.targetId.trim()
  if (!targetId) {
    throw new Error('Cannot upsert Drama draft: targetId is required')
  }

  const chapter = resolveDraftChapter(graph, input)
  const scene = resolveDraftScene(graph, input)
  const nodeId = input.nodeId
    ?? (input.targetType === 'node' ? targetId : undefined)
    ?? chapter?.nodeId
    ?? scene?.nodeId

  if (input.targetType === 'chapter' && !chapter) {
    throw new Error(`Cannot upsert Drama draft: chapter not found (${targetId})`)
  }
  if (input.targetType === 'scene' && !scene) {
    throw new Error(`Cannot upsert Drama draft: scene not found (${targetId})`)
  }
  if (input.targetType === 'node' && !graph.nodes.some((node) => node.id === targetId)) {
    throw new Error(`Cannot upsert Drama draft: node not found (${targetId})`)
  }

  const draftId = input.draftId?.trim()
    || existingDraftId(graph, input.targetType, targetId, source)
    || `${input.targetType}:${safeIdSegment(targetId)}:${source}`
  const nextDraft: DramaDraft = {
    id: draftId,
    targetType: input.targetType,
    targetId,
    content: input.content,
    status,
    source,
    createdAt: graph.drafts.find((draft) => draft.id === draftId)?.createdAt ?? now,
    updatedAt: now,
  }

  const drafts = [
    nextDraft,
    ...graph.drafts.filter((draft) => draft.id !== draftId),
  ]
  const chapters = graph.chapters.map((item) => {
    if (item.id !== chapter?.id) return item
    return {
      ...item,
      status,
      draftIds: uniqueStrings([draftId, ...item.draftIds]),
    }
  })
  const scenes = graph.scenes.map((item) => {
    if (item.id !== scene?.id) return item
    return {
      ...item,
      status,
      draftIds: uniqueStrings([draftId, ...item.draftIds]),
    }
  })
  const nodes = nodeId
    ? graph.nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          fields: upsertDramaGraphNodeFields(node.id, node.fields, input.fields ?? []),
          updatedAt: now,
        }
      })
    : graph.nodes

  return {
    ...graph,
    nodes,
    chapters,
    scenes,
    drafts,
    updatedAt: now,
  }
}

export function upsertDramaGraphTaskBinding(
  graph: DramaGraph,
  input: DramaTaskBindingUpsertInput,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const taskId = input.taskId.trim()
  if (!taskId) {
    throw new Error('Drama task binding requires a task id')
  }
  if (!input.nodeId && !input.edgeId) {
    throw new Error('Drama task binding requires a node or edge target')
  }
  if (input.nodeId && input.edgeId) {
    throw new Error('Drama task binding cannot target both a node and an edge')
  }
  if (input.nodeId && !graph.nodes.some((node) => node.id === input.nodeId)) {
    throw new Error(`Drama task binding node not found: ${input.nodeId}`)
  }
  if (input.edgeId && !graph.edges.some((edge) => edge.id === input.edgeId)) {
    throw new Error(`Drama task binding edge not found: ${input.edgeId}`)
  }

  const existingIndex = graph.taskBindings.findIndex((binding) => (
    input.bindingId
      ? binding.id === input.bindingId
      : binding.taskId === taskId
        && binding.nodeId === input.nodeId
        && binding.edgeId === input.edgeId
  ))
  const bindingId = input.bindingId
    ?? graph.taskBindings[existingIndex]?.id
    ?? `binding:${safeIdSegment(input.nodeId ?? input.edgeId ?? 'graph')}:${safeIdSegment(taskId)}`

  const nextBinding: DramaTaskBinding = {
    id: bindingId,
    nodeId: input.nodeId,
    edgeId: input.edgeId,
    taskId,
    agentId: emptyToUndefined(input.agentId),
    crewId: emptyToUndefined(input.crewId),
    status: input.status ?? graph.taskBindings[existingIndex]?.status ?? 'pending',
    createdAt: graph.taskBindings[existingIndex]?.createdAt ?? now,
    updatedAt: now,
  }

  return {
    ...graph,
    taskBindings: existingIndex >= 0
      ? graph.taskBindings.map((binding, index) => (index === existingIndex ? nextBinding : binding))
      : [...graph.taskBindings, nextBinding],
    updatedAt: now,
  }
}

export function deleteDramaGraphTaskBinding(
  graph: DramaGraph,
  input: DramaTaskBindingDeleteInput,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const taskBindings = graph.taskBindings.filter((binding) => binding.id !== input.bindingId)
  if (taskBindings.length === graph.taskBindings.length) {
    throw new Error(`Drama task binding not found: ${input.bindingId}`)
  }
  return {
    ...graph,
    taskBindings,
    updatedAt: now,
  }
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function updateDramaGraphEdge(
  graph: DramaGraph,
  update: DramaEdgeUpdate,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  let changed = false
  const edges = graph.edges.map((edge) => {
    if (edge.id !== update.edgeId) return edge
    const nextEdge: DramaEdge = {
      ...edge,
      label: update.label ?? edge.label,
      type: update.type ?? edge.type,
    }
    if (nextEdge.label === edge.label && nextEdge.type === edge.type) return edge
    changed = true
    return {
      ...nextEdge,
      updatedAt: now,
    }
  })

  if (!changed) return graph

  return {
    ...graph,
    edges,
    updatedAt: now,
  }
}

export function createDramaGraphEdge(
  graph: DramaGraph,
  input: DramaEdgeCreateInput,
  options: { now?: number } = {},
): DramaGraph {
  const now = options.now ?? Date.now()
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  if (!nodeIds.has(input.sourceId)) {
    throw new Error(`Cannot create Drama edge: source node not found (${input.sourceId})`)
  }
  if (!nodeIds.has(input.targetId)) {
    throw new Error(`Cannot create Drama edge: target node not found (${input.targetId})`)
  }
  if (input.sourceId === input.targetId) {
    throw new Error('Cannot create Drama edge: source and target are the same node')
  }

  const edgeId = input.edgeId?.trim() || nextEdgeId(graph, input.sourceId, input.targetId)
  if (graph.edges.some((edge) => edge.id === edgeId)) {
    throw new Error(`Cannot create Drama edge: duplicate edge id (${edgeId})`)
  }

  const edge: DramaEdge = {
    id: edgeId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    type: input.type,
    label: input.label.trim() || input.type,
    sourceRefs: [sourceRef('native', edgeId, 'edge')],
    createdAt: now,
    updatedAt: now,
  }

  return {
    ...graph,
    edges: [...graph.edges, edge],
    updatedAt: now,
  }
}

export function deleteDramaGraphEdge(
  graph: DramaGraph,
  edgeId: string,
  options: { now?: number } = {},
): DramaGraph {
  const edges = graph.edges.filter((edge) => edge.id !== edgeId)
  if (edges.length === graph.edges.length) return graph
  const now = options.now ?? Date.now()

  return {
    ...graph,
    edges,
    taskBindings: graph.taskBindings.filter((binding) => binding.edgeId !== edgeId),
    updatedAt: now,
  }
}

function nextEdgeId(graph: DramaGraph, sourceId: string, targetId: string): string {
  const base = `edge-${safeIdSegment(sourceId)}-${safeIdSegment(targetId)}`
  const ids = new Set(graph.edges.map((edge) => edge.id))
  if (!ids.has(base)) return base
  for (let index = 2; index < 10000; index += 1) {
    const candidate = `${base}-${index}`
    if (!ids.has(candidate)) return candidate
  }
  throw new Error(`Cannot create Drama edge: exhausted ids for ${sourceId} -> ${targetId}`)
}

function resolveDraftChapter(graph: DramaGraph, input: DramaDraftUpsertInput): DramaChapter | undefined {
  const chapterId = input.chapterId ?? (input.targetType === 'chapter' ? input.targetId : undefined)
  if (!chapterId) return undefined
  return graph.chapters.find((chapter) => chapter.id === chapterId || chapter.nodeId === chapterId)
}

function resolveDraftScene(graph: DramaGraph, input: DramaDraftUpsertInput): DramaScene | undefined {
  const sceneId = input.sceneId ?? (input.targetType === 'scene' ? input.targetId : undefined)
  if (!sceneId) return undefined
  return graph.scenes.find((scene) => scene.id === sceneId || scene.nodeId === sceneId)
}

function existingDraftId(
  graph: DramaGraph,
  targetType: DramaDraft['targetType'],
  targetId: string,
  source: DramaDraft['source'],
): string | undefined {
  return graph.drafts.find((draft) => (
    draft.targetType === targetType
    && draft.targetId === targetId
    && draft.source === source
  ))?.id
}

function upsertDramaGraphNodeFields(
  nodeId: string,
  fields: DramaGraphField[],
  updates: DramaDraftFieldUpsert[],
): DramaGraphField[] {
  if (updates.length === 0) return fields
  const nextFields = [...fields]
  for (const update of updates) {
    const key = update.key.trim()
    if (!key) continue
    const index = nextFields.findIndex((field) => field.key === key)
    const text = update.text ?? String(update.value ?? '')
    const value = Object.prototype.hasOwnProperty.call(update, 'value') ? update.value : text
    const existingField = index >= 0 ? nextFields[index] : undefined
    if (existingField) {
      nextFields[index] = {
        ...existingField,
        label: update.label || existingField.label,
        value,
        text,
      }
    } else {
      nextFields.push({
        id: `${nodeId}:field:${safeIdSegment(key)}`,
        key,
        label: update.label || key,
        value,
        text,
      })
    }
  }
  return nextFields
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function nextNodeId(graph: DramaGraph, kind: DramaGraphNodeKind): string {
  const base = `node-${kind}-${graph.nodes.length + 1}`
  const ids = new Set(graph.nodes.map((node) => node.id))
  if (!ids.has(base)) return base
  for (let index = 2; index < 10000; index += 1) {
    const candidate = `${base}-${index}`
    if (!ids.has(candidate)) return candidate
  }
  throw new Error(`Cannot create Drama node: exhausted ids for ${kind}`)
}

function kindLabel(kind: DramaGraphNodeKind): string {
  const labels: Record<DramaGraphNodeKind, string> = {
    story: '新故事',
    world: '新世界观',
    character: '新角色',
    location: '新地点',
    plot: '新剧情',
    chapter: '新章节',
    scene: '新场景',
    other: '新节点',
  }
  return labels[kind]
}

function safeIdSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'node'
}

function detectContainsCycles(graph: DramaGraph): DramaGraphDiagnostic[] {
  const containsEdges = graph.edges.filter((edge) => edge.type === 'contains')
  const outgoing = new Map<string, DramaEdge[]>()
  for (const edge of containsEdges) {
    outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge])
  }

  const diagnostics: DramaGraphDiagnostic[] = []
  const visited = new Set<string>()
  const active = new Set<string>()
  const stack: string[] = []
  const reported = new Set<string>()

  function visit(nodeId: string): void {
    if (active.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId)
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart).concat(nodeId) : [nodeId]
      const key = cycle.slice().sort().join('|')
      if (!reported.has(key)) {
        reported.add(key)
        diagnostics.push({
          id: `contains-cycle:${key}`,
          severity: 'error',
          kind: 'contains_cycle',
          message: `contains 关系存在循环：${cycle.join(' -> ')}`,
          nodeIds: Array.from(new Set(cycle)),
          edgeIds: containsEdges
            .filter((edge) => cycle.includes(edge.sourceId) && cycle.includes(edge.targetId))
            .map((edge) => edge.id),
        })
      }
      return
    }
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    active.add(nodeId)
    stack.push(nodeId)
    for (const edge of outgoing.get(nodeId) ?? []) {
      visit(edge.targetId)
    }
    stack.pop()
    active.delete(nodeId)
  }

  for (const edge of containsEdges) {
    visit(edge.sourceId)
  }

  return diagnostics
}

function reconcileDramaGraphDerivedCollections(graph: DramaGraph): DramaGraph {
  const previousSceneByNodeId = new Map(graph.scenes.map((scene) => [scene.nodeId, scene]))
  const previousChapterByNodeId = new Map(graph.chapters.flatMap((chapter) => (
    chapter.nodeId ? [[chapter.nodeId, chapter] as const] : []
  )))
  const chapterNodes = graph.nodes.filter((node) => node.kind === 'chapter')
  const sceneNodes = graph.nodes.filter((node) => node.kind === 'scene')

  return {
    ...graph,
    bible: {
      ...graph.bible,
      worldNodeIds: graph.nodes.filter((node) => node.kind === 'world' || node.kind === 'story').map((node) => node.id),
      characterNodeIds: graph.nodes.filter((node) => node.kind === 'character').map((node) => node.id),
      locationNodeIds: graph.nodes.filter((node) => node.kind === 'location').map((node) => node.id),
      plotNodeIds: graph.nodes.filter((node) => node.kind === 'plot').map((node) => node.id),
    },
    scenes: sceneNodes.map((node, index) => {
      const previous = previousSceneByNodeId.get(node.id)
      return previous ?? {
        id: `scene:${node.id}`,
        nodeId: node.id,
        order: index + 1,
        status: 'empty',
        draftIds: [],
      }
    }),
    chapters: chapterNodes.map((node, index) => {
      const previous = previousChapterByNodeId.get(node.id)
      return {
        id: previous?.id ?? `chapter:${node.id}`,
        nodeId: node.id,
        title: node.title,
        number: previous?.number ?? index + 1,
        sceneIds: previous?.sceneIds ?? [],
        draftIds: previous?.draftIds ?? [],
        status: previous?.status ?? 'empty',
      }
    }),
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
