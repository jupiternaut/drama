import type {
  StoryletCardKind,
  StoryletCardState,
  StoryletEdgeState,
  StoryletFieldState,
  StoryletStoryState,
} from './storylet-types.ts'
import type { DramaGraph as NativeDramaGraph } from '@drama/core'

export interface StoryletNativeGraphNode {
  id: string
  title: string
  kind: StoryletCardKind
  x: number
  y: number
  width: number
  height: number
  summary: string
  fieldCount: number
  fields: Array<{
    id?: string
    label: string
    text: string
  }>
}

export interface StoryletNativeGraphEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}

export interface StoryletNativeGraphModel {
  schema: 'drama.storylet_native_graph.v1'
  graphId: string
  graphName: string
  nodes: StoryletNativeGraphNode[]
  edges: StoryletNativeGraphEdge[]
  summary: StoryletStoryState['summary']
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

const KIND_COLUMNS: Record<StoryletCardKind, number> = {
  story: 0,
  world: 0,
  character: 1,
  location: 2,
  plot: 3,
  chapter: 4,
  scene: 5,
  other: 6,
}

const KIND_SIZE: Record<StoryletCardKind, { width: number; height: number }> = {
  story: { width: 280, height: 156 },
  world: { width: 280, height: 156 },
  character: { width: 232, height: 148 },
  location: { width: 232, height: 132 },
  plot: { width: 280, height: 150 },
  chapter: { width: 300, height: 168 },
  scene: { width: 300, height: 190 },
  other: { width: 240, height: 128 },
}

const COLUMN_GAP = 340
const ROW_GAP = 210
const FALLBACK_ORIGIN = { x: 80, y: 80 }
const FIELD_PREVIEW_COUNT = 4

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clampText(value: string, maxLength: number): string {
  const compact = compactText(value)
  return compact.length > maxLength ? `${compact.slice(0, Math.max(0, maxLength - 1))}…` : compact
}

function fieldLabel(field: StoryletFieldState): string {
  return compactText(field.name || field.key || field.id || '字段')
}

function shouldPreviewField(field: StoryletFieldState): boolean {
  const label = fieldLabel(field).toLowerCase().replace(/[\s_-]+/g, '')
  if (!field.text.trim()) return false
  return !['title', 'name', '标题', '名称'].includes(label)
}

function nodeSummary(card: StoryletCardState): string {
  const fieldText = card.fields
    .filter(shouldPreviewField)
    .map((field) => field.text)
    .find(Boolean)
  return clampText(fieldText || card.description || '', 180)
}

function previewFields(card: StoryletCardState): StoryletNativeGraphNode['fields'] {
  return card.fields
    .filter(shouldPreviewField)
    .slice(0, FIELD_PREVIEW_COUNT)
    .map((field) => ({
      id: field.id,
      label: fieldLabel(field),
      text: clampText(field.text, 120),
    }))
}

function fallbackPosition(card: StoryletCardState, rowByKind: Map<StoryletCardKind, number>): { x: number; y: number } {
  const row = rowByKind.get(card.kind) ?? 0
  rowByKind.set(card.kind, row + 1)
  return {
    x: FALLBACK_ORIGIN.x + KIND_COLUMNS[card.kind] * COLUMN_GAP,
    y: FALLBACK_ORIGIN.y + row * ROW_GAP,
  }
}

function nodePosition(card: StoryletCardState, rowByKind: Map<StoryletCardKind, number>): { x: number; y: number } {
  if (card.position && Number.isFinite(card.position.x) && Number.isFinite(card.position.y)) {
    return card.position
  }
  return fallbackPosition(card, rowByKind)
}

function toNativeNode(card: StoryletCardState, rowByKind: Map<StoryletCardKind, number>): StoryletNativeGraphNode {
  const position = nodePosition(card, rowByKind)
  const size = KIND_SIZE[card.kind]
  return {
    id: card.id,
    title: card.title,
    kind: card.kind,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    summary: nodeSummary(card),
    fieldCount: card.fields.length,
    fields: previewFields(card),
  }
}

function toNativeEdges(edges: StoryletEdgeState[], nodes: StoryletNativeGraphNode[]): StoryletNativeGraphEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id))
  return edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type,
    }))
}

function computeBounds(nodes: StoryletNativeGraphNode[]): StoryletNativeGraphModel['bounds'] {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x + node.width))
  const maxY = Math.max(...nodes.map((node) => node.y + node.height))
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

export function buildStoryletNativeGraphModel(storyState: StoryletStoryState): StoryletNativeGraphModel {
  const rowByKind = new Map<StoryletCardKind, number>()
  const nodes = storyState.cards.map((card) => toNativeNode(card, rowByKind))
  const edges = toNativeEdges(storyState.edges, nodes)

  return {
    schema: 'drama.storylet_native_graph.v1',
    graphId: storyState.graphId,
    graphName: storyState.graphName,
    nodes,
    edges,
    summary: {
      ...storyState.summary,
      edgeCount: edges.length,
    },
    bounds: computeBounds(nodes),
  }
}

export function buildStoryletNativeGraphModelFromDramaGraph(graph: NativeDramaGraph): StoryletNativeGraphModel {
  const nodes: StoryletNativeGraphNode[] = graph.nodes.map((node) => ({
    id: node.id,
    title: node.title,
    kind: node.kind,
    x: node.position.x,
    y: node.position.y,
    width: node.size.width,
    height: node.size.height,
    summary: clampText(node.description || node.fields.find((field) => field.text.trim())?.text || '', 180),
    fieldCount: node.fields.length,
    fields: node.fields.slice(0, FIELD_PREVIEW_COUNT).map((field) => ({
      id: field.id,
      label: field.label,
      text: clampText(field.text, 120),
    })),
  }))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: StoryletNativeGraphEdge[] = graph.edges
    .filter((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId))
    .map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.label,
      type: edge.type,
    }))

  return {
    schema: 'drama.storylet_native_graph.v1',
    graphId: graph.id,
    graphName: graph.title,
    nodes,
    edges,
    summary: {
      cardCount: nodes.length,
      edgeCount: edges.length,
      worldCount: nodes.filter((node) => node.kind === 'world').length,
      characterCount: nodes.filter((node) => node.kind === 'character').length,
      locationCount: nodes.filter((node) => node.kind === 'location').length,
      chapterCount: nodes.filter((node) => node.kind === 'chapter').length,
      sceneCount: nodes.filter((node) => node.kind === 'scene').length,
    },
    bounds: computeBounds(nodes),
  }
}
