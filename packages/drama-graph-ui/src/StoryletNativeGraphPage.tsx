import * as React from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlertTriangle,
  BookOpen,
  Boxes,
  ClipboardPaste,
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  Layers,
  LayoutGrid,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'

import type {
  StoryletNativeGraphModel,
  StoryletNativeGraphNode,
} from '@drama/graph'
import type { DramaGraphHistoryResult } from '@drama/graph/ipc-contract'
import type { StoryletCardKind } from '@drama/graph/storylet-types'
import { detectDramaGraphDiagnostics } from '@drama/graph'
import type { DramaEdge, DramaEdgeCreateInput, DramaEdgeType, DramaEdgeUpdate, DramaGraph, DramaGraphDiagnostic, DramaNode, DramaNodeCreateInput, DramaTaskBinding, DramaTaskBindingUpsertInput, DramaNodeUpdate } from '@drama/core'
import { Button, IconButton, PanelHeader, StatusBadge, cn } from '@drama/ui'

import '@xyflow/react/dist/style.css'

type GraphLoadState = 'loading' | 'ready' | 'error'
export const DRAMA_PLM_OPEN_REQUEST_KEY = 'drama.plm.openRequest.v1'

export interface DramaGraphToolConfig {
  title: string
  url: string
  externalUrl?: string
}

export interface DramaGraphOpenPlmChapterRequest {
  schema: typeof DRAMA_PLM_OPEN_REQUEST_KEY
  source: 'drama-graph'
  graphId?: string
  graphNodeId: string
  chapterId: string
  chapterNumber: number
  title: string
  createdAt: number
}

interface StoryletFlowNodeData extends Record<string, unknown> {
  node: StoryletNativeGraphNode
}

type StoryletFlowNode = Node<StoryletFlowNodeData, 'storyletCard'>

interface GraphSearchResult {
  nodeId: string
  title: string
  kind: StoryletCardKind
  excerpt: string
}

type GraphAlignment = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom' | 'distribute-x' | 'distribute-y'
type TaskBindingStatus = DramaTaskBinding['status']

export interface StoryletNativeGraphPageProps {
  tool: DramaGraphToolConfig
  state: GraphLoadState
  graph: DramaGraph | null
  history?: DramaGraphHistoryResult | null
  model: StoryletNativeGraphModel | null
  sourcePath?: string
  error?: string | null
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  onSelectNode?: (nodeId: string | null) => void
  onSelectEdge?: (edgeId: string | null) => void
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void
  onNodePositionsChange?: (updates: Array<{ nodeId: string; position: { x: number; y: number } }>) => Promise<void> | void
  onNodeCreate?: (input: DramaNodeCreateInput) => Promise<void> | void
  onNodeUpdate?: (update: DramaNodeUpdate) => Promise<void> | void
  onNodeDelete?: (nodeId: string) => Promise<void> | void
  onEdgeCreate?: (input: DramaEdgeCreateInput) => Promise<void> | void
  onEdgeUpdate?: (update: DramaEdgeUpdate) => Promise<void> | void
  onEdgeDelete?: (edgeId: string) => Promise<void> | void
  onTaskBindingUpsert?: (input: {
    nodeId?: string
    edgeId?: string
    taskId: string
    bindingId?: string
    agentId?: string
    crewId?: string
    status?: TaskBindingStatus
  }) => Promise<void> | void
  onTaskBindingDelete?: (bindingId: string) => Promise<void> | void
  onRestoreBackup?: (backupPath: string) => Promise<void> | void
  onOpenPlmChapter?: (request: DramaGraphOpenPlmChapterRequest) => void
  onRefresh?: () => void
  onOpenExternal?: () => void
}

const kindMeta: Record<StoryletCardKind, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  nodeClassName: string
  minimapColor: string
}> = {
  story: {
    label: '故事',
    icon: BookOpen,
    accent: 'text-sky-200',
    nodeClassName: 'border-sky-300/28 bg-sky-300/[0.055]',
    minimapColor: '#7dd3fc',
  },
  world: {
    label: '世界',
    icon: Boxes,
    accent: 'text-emerald-200',
    nodeClassName: 'border-emerald-300/28 bg-emerald-300/[0.055]',
    minimapColor: '#6ee7b7',
  },
  character: {
    label: '角色',
    icon: UserRound,
    accent: 'text-blue-200',
    nodeClassName: 'border-blue-300/28 bg-blue-300/[0.055]',
    minimapColor: '#93c5fd',
  },
  location: {
    label: '地点',
    icon: MapPin,
    accent: 'text-teal-200',
    nodeClassName: 'border-teal-300/28 bg-teal-300/[0.055]',
    minimapColor: '#5eead4',
  },
  plot: {
    label: '剧情',
    icon: GitBranch,
    accent: 'text-amber-200',
    nodeClassName: 'border-amber-300/28 bg-amber-300/[0.055]',
    minimapColor: '#fcd34d',
  },
  chapter: {
    label: '章节',
    icon: ScrollText,
    accent: 'text-fuchsia-200',
    nodeClassName: 'border-fuchsia-300/28 bg-fuchsia-300/[0.055]',
    minimapColor: '#f0abfc',
  },
  scene: {
    label: '场景',
    icon: FileText,
    accent: 'text-rose-200',
    nodeClassName: 'border-rose-300/28 bg-rose-300/[0.055]',
    minimapColor: '#fda4af',
  },
  other: {
    label: '其他',
    icon: Layers,
    accent: 'text-white/62',
    nodeClassName: 'border-white/[0.12] bg-white/[0.045]',
    minimapColor: '#a1a1aa',
  },
}

const nodeTypes: NodeTypes = {
  storyletCard: StoryletCardNode,
}

function toFlowNodes(model: StoryletNativeGraphModel): StoryletFlowNode[] {
  return model.nodes.map((node) => ({
    id: node.id,
    type: 'storyletCard',
    position: { x: node.x, y: node.y },
    width: node.width,
    height: node.height,
    data: { node },
  }))
}

function edgeTone(edge: StoryletNativeGraphModel['edges'][number]): { stroke: string; animated: boolean } {
  const key = `${edge.label ?? ''} ${edge.type ?? ''}`.toLowerCase()
  if (/hostile|conflict|threat|blocks|pressure|enemy|defect|冲突|阻碍|压力/.test(key)) {
    return { stroke: '#ef4444', animated: false }
  }
  if (/support|ally|contains|amplifies|evidence|帮助|支持|包含/.test(key)) {
    return { stroke: '#22c55e', animated: false }
  }
  if (/observe|witness|hint|疑点|观察|线索/.test(key)) {
    return { stroke: '#f59e0b', animated: false }
  }
  return { stroke: '#64748b', animated: false }
}

function toFlowEdges(model: StoryletNativeGraphModel): Edge[] {
  return model.edges.map((edge) => {
    const tone = edgeTone(edge)
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: tone.animated,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: tone.stroke,
      },
      style: {
        stroke: tone.stroke,
        strokeWidth: 1.5,
      },
      labelStyle: {
        fill: tone.stroke,
        fontSize: 10,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: '#08090d',
        fillOpacity: 0.86,
      },
      labelBgPadding: [5, 2],
      labelBgBorderRadius: 4,
    }
  })
}

function StoryletCardNode({ data, selected }: { data: StoryletFlowNodeData; selected?: boolean }) {
  const node = data.node
  const meta = kindMeta[node.kind]
  const Icon = meta.icon

  return (
    <>
      <Handle type="target" position={Position.Top} className="!size-2 !border-0 !bg-white/45" />
      <div
        data-kind={node.kind}
        data-selected={selected ? 'true' : 'false'}
        className={cn(
          'drama-graph-node-card w-[var(--xy-node-width)] rounded-[8px] border px-3 py-2.5 text-white shadow-strong backdrop-blur',
          'transition-[border-color,box-shadow,transform] duration-150',
          'bg-[#101218]/95',
          meta.nodeClassName,
          selected && 'ring-2 ring-white/55 ring-offset-2 ring-offset-[#050609]',
        )}
        style={{ width: node.width, minHeight: node.height }}
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className={cn('drama-graph-node-icon mt-0.5 grid size-7 shrink-0 place-items-center rounded-[6px] border border-white/[0.08] bg-white/[0.055]', meta.accent)}>
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold leading-5">{node.title}</span>
              <span className="shrink-0 rounded-[4px] border border-white/[0.08] bg-white/[0.055] px-1.5 py-0.5 text-[10px] text-white/48">
                {meta.label}
              </span>
            </div>
            <div className="drama-graph-node-id mt-1 font-mono text-[10px] text-white/32">{node.id}</div>
          </div>
        </div>

        {node.summary ? (
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/62">{node.summary}</p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-white/28">暂无摘要字段</p>
        )}

        {node.fields.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {node.fields.slice(0, 3).map((field) => (
              <div key={field.id ?? `${node.id}:${field.label}`} className="drama-graph-node-field min-w-0 rounded-[5px] border border-white/[0.06] bg-black/20 px-2 py-1.5">
                <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-white/30">{field.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/55">{field.text}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!size-2 !border-0 !bg-white/45" />
    </>
  )
}

export function StoryletNativeGraphPage(props: StoryletNativeGraphPageProps) {
  return (
    <ReactFlowProvider>
      <StoryletNativeGraphPageInner {...props} />
    </ReactFlowProvider>
  )
}

function StoryletNativeGraphPageInner({
  tool,
  state,
  graph,
  history,
  model,
  sourcePath,
  error,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onNodePositionChange,
  onNodePositionsChange,
  onNodeCreate,
  onNodeUpdate,
  onNodeDelete,
  onEdgeCreate,
  onEdgeUpdate,
  onEdgeDelete,
  onTaskBindingUpsert,
  onTaskBindingDelete,
  onRestoreBackup,
  onOpenPlmChapter,
  onRefresh,
  onOpenExternal,
}: StoryletNativeGraphPageProps) {
  const { fitView, getEdges, getNodes, screenToFlowPosition, setCenter } = useReactFlow()
  const computedNodes = React.useMemo(() => model ? toFlowNodes(model) : [], [model])
  const [nodes, setNodes] = React.useState<StoryletFlowNode[]>(computedNodes)
  const renderNodes = nodes.length > 0 || computedNodes.length === 0 ? nodes : computedNodes
  const [searchQuery, setSearchQuery] = React.useState('')
  const [canvasMoving, setCanvasMoving] = React.useState(false)
  const [copiedNodes, setCopiedNodes] = React.useState<DramaNode[]>([])
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const edges = React.useMemo(() => model ? toFlowEdges(model) : [], [model])
  const renderEdges = React.useMemo(() => edges.map((edge) => {
    const selected = selectedEdgeId === edge.id
    return {
      ...edge,
      selected,
      style: {
        ...edge.style,
        strokeWidth: selected ? 2.4 : edge.style?.strokeWidth,
      },
    }
  }), [edges, selectedEdgeId])
  const diagnostics = React.useMemo(() => graph ? detectDramaGraphDiagnostics(graph) : [], [graph])
  const searchResults = React.useMemo(() => searchDramaGraphNodes(graph, searchQuery), [graph, searchQuery])
  const selectedFlowNodes = React.useMemo(() => renderNodes.filter((node) => node.selected), [renderNodes])
  const selectedNode = selectedEdgeId ? null : (model?.nodes.find((node) => node.id === selectedNodeId) ?? model?.nodes[0] ?? null)
  const selectedDramaNode = graph?.nodes.find((node) => node.id === selectedNode?.id) ?? null
  const selectedDramaEdge = graph?.edges.find((edge) => edge.id === selectedEdgeId) ?? null
  const selectedDramaNodes = React.useMemo(() => {
    if (!graph) return []
    const selectedIds = selectedFlowNodes.length > 0
      ? selectedFlowNodes.map((node) => node.id)
      : selectedDramaNode
        ? [selectedDramaNode.id]
        : []
    const selectedIdSet = new Set(selectedIds)
    return graph.nodes.filter((node) => selectedIdSet.has(node.id))
  }, [graph, selectedDramaNode, selectedFlowNodes])

  React.useEffect(() => {
    setNodes(computedNodes)
  }, [computedNodes])

  React.useEffect(() => {
    if (!selectedNodeId) return
    setNodes((currentNodes) => currentNodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    })))
  }, [selectedNodeId])

  React.useEffect(() => {
    if (!model || renderNodes.length === 0) return
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 420 })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [fitView, model, renderNodes.length])

  const handleNodesChange = React.useCallback((changes: NodeChange<StoryletFlowNode>[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes))
  }, [])

  const handleConnect = React.useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    void onEdgeCreate?.({
      sourceId: connection.source,
      targetId: connection.target,
      type: 'supports',
      label: 'supports',
    })
  }, [onEdgeCreate])

  const createSceneNodeAt = React.useCallback((position?: { x: number; y: number }) => {
    const basePosition = selectedDramaNode?.position
      ?? graph?.nodes[graph.nodes.length - 1]?.position
      ?? { x: 80, y: 80 }
    void onNodeCreate?.({
      kind: 'scene',
      title: '新场景节点',
      position: {
        x: position?.x ?? basePosition.x + 340,
        y: position?.y ?? basePosition.y,
      },
      fields: [
        {
          key: 'scenePurpose',
          label: '场景目的',
          text: '',
        },
      ],
    })
  }, [graph?.nodes, onNodeCreate, selectedDramaNode?.position])

  const handleCreateNode = React.useCallback(() => {
    createSceneNodeAt()
  }, [createSceneNodeAt])

  const handleCopySelection = React.useCallback(() => {
    if (selectedDramaNodes.length === 0) return
    setCopiedNodes(selectedDramaNodes)
  }, [selectedDramaNodes])

  const duplicateNodes = React.useCallback(async (nodesToDuplicate: DramaNode[], offset = 56) => {
    if (!onNodeCreate || nodesToDuplicate.length === 0) return
    for (const node of nodesToDuplicate) {
      await onNodeCreate({
        kind: node.kind,
        title: `${node.title} 副本`,
        description: node.description ?? '',
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset,
        },
        fields: node.fields.map((field) => ({
          key: field.key,
          label: field.label,
          text: field.text,
        })),
      })
    }
  }, [onNodeCreate])

  const handlePasteSelection = React.useCallback(() => {
    void duplicateNodes(copiedNodes)
  }, [copiedNodes, duplicateNodes])

  const handleDuplicateSelection = React.useCallback(() => {
    void duplicateNodes(selectedDramaNodes)
  }, [duplicateNodes, selectedDramaNodes])

  const handleDeleteSelection = React.useCallback(async () => {
    const selectedRuntimeEdges = getEdges().filter((edge) => edge.selected).map((edge) => edge.id)
    const selectedRuntimeNodes = getNodes().filter((node) => node.selected).map((node) => node.id)
    const edgeIds = Array.from(new Set([
      ...selectedRuntimeEdges,
      ...(selectedEdgeId ? [selectedEdgeId] : []),
    ]))
    const nodeIds = Array.from(new Set([
      ...selectedRuntimeNodes,
      ...(selectedNodeId && !selectedEdgeId ? [selectedNodeId] : []),
    ]))

    for (const edgeId of edgeIds) {
      if (!onEdgeDelete) break
      await onEdgeDelete(edgeId)
    }
    for (const nodeId of nodeIds) {
      if (!onNodeDelete) break
      await onNodeDelete(nodeId)
    }
  }, [getEdges, getNodes, onEdgeDelete, onNodeDelete, selectedEdgeId, selectedNodeId])

  const handleAutoLayout = React.useCallback(() => {
    if (!graph || !onNodePositionsChange) return
    const updates = createAutoLayoutUpdates(graph)
    if (updates.length === 0) return
    setNodes((currentNodes) => currentNodes.map((node) => {
      const update = updates.find((candidate) => candidate.nodeId === node.id)
      return update ? { ...node, position: update.position } : node
    }))
    void onNodePositionsChange(updates)
    window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 420 })
    }, 80)
  }, [fitView, graph, onNodePositionsChange])

  const handleAlignSelection = React.useCallback((alignment: GraphAlignment) => {
    if (selectedFlowNodes.length < 2 || !onNodePositionsChange) return
    const updates = createAlignmentUpdates(selectedFlowNodes, alignment)
    if (updates.length === 0) return
    setNodes((currentNodes) => currentNodes.map((node) => {
      const update = updates.find((candidate) => candidate.nodeId === node.id)
      return update ? { ...node, position: update.position } : node
    }))
    void onNodePositionsChange(updates)
  }, [onNodePositionsChange, selectedFlowNodes])

  const focusNode = React.useCallback((nodeId: string) => {
    const targetNode = renderNodes.find((node) => node.id === nodeId)
    onSelectEdge?.(null)
    onSelectNode?.(nodeId)
    if (!targetNode) return
    void setCenter(
      targetNode.position.x + (targetNode.width ?? 280) / 2,
      targetNode.position.y + (targetNode.height ?? 160) / 2,
      { zoom: 0.92, duration: 360 },
    )
  }, [renderNodes, onSelectEdge, onSelectNode, setCenter])

  const handlePaneDoubleClick = React.useCallback((event: React.MouseEvent) => {
    if (!onNodeCreate || state !== 'ready') return
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    createSceneNodeAt({
      x: Math.round(position.x),
      y: Math.round(position.y),
    })
  }, [createSceneNodeAt, onNodeCreate, screenToFlowPosition, state])

  const handleSelectionChange = React.useCallback(({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    if (selectedEdges.length === 1 && selectedNodes.length === 0) {
      onSelectNode?.(null)
      onSelectEdge?.(selectedEdges[0]!.id)
      return
    }
    if (selectedNodes.length === 1 && selectedEdges.length === 0) {
      onSelectEdge?.(null)
      onSelectNode?.(selectedNodes[0]!.id)
      return
    }
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      onSelectNode?.(null)
      onSelectEdge?.(null)
      return
    }
    onSelectEdge?.(null)
    onSelectNode?.(null)
  }, [onSelectEdge, onSelectNode])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return
      if (state !== 'ready') return

      const key = event.key.toLowerCase()
      const commandKey = event.ctrlKey || event.metaKey
      if (commandKey && key === 'c' && selectedDramaNodes.length > 0) {
        event.preventDefault()
        handleCopySelection()
        return
      }
      if (commandKey && key === 'v' && copiedNodes.length > 0) {
        event.preventDefault()
        handlePasteSelection()
        return
      }
      if (commandKey && key === 'd' && selectedDramaNodes.length > 0) {
        event.preventDefault()
        handleDuplicateSelection()
        return
      }
      if (commandKey && key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedNodeId || selectedEdgeId || getNodes().some((node) => node.selected) || getEdges().some((edge) => edge.selected))) {
        event.preventDefault()
        void handleDeleteSelection()
        return
      }
      if (event.key === 'Escape') {
        onSelectNode?.(null)
        onSelectEdge?.(null)
        setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    copiedNodes,
    getEdges,
    getNodes,
    handleCopySelection,
    handleDeleteSelection,
    handleDuplicateSelection,
    handlePasteSelection,
    onSelectEdge,
    onSelectNode,
    selectedDramaNodes,
    selectedEdgeId,
    selectedNodeId,
    state,
  ])

  return (
    <div className="drama-graph-surface flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--drama-bg,#07080d)] text-white">
      <PanelHeader
        title={tool.title}
        badge={<GraphStatusBadge state={state} />}
        className="border-b border-[var(--drama-border,rgba(255,255,255,0.07))] bg-[var(--drama-surface-strong,#0b0c12)] text-white"
        actions={
          <div className="flex items-center gap-1">
            <IconButton
              icon={<Plus className="size-4" />}
              label="新建场景节点"
              onClick={handleCreateNode}
              disabled={state !== 'ready' || !onNodeCreate}
              className="drama-graph-icon-button text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
            />
            <IconButton
              icon={<Copy className="size-4" />}
              label={selectedDramaNodes.length > 1 ? '复制选中节点组' : '复制选中节点'}
              onClick={handleCopySelection}
              disabled={state !== 'ready' || selectedDramaNodes.length === 0}
              className="drama-graph-icon-button text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
            />
            <IconButton
              icon={<ClipboardPaste className="size-4" />}
              label="粘贴节点"
              title={copiedNodes.length > 0 ? `粘贴 ${copiedNodes.length} 个节点` : '粘贴节点'}
              onClick={handlePasteSelection}
              disabled={state !== 'ready' || copiedNodes.length === 0 || !onNodeCreate}
              className="drama-graph-icon-button text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
            />
            <IconButton
              icon={<LayoutGrid className="size-4" />}
              label="自动布局"
              onClick={handleAutoLayout}
              disabled={state !== 'ready' || !graph || !onNodePositionsChange}
              className="drama-graph-icon-button text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
            />
            <IconButton
              icon={<RefreshCw className={cn('size-4', state === 'loading' && 'animate-spin')} />}
              label="重新读取图数据"
              onClick={onRefresh}
              disabled={state === 'loading'}
              className="drama-graph-icon-button text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
            />
            <IconButton
              icon={<ExternalLink className="size-4" />}
              label="在浏览器打开（备用）"
              onClick={onOpenExternal}
              className="drama-graph-icon-button text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
            />
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="relative min-h-0 overflow-hidden bg-[var(--drama-bg,#050609)]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.045)_1px,_transparent_1px)] bg-[length:24px_24px]" />
          <GraphRuntimeRail model={model} sourcePath={sourcePath} />
          {state === 'ready' && graph && renderNodes.length > 0 ? (
            <GraphSearchPalette
              inputRef={searchInputRef}
              query={searchQuery}
              results={searchResults}
              selectedNodeId={selectedNodeId ?? null}
              onQueryChange={setSearchQuery}
              onSelectNode={focusNode}
            />
          ) : null}
          {state === 'ready' && selectedFlowNodes.length > 1 ? (
            <GraphSelectionToolbar
              selectedCount={selectedFlowNodes.length}
              canDistribute={selectedFlowNodes.length > 2}
              onAlign={handleAlignSelection}
              onDuplicate={handleDuplicateSelection}
              onDelete={() => void handleDeleteSelection()}
            />
          ) : null}

          {state === 'loading' ? <GraphLoadingOverlay /> : null}
          {state === 'error' ? (
            <GraphErrorState error={error} onRefresh={onRefresh} onOpenExternal={onOpenExternal} />
          ) : null}
          {state === 'ready' && model && renderNodes.length === 0 ? <GraphEmptyState onRefresh={onRefresh} /> : null}

          {state === 'ready' && model && renderNodes.length > 0 ? (
            <ReactFlow
              nodes={renderNodes}
              edges={renderEdges}
              nodeTypes={nodeTypes}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              fitView
              minZoom={0.18}
              maxZoom={1.6}
              panOnScroll
              selectionOnDrag
              selectionKeyCode="Shift"
              multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
              onlyRenderVisibleElements
              defaultEdgeOptions={{
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
              onNodesChange={handleNodesChange}
              onConnect={handleConnect}
              onMoveStart={() => setCanvasMoving(true)}
              onMoveEnd={() => setCanvasMoving(false)}
              onSelectionChange={handleSelectionChange}
              onNodeDragStop={(_, node) => {
                const selectedDraggedNodes = getNodes().filter((candidate) => candidate.selected)
                if (selectedDraggedNodes.length > 1 && onNodePositionsChange) {
                  void onNodePositionsChange(selectedDraggedNodes.map((candidate) => ({
                    nodeId: candidate.id,
                    position: candidate.id === node.id ? node.position : candidate.position,
                  })))
                  return
                }
                onNodePositionChange?.(node.id, {
                  x: node.position.x,
                  y: node.position.y,
                })
              }}
              onNodeClick={(event, node) => {
                if (event.shiftKey || event.ctrlKey || event.metaKey) {
                  setNodes((currentNodes) => {
                    const current = currentNodes.find((candidate) => candidate.id === node.id)
                    const nextSelected = !current?.selected
                    return currentNodes.map((candidate) => (
                      candidate.id === node.id ? { ...candidate, selected: nextSelected } : candidate
                    ))
                  })
                  onSelectEdge?.(null)
                  onSelectNode?.(null)
                  return
                }
                setNodes((currentNodes) => currentNodes.map((candidate) => ({
                  ...candidate,
                  selected: candidate.id === node.id,
                })))
                onSelectEdge?.(null)
                onSelectNode?.(node.id)
              }}
              onEdgeClick={(_, edge) => {
                setNodes((currentNodes) => currentNodes.map((candidate) => ({ ...candidate, selected: false })))
                onSelectNode?.(null)
                onSelectEdge?.(edge.id)
              }}
              onPaneClick={(event) => {
                if (event.detail === 2) {
                  handlePaneDoubleClick(event)
                  return
                }
                setNodes((currentNodes) => currentNodes.map((candidate) => ({ ...candidate, selected: false })))
                onSelectNode?.(null)
                onSelectEdge?.(null)
              }}
              className={cn('relative z-[1]', canvasMoving && 'drama-graph-flow-moving')}
            >
              <Background color="rgba(255,255,255,0.07)" gap={24} size={1} />
              <Controls
                className="!border-white/[0.08] !bg-[#0b0d13]/90 !shadow-strong"
                showInteractive={false}
              />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => {
                  const kind = (node.data as StoryletFlowNodeData | undefined)?.node?.kind ?? 'other'
                  return kindMeta[kind].minimapColor
                }}
                maskColor="rgba(5,6,9,0.72)"
                className="!border-white/[0.08] !bg-[#0b0d13]/92"
              />
            </ReactFlow>
          ) : null}
        </main>

        <aside className="drama-graph-inspector hidden min-h-0 flex-col border-l border-[var(--drama-border,rgba(255,255,255,0.07))] bg-[var(--drama-surface-strong,#090a0f)] lg:flex">
          <GraphInspector
            model={model}
            graph={graph}
            selectedNode={selectedNode}
            selectedDramaNode={selectedDramaNode}
            selectedDramaEdge={selectedDramaEdge}
            diagnostics={diagnostics}
            history={history ?? null}
            onRestoreBackup={onRestoreBackup}
            onNodeUpdate={onNodeUpdate}
            onNodeDelete={onNodeDelete}
            onEdgeUpdate={onEdgeUpdate}
            onEdgeDelete={onEdgeDelete}
            onTaskBindingUpsert={onTaskBindingUpsert}
            onTaskBindingDelete={onTaskBindingDelete}
            onOpenPlmChapter={onOpenPlmChapter}
          />
        </aside>
      </div>
    </div>
  )
}

function GraphStatusBadge({ state }: { state: GraphLoadState }) {
  const meta = {
    loading: { label: '读取', tone: 'info' },
    ready: { label: '原生', tone: 'success' },
    error: { label: '错误', tone: 'danger' },
  }[state]

  return (
    <StatusBadge
      className="hidden h-5 px-1.5 py-0.5 sm:inline-flex"
      tone={meta.tone as 'info' | 'success' | 'danger'}
      dot
    >
      {meta.label}
    </StatusBadge>
  )
}

function GraphRuntimeRail({
  model,
  sourcePath,
}: {
  model: StoryletNativeGraphModel | null
  sourcePath?: string
}) {
  return (
    <div
      className="drama-graph-runtime-rail pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#0b0d13]/82 px-2 py-1 text-[11px] text-white/62 shadow-strong backdrop-blur"
      title={sourcePath ? `Graph file: ${sourcePath}` : undefined}
    >
      <span className="drama-graph-runtime-pill inline-flex h-5 shrink-0 items-center gap-1 rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 font-mono text-[10px] font-semibold text-white/82">
        <span className="size-1.5 rounded-full bg-success" />
        原生
      </span>
      <span className="min-w-0 truncate text-white/72">{model?.graphName ?? 'Drama Graph'}</span>
      <span className="text-white/20">/</span>
      <span className="hidden min-w-0 truncate font-mono text-[10px] sm:inline">
        {model ? `${model.summary.cardCount} nodes / ${model.summary.edgeCount} edges` : 'loading'}
      </span>
      <span className="hidden text-white/20 md:inline">/</span>
      <span className="hidden min-w-0 truncate text-[10px] text-white/38 md:inline">autosave</span>
    </div>
  )
}

function searchDramaGraphNodes(graph: DramaGraph | null, query: string): GraphSearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!graph || normalizedQuery.length === 0) return []

  return graph.nodes
    .map((node) => {
      const fieldText = node.fields.map((field) => `${field.label} ${field.text}`).join(' ')
      const haystack = normalizeSearchText(`${node.title} ${node.id} ${node.kind} ${node.description ?? ''} ${fieldText}`)
      if (!haystack.includes(normalizedQuery)) return null
      const matchedField = node.fields.find((field) => normalizeSearchText(`${field.label} ${field.text}`).includes(normalizedQuery))
      const excerpt = matchedField?.text || node.description || node.fields[0]?.text || node.id
      return {
        nodeId: node.id,
        title: node.title,
        kind: node.kind,
        excerpt,
      }
    })
    .filter((result): result is GraphSearchResult => Boolean(result))
    .slice(0, 12)
}

function createAutoLayoutUpdates(graph: DramaGraph): Array<{ nodeId: string; position: { x: number; y: number } }> {
  const kindOrder: StoryletCardKind[] = ['story', 'world', 'character', 'location', 'plot', 'chapter', 'scene', 'other']
  const kindRank = new Map(kindOrder.map((kind, index) => [kind, index]))
  const sortedNodes = graph.nodes.slice().sort((left, right) => {
    const kindDelta = (kindRank.get(left.kind) ?? 99) - (kindRank.get(right.kind) ?? 99)
    if (kindDelta !== 0) return kindDelta
    return left.title.localeCompare(right.title, 'zh-Hans-CN')
  })

  const columnByKind = new Map<StoryletCardKind, number>()
  const rowByKind = new Map<StoryletCardKind, number>()
  for (const kind of kindOrder) {
    columnByKind.set(kind, columnByKind.size)
    rowByKind.set(kind, 0)
  }

  return sortedNodes.map((node) => {
    const column = columnByKind.get(node.kind) ?? columnByKind.size
    const row = rowByKind.get(node.kind) ?? 0
    rowByKind.set(node.kind, row + 1)
    return {
      nodeId: node.id,
      position: {
        x: -980 + column * 340,
        y: -760 + row * 230,
      },
    }
  })
}

function createAlignmentUpdates(
  selectedNodes: StoryletFlowNode[],
  alignment: GraphAlignment,
): Array<{ nodeId: string; position: { x: number; y: number } }> {
  if (selectedNodes.length < 2) return []
  const bounds = selectedNodes.reduce((acc, node) => {
    const width = node.width ?? node.data.node.width
    const height = node.height ?? node.data.node.height
    const left = node.position.x
    const top = node.position.y
    const right = left + width
    const bottom = top + height
    return {
      left: Math.min(acc.left, left),
      top: Math.min(acc.top, top),
      right: Math.max(acc.right, right),
      bottom: Math.max(acc.bottom, bottom),
    }
  }, {
    left: Number.POSITIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
  })
  const centerX = bounds.left + (bounds.right - bounds.left) / 2
  const centerY = bounds.top + (bounds.bottom - bounds.top) / 2

  if (alignment === 'distribute-x') {
    if (selectedNodes.length < 3) return []
    const ordered = selectedNodes.slice().sort((left, right) => left.position.x - right.position.x)
    const totalWidth = ordered.reduce((sum, node) => sum + (node.width ?? node.data.node.width), 0)
    const availableGap = Math.max(24, (bounds.right - bounds.left - totalWidth) / (ordered.length - 1))
    let cursor = bounds.left
    return ordered.map((node) => {
      const width = node.width ?? node.data.node.width
      const update = {
        nodeId: node.id,
        position: {
          ...node.position,
          x: cursor,
        },
      }
      cursor += width + availableGap
      return update
    })
  }

  if (alignment === 'distribute-y') {
    if (selectedNodes.length < 3) return []
    const ordered = selectedNodes.slice().sort((left, right) => left.position.y - right.position.y)
    const totalHeight = ordered.reduce((sum, node) => sum + (node.height ?? node.data.node.height), 0)
    const availableGap = Math.max(24, (bounds.bottom - bounds.top - totalHeight) / (ordered.length - 1))
    let cursor = bounds.top
    return ordered.map((node) => {
      const height = node.height ?? node.data.node.height
      const update = {
        nodeId: node.id,
        position: {
          ...node.position,
          y: cursor,
        },
      }
      cursor += height + availableGap
      return update
    })
  }

  return selectedNodes.map((node) => {
    const width = node.width ?? node.data.node.width
    const height = node.height ?? node.data.node.height
    const nextPosition = { ...node.position }
    if (alignment === 'left') nextPosition.x = bounds.left
    if (alignment === 'center-x') nextPosition.x = centerX - width / 2
    if (alignment === 'right') nextPosition.x = bounds.right - width
    if (alignment === 'top') nextPosition.y = bounds.top
    if (alignment === 'center-y') nextPosition.y = centerY - height / 2
    if (alignment === 'bottom') nextPosition.y = bounds.bottom - height
    return {
      nodeId: node.id,
      position: nextPosition,
    }
  })
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function GraphSelectionToolbar({
  selectedCount,
  canDistribute,
  onAlign,
  onDuplicate,
  onDelete,
}: {
  selectedCount: number
  canDistribute: boolean
  onAlign: (alignment: GraphAlignment) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <div className="absolute bottom-3 left-14 z-10 flex items-center gap-1 rounded-[7px] border border-white/[0.08] bg-[#0b0d13]/90 p-1 shadow-strong backdrop-blur">
      <span className="px-2 font-mono text-[10px] text-white/52">{selectedCount} 选中</span>
      <SelectionToolbarButton label="左对齐" onClick={() => onAlign('left')}>
        <AlignHorizontalJustifyStart className="size-3.5" />
      </SelectionToolbarButton>
      <SelectionToolbarButton label="水平居中" onClick={() => onAlign('center-x')}>
        <AlignHorizontalJustifyCenter className="size-3.5" />
      </SelectionToolbarButton>
      <SelectionToolbarButton label="右对齐" onClick={() => onAlign('right')}>
        <span className="font-mono text-[10px] font-semibold">R</span>
      </SelectionToolbarButton>
      <SelectionToolbarButton label="顶对齐" onClick={() => onAlign('top')}>
        <AlignVerticalJustifyStart className="size-3.5" />
      </SelectionToolbarButton>
      <SelectionToolbarButton label="垂直居中" onClick={() => onAlign('center-y')}>
        <AlignVerticalJustifyCenter className="size-3.5" />
      </SelectionToolbarButton>
      <SelectionToolbarButton label="底对齐" onClick={() => onAlign('bottom')}>
        <span className="font-mono text-[10px] font-semibold">B</span>
      </SelectionToolbarButton>
      <span className="mx-0.5 h-4 w-px bg-white/[0.08]" />
      <SelectionToolbarButton label="水平分布" onClick={() => onAlign('distribute-x')} disabled={!canDistribute}>
        <span className="font-mono text-[10px] font-semibold">H</span>
      </SelectionToolbarButton>
      <SelectionToolbarButton label="垂直分布" onClick={() => onAlign('distribute-y')} disabled={!canDistribute}>
        <span className="font-mono text-[10px] font-semibold">V</span>
      </SelectionToolbarButton>
      <span className="mx-0.5 h-4 w-px bg-white/[0.08]" />
      <SelectionToolbarButton label="复制选中节点组" onClick={onDuplicate}>
        <Copy className="size-3.5" />
      </SelectionToolbarButton>
      <SelectionToolbarButton label="删除选中内容" onClick={onDelete} danger>
        <Trash2 className="size-3.5" />
      </SelectionToolbarButton>
    </div>
  )
}

function SelectionToolbarButton({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-7 place-items-center rounded-[5px] text-white/54 transition-colors hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:text-white/18',
        danger && 'text-red-200/70 hover:bg-red-300/12 hover:text-red-100',
      )}
    >
      {children}
    </button>
  )
}

function GraphSearchPalette({
  inputRef,
  query,
  results,
  selectedNodeId,
  onQueryChange,
  onSelectNode,
}: {
  inputRef?: React.RefObject<HTMLInputElement>
  query: string
  results: GraphSearchResult[]
  selectedNodeId: string | null
  onQueryChange: (query: string) => void
  onSelectNode: (nodeId: string) => void
}) {
  return (
    <div className="drama-graph-search absolute left-3 top-12 z-10 w-[min(360px,calc(100%-1.5rem))] rounded-[8px] border border-white/[0.08] bg-[#0b0d13]/90 p-2 shadow-strong backdrop-blur">
      <label className="drama-graph-search-field flex h-8 items-center gap-2 rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 text-white/70 focus-within:border-white/24">
        <Search className="size-3.5 shrink-0 text-white/38" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索节点，Ctrl+F 聚焦"
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="rounded-[4px] px-1.5 py-0.5 text-[10px] text-white/42 hover:bg-white/[0.08] hover:text-white/72"
          >
            清空
          </button>
        ) : null}
      </label>

      {query.trim() ? (
        <div className="mt-2 max-h-[300px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((result) => {
                const meta = kindMeta[result.kind]
                const Icon = meta.icon
                return (
                  <button
                    key={result.nodeId}
                    type="button"
                    onClick={() => onSelectNode(result.nodeId)}
                    className={cn(
                      'flex w-full min-w-0 items-start gap-2 rounded-[6px] border px-2 py-2 text-left transition-colors',
                      selectedNodeId === result.nodeId
                        ? 'border-white/24 bg-white/[0.11]'
                        : 'border-transparent bg-transparent hover:border-white/[0.08] hover:bg-white/[0.055]',
                    )}
                  >
                    <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-[5px] border border-white/[0.08] bg-white/[0.055]', meta.accent)}>
                      <Icon className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-white/82">{result.title}</span>
                        <span className="shrink-0 rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1 py-0.5 text-[9px] text-white/40">
                          {meta.label}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-white/30">{result.nodeId}</span>
                      <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/48">{result.excerpt}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[6px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-3 text-center text-xs text-white/38">
              没有匹配节点
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function GraphLoadingOverlay() {
  return (
    <div className="pointer-events-none absolute left-3 top-12 z-10 inline-flex items-center gap-2 rounded-[6px] border border-white/[0.08] bg-[#0b0d13]/90 px-2.5 py-1.5 text-xs text-white/66 shadow-strong backdrop-blur">
      <Loader2 className="size-3.5 animate-spin" />
      读取图数据
    </div>
  )
}

function GraphErrorState({
  error,
  onRefresh,
  onOpenExternal,
}: {
  error?: string | null
  onRefresh?: () => void
  onOpenExternal?: () => void
}) {
  return (
    <div className="absolute inset-0 z-[3] flex items-center justify-center bg-[#050609]/88 p-6">
      <div className="w-full max-w-[560px] rounded-[8px] border border-white/[0.08] bg-[#0b0d13]/95 p-5 shadow-strong backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-[7px] border border-amber-300/20 bg-amber-300/10 text-amber-200">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">图源加载失败</h2>
            <p className="mt-1 text-xs leading-5 text-white/62">Drama Graph 使用本地状态图作为主数据，不再依赖 localhost:3000 端口。</p>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-3 py-2.5 font-mono text-[11px] leading-5 text-amber-100/78">
            {error}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onRefresh} className="bg-white text-[#07080d] hover:bg-white/90">
            <RefreshCw className="size-3.5" />
            重新读取
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenExternal} className="border-white/[0.12] bg-white/[0.045] text-white hover:bg-white/[0.08]">
            <ExternalLink className="size-3.5" />
            在浏览器打开（备用）
          </Button>
        </div>
      </div>
    </div>
  )
}

function GraphEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="absolute inset-0 z-[3] grid place-items-center bg-[#050609]/72 p-6">
      <div className="max-w-[420px] rounded-[8px] border border-dashed border-white/[0.12] bg-[#0b0d13]/88 p-5 text-center">
        <Layers className="mx-auto size-7 text-white/40" />
        <h2 className="mt-3 text-sm font-semibold text-white/82">当前图没有节点</h2>
        <p className="mt-1 text-xs leading-5 text-white/42">已加载图数据，但当前没有可渲染的节点。</p>
        <Button size="sm" variant="outline" onClick={onRefresh} className="mt-4 border-white/[0.12] bg-white/[0.045] text-white hover:bg-white/[0.08]">
          <RefreshCw className="size-3.5" />
          重新读取
        </Button>
      </div>
    </div>
  )
}

function GraphInspector({
  model,
  graph,
  selectedNode,
  selectedDramaNode,
  selectedDramaEdge,
  diagnostics,
  history,
  onRestoreBackup,
  onNodeUpdate,
  onNodeDelete,
  onEdgeUpdate,
  onEdgeDelete,
  onTaskBindingUpsert,
  onTaskBindingDelete,
  onOpenPlmChapter,
}: {
  model: StoryletNativeGraphModel | null
  graph: DramaGraph | null
  selectedNode: StoryletNativeGraphNode | null
  selectedDramaNode: DramaNode | null
  selectedDramaEdge: DramaEdge | null
  diagnostics: DramaGraphDiagnostic[]
  history: DramaGraphHistoryResult | null
  onRestoreBackup?: (backupPath: string) => Promise<void> | void
  onNodeUpdate?: (update: DramaNodeUpdate) => Promise<void> | void
  onNodeDelete?: (nodeId: string) => Promise<void> | void
  onEdgeUpdate?: (update: DramaEdgeUpdate) => Promise<void> | void
  onEdgeDelete?: (edgeId: string) => Promise<void> | void
  onTaskBindingUpsert?: (input: {
    nodeId?: string
    edgeId?: string
    taskId: string
    bindingId?: string
    agentId?: string
    crewId?: string
    status?: TaskBindingStatus
  }) => Promise<void> | void
  onTaskBindingDelete?: (bindingId: string) => Promise<void> | void
  onOpenPlmChapter?: (request: DramaGraphOpenPlmChapterRequest) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/[0.07] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">Inspector</div>
        <div className="mt-1 truncate font-mono text-[10px] text-white/32">{model?.schema ?? 'drama.native_graph.v1'}</div>
      </div>

      {selectedDramaEdge ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <GraphDiagnosticsPanel diagnostics={diagnostics} />
          <GraphHistoryPanel history={history} onRestoreBackup={onRestoreBackup} />
          <InspectorEdge
            graph={graph}
            edge={selectedDramaEdge}
            history={history}
            onEdgeUpdate={onEdgeUpdate}
            onEdgeDelete={onEdgeDelete}
            onTaskBindingUpsert={onTaskBindingUpsert}
            onTaskBindingDelete={onTaskBindingDelete}
          />
        </div>
      ) : selectedNode && selectedDramaNode ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <GraphDiagnosticsPanel diagnostics={diagnostics} />
          <GraphHistoryPanel history={history} onRestoreBackup={onRestoreBackup} />
          <InspectorNode
            graph={graph}
            node={selectedNode}
            dramaNode={selectedDramaNode}
            history={history}
            onNodeUpdate={onNodeUpdate}
            onNodeDelete={onNodeDelete}
            onTaskBindingUpsert={onTaskBindingUpsert}
            onTaskBindingDelete={onTaskBindingDelete}
            onOpenPlmChapter={onOpenPlmChapter}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <GraphDiagnosticsPanel diagnostics={diagnostics} />
          <GraphHistoryPanel history={history} onRestoreBackup={onRestoreBackup} />
          <div className="mt-3 flex min-h-[220px] items-center justify-center rounded-[8px] border border-white/[0.07] bg-white/[0.025] p-4 text-center">
            <div className="max-w-[240px]">
              <Layers className="mx-auto size-6 text-white/32" />
              <div className="mt-2 text-sm font-semibold text-white/70">未选择节点</div>
              <p className="mt-1 text-xs leading-5 text-white/38">点击画布节点或关系边查看正式编辑面板。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const editableKinds: StoryletCardKind[] = ['story', 'world', 'character', 'location', 'plot', 'chapter', 'scene', 'other']
const editableEdgeTypes: DramaEdgeType[] = ['contains', 'next', 'blocks', 'supports', 'reveals', 'causal', 'observes', 'custom']

function GraphDiagnosticsPanel({ diagnostics }: { diagnostics: DramaGraphDiagnostic[] }) {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length
  const infoCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'info').length
  const visibleDiagnostics = diagnostics.slice(0, 8)

  return (
    <section className="mb-3 rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">状态机诊断</div>
          <div className="mt-0.5 text-[11px] text-white/34">边关系、章节链和孤立节点</div>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span className={cn('rounded-[4px] border px-1.5 py-0.5', errorCount > 0 ? 'border-red-300/20 bg-red-300/10 text-red-200' : 'border-white/[0.08] bg-white/[0.045] text-white/35')}>
            E {errorCount}
          </span>
          <span className={cn('rounded-[4px] border px-1.5 py-0.5', warningCount > 0 ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-white/[0.08] bg-white/[0.045] text-white/35')}>
            W {warningCount}
          </span>
          <span className={cn('rounded-[4px] border px-1.5 py-0.5', infoCount > 0 ? 'border-sky-300/20 bg-sky-300/10 text-sky-200' : 'border-white/[0.08] bg-white/[0.045] text-white/35')}>
            I {infoCount}
          </span>
        </div>
      </div>

      {diagnostics.length === 0 ? (
        <div className="mt-3 rounded-[6px] border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-2 text-xs text-emerald-100/74">
          当前图没有发现关系冲突。
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {visibleDiagnostics.map((diagnostic) => (
            <div key={diagnostic.id} className={cn(
              'rounded-[6px] border px-2.5 py-2 text-xs leading-5',
              diagnostic.severity === 'error' && 'border-red-300/18 bg-red-300/[0.07] text-red-100/82',
              diagnostic.severity === 'warning' && 'border-amber-300/18 bg-amber-300/[0.07] text-amber-100/82',
              diagnostic.severity === 'info' && 'border-sky-300/18 bg-sky-300/[0.06] text-sky-100/72',
            )}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 opacity-80" />
                <div className="min-w-0 flex-1">
                  <div>{diagnostic.message}</div>
                  <div className="mt-0.5 truncate font-mono text-[10px] opacity-55">{diagnostic.kind}</div>
                </div>
              </div>
            </div>
          ))}
          {diagnostics.length > visibleDiagnostics.length ? (
            <div className="px-1 pt-1 text-[11px] text-white/34">还有 {diagnostics.length - visibleDiagnostics.length} 条诊断未显示。</div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function GraphHistoryPanel({
  history,
  onRestoreBackup,
}: {
  history: DramaGraphHistoryResult | null
  onRestoreBackup?: (backupPath: string) => Promise<void> | void
}) {
  const latestBackup = history?.backups[0]
  const visibleEvents = history?.events.slice(0, 5) ?? []
  const latestBackupDisplayPath = formatGraphStoragePath(latestBackup?.path)
  const eventLogDisplayPath = formatGraphStoragePath(history?.eventLogPath)
  const [restoring, setRestoring] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setError(null)
    setRestoring(false)
  }, [latestBackup?.path])

  const restoreLatestBackup = React.useCallback(async () => {
    if (!latestBackup?.valid || !onRestoreBackup) return
    const confirmed = window.confirm(`恢复到最近备份？\n\n${latestBackup.path}`)
    if (!confirmed) return
    setRestoring(true)
    setError(null)
    try {
      await onRestoreBackup(latestBackup.path)
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : String(restoreError))
    } finally {
      setRestoring(false)
    }
  }, [latestBackup, onRestoreBackup])

  return (
    <section className="mb-3 rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">版本历史</div>
          <div className="mt-0.5 text-[11px] text-white/34">备份、事件日志和恢复依据</div>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-white/38">
          <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5">
            B {history?.backups.length ?? 0}
          </span>
          <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5">
            E {history?.events.length ?? 0}
          </span>
        </div>
      </div>

      {history ? (
        <>
          {latestBackup ? (
            <div className={cn(
              'mt-3 rounded-[6px] border px-2.5 py-2 text-xs leading-5',
              latestBackup.valid
                ? 'border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100/74'
                : 'border-amber-300/18 bg-amber-300/[0.07] text-amber-100/82',
            )}>
              <div className="flex items-center justify-between gap-2">
                <span>{latestBackup.valid ? '最近备份可用' : '最近备份不可用'}</span>
                <span className="font-mono text-[10px] opacity-60">{formatHistoryTime(latestBackup.createdAt)}</span>
              </div>
              <div
                className="mt-0.5 truncate font-mono text-[10px] opacity-55"
                title={latestBackup.path}
              >
                {latestBackupDisplayPath}
              </div>
              {latestBackup.valid ? (
                <div className="mt-1 font-mono text-[10px] opacity-60">
                  {latestBackup.nodeCount ?? 0} nodes / {latestBackup.edgeCount ?? 0} edges
                </div>
              ) : latestBackup.error ? (
                <div className="mt-1 line-clamp-2 text-[11px] opacity-70">{latestBackup.error}</div>
              ) : null}
              {latestBackup.valid && onRestoreBackup ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void restoreLatestBackup()}
                  disabled={restoring}
                  className="mt-2 h-7 w-full justify-center border-white/[0.12] bg-white/[0.045] text-[11px] text-white hover:bg-white/[0.08]"
                >
                  {restoring ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  恢复此备份
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-[6px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 text-xs text-white/38">
              暂无备份；首次写入后会生成可恢复版本。
            </div>
          )}

          {visibleEvents.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {visibleEvents.map((event) => (
                <div key={event.id} className="rounded-[6px] border border-white/[0.06] bg-black/20 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] text-white/62">{event.type}</span>
                    <span className="shrink-0 font-mono text-[10px] text-white/28">{formatHistoryTime(event.createdAt)}</span>
                  </div>
                  {event.actor ? (
                    <div className="mt-0.5 truncate font-mono text-[10px] text-white/28">{event.actor}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div
            className="mt-2 truncate font-mono text-[10px] text-white/24"
            title={history.eventLogPath}
          >
            {eventLogDisplayPath}
          </div>
          {error ? (
            <div className="mt-2 rounded-[6px] border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-xs leading-5 text-destructive-foreground">
              {error}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-3 rounded-[6px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 text-xs text-white/38">
          正在读取历史或当前工作区没有历史记录。
        </div>
      )}
    </section>
  )
}

function GraphSelfReferencePanel({
  graph,
  history,
  node,
  edge,
  storyletNode,
}: {
  graph: DramaGraph | null
  history: DramaGraphHistoryResult | null
  node?: DramaNode
  edge?: DramaEdge
  storyletNode?: StoryletNativeGraphNode
}) {
  const [copied, setCopied] = React.useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const targetId = node?.id ?? edge?.id ?? graph?.id ?? 'graph'
  const sourceRefs = node?.sourceRefs ?? edge?.sourceRefs ?? []
  const relatedEvents = React.useMemo(() => {
    if (!history) return []
    return history.events.filter((event) => {
      if (event.type.includes(targetId)) return true
      if (event.details && JSON.stringify(event.details).includes(targetId)) return true
      return false
    }).slice(0, 4)
  }, [history, targetId])
  const reference = React.useMemo(() => ({
    schema: 'drama.self_reference.v1',
    graph: graph
      ? {
        id: graph.id,
        title: graph.title,
        schema: graph.schema,
        source: graph.source,
        updatedAt: graph.updatedAt,
      }
      : null,
    selection: node
      ? {
        type: 'node',
        node,
        projection: storyletNode
          ? {
            id: storyletNode.id,
            kind: storyletNode.kind,
            title: storyletNode.title,
            position: { x: storyletNode.x, y: storyletNode.y },
            fieldCount: storyletNode.fieldCount,
          }
          : null,
      }
      : edge
        ? {
          type: 'edge',
          edge,
        }
        : {
          type: 'graph',
        },
    sourceRefs,
    relatedEvents,
  }), [edge, graph, node, relatedEvents, sourceRefs, storyletNode])
  const referenceText = React.useMemo(() => JSON.stringify(reference, null, 2), [reference])
  const eventText = React.useMemo(() => JSON.stringify({
    type: node ? 'graph.node.patch.proposed' : edge ? 'graph.edge.patch.proposed' : 'graph.patch.proposed',
    actor: 'drama-ui',
    targetId,
    details: {
      graphId: graph?.id,
      selectionType: node ? 'node' : edge ? 'edge' : 'graph',
      sourceRefs,
    },
  }, null, 2), [edge, graph?.id, node, sourceRefs, targetId])

  const copyText = React.useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard?.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setCopied('复制失败')
      window.setTimeout(() => setCopied(null), 1200)
    }
  }, [])

  return (
    <section className="rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">自指引用</div>
          <div className="mt-0.5 text-[11px] text-white/34">JSON / source refs / graph events</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDetailsOpen((open) => !open)}
            className="h-7 border-white/[0.12] bg-white/[0.045] px-2 text-[11px] text-white/74 hover:bg-white/[0.08]"
          >
            {detailsOpen ? '收起' : '细节'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyText('JSON', referenceText)}
            className="h-7 border-white/[0.12] bg-white/[0.045] px-2 text-[11px] text-white/74 hover:bg-white/[0.08]"
          >
            <Copy className="size-3.5" />
            JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyText('Event', eventText)}
            className="h-7 border-white/[0.12] bg-white/[0.045] px-2 text-[11px] text-white/74 hover:bg-white/[0.08]"
          >
            <GitBranch className="size-3.5" />
            Event
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-white/42">
        <div className="rounded-[6px] border border-white/[0.06] bg-black/20 px-2 py-1.5">
          <div className="text-white/28">target</div>
          <div className="mt-1 truncate text-white/62">{targetId}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.06] bg-black/20 px-2 py-1.5">
          <div className="text-white/28">refs / events</div>
          <div className="mt-1 text-white/62">{sourceRefs.length} / {relatedEvents.length}</div>
        </div>
      </div>

      {detailsOpen ? (
        <div className="mt-2 rounded-[7px] border border-white/[0.06] bg-black/18 p-2">
          {sourceRefs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {sourceRefs.map((ref) => (
                <span
                  key={`${ref.format}:${ref.kind}:${ref.id}`}
                  className="max-w-full truncate rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5 font-mono text-[10px] text-white/46"
                  title={ref.id}
                >
                  {ref.format}:{ref.kind}:{formatGraphStoragePath(ref.id)}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-[6px] border border-dashed border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-xs text-white/34">
              没有外部 sourceRef，当前对象已是 Drama 原生数据。
            </div>
          )}

          {relatedEvents.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {relatedEvents.map((event) => (
                <div key={event.id} className="rounded-[6px] border border-white/[0.06] bg-black/20 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] text-white/62">{event.type}</span>
                    <span className="shrink-0 font-mono text-[10px] text-white/28">{formatHistoryTime(event.createdAt)}</span>
                  </div>
                  {event.actor ? <div className="mt-0.5 truncate font-mono text-[10px] text-white/28">{event.actor}</div> : null}
                </div>
              ))}
            </div>
          ) : null}

          <pre className="mt-2 max-h-44 overflow-auto rounded-[6px] border border-white/[0.06] bg-black/25 p-2.5 text-[10px] leading-5 text-white/54">
            {referenceText}
          </pre>
        </div>
      ) : null}
      {copied ? <div className="mt-2 text-[11px] text-white/38">{copied} 已复制</div> : null}
    </section>
  )
}

function TaskBindingSection({
  graph,
  nodeId,
  edgeId,
  onTaskBindingUpsert,
  onTaskBindingDelete,
  titleSuffix,
}: {
  graph: DramaGraph | null
  nodeId?: string
  edgeId?: string
  onTaskBindingUpsert?: (input: {
    nodeId?: string
    edgeId?: string
    taskId: string
    bindingId?: string
    agentId?: string
    crewId?: string
    status?: TaskBindingStatus
  }) => Promise<void> | void
  onTaskBindingDelete?: (bindingId: string) => Promise<void> | void
  titleSuffix: string
}) {
  const [bindingTaskId, setBindingTaskId] = React.useState('')
  const [bindingAgentId, setBindingAgentId] = React.useState('')
  const [bindingCrewId, setBindingCrewId] = React.useState('')
  const [bindingStatus, setBindingStatus] = React.useState<TaskBindingStatus>('pending')
  const [bindingId, setBindingId] = React.useState<string | null>(null)
  const [savingBinding, setSavingBinding] = React.useState(false)
  const [deletingBindingId, setDeletingBindingId] = React.useState<string | null>(null)
  const [bindingError, setBindingError] = React.useState<string | null>(null)
  const bindings = React.useMemo(() => {
    if (!graph) return []
    if (nodeId) {
      return graph.taskBindings.filter((binding) => binding.nodeId === nodeId)
    }
    if (edgeId) {
      return graph.taskBindings.filter((binding) => binding.edgeId === edgeId)
    }
    return []
  }, [edgeId, graph?.taskBindings, nodeId])

  React.useEffect(() => {
    setBindingTaskId('')
    setBindingAgentId('')
    setBindingCrewId('')
    setBindingStatus('pending')
    setBindingId(null)
    setBindingError(null)
  }, [nodeId, edgeId])

  const addOrUpdateTaskBinding = React.useCallback(async () => {
    if (!onTaskBindingUpsert || !bindingTaskId.trim()) return
    const target = nodeId ? { nodeId } : edgeId ? { edgeId } : null
    if (!target) return
    setSavingBinding(true)
    setBindingError(null)
    try {
      await onTaskBindingUpsert({
        ...target,
        taskId: bindingTaskId.trim(),
        bindingId: bindingId ?? undefined,
        agentId: bindingAgentId.trim() || undefined,
        crewId: bindingCrewId.trim() || undefined,
        status: bindingStatus,
      } as DramaTaskBindingUpsertInput)
      setBindingTaskId('')
      setBindingAgentId('')
      setBindingCrewId('')
      setBindingStatus('pending')
      setBindingId(null)
    } catch (error) {
      setBindingError(error instanceof Error ? error.message : String(error))
    } finally {
      setSavingBinding(false)
    }
  }, [bindingAgentId, bindingCrewId, bindingId, bindingStatus, bindingTaskId, edgeId, nodeId, onTaskBindingUpsert])

  const removeTaskBinding = React.useCallback(async (targetBindingId: string) => {
    if (!onTaskBindingDelete) return
    setDeletingBindingId(targetBindingId)
    setBindingError(null)
    try {
      await onTaskBindingDelete(targetBindingId)
    } catch (error) {
      setBindingError(error instanceof Error ? error.message : String(error))
    } finally {
      setDeletingBindingId(null)
    }
  }, [onTaskBindingDelete])

  const fillForEdit = React.useCallback((binding: DramaTaskBinding) => {
    setBindingId(binding.id)
    setBindingTaskId(binding.taskId)
    setBindingAgentId(binding.agentId ?? '')
    setBindingCrewId(binding.crewId ?? '')
    setBindingStatus(binding.status)
  }, [])

  const clearEdit = React.useCallback(() => {
    setBindingId(null)
    setBindingTaskId('')
    setBindingAgentId('')
    setBindingCrewId('')
    setBindingStatus('pending')
  }, [])

  const bindingTargetReady = Boolean(nodeId || edgeId)

  return (
    <div className="space-y-2 rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">任务绑定</div>
          <div className="mt-0.5 text-[11px] text-white/34">绑定 taskId 到当前{titleSuffix}</div>
        </div>
        <div className="flex items-center gap-1">
          {bindingId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearEdit()}
              className="h-7 border-white/[0.15] bg-white/[0.05] px-2 text-[11px] text-white/78 hover:bg-white/[0.1]"
            >
              取消编辑
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => void addOrUpdateTaskBinding()}
            disabled={savingBinding || !bindingTargetReady || !bindingTaskId.trim() || !onTaskBindingUpsert}
            className="h-7 rounded-[6px] bg-white px-2 text-[11px] text-[#07080d] hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
          >
            {savingBinding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            {bindingId ? '更新绑定' : '绑定任务'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid gap-2">
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">Task ID</span>
            <input
              value={bindingTaskId}
              onChange={(event) => setBindingTaskId(event.target.value)}
              placeholder="例如: task-1"
              className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 text-sm text-white outline-none focus:border-white/24"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">Agent ID</span>
              <input
                value={bindingAgentId}
                onChange={(event) => setBindingAgentId(event.target.value)}
                placeholder="可选"
                className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 text-sm text-white outline-none focus:border-white/24"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">Crew ID</span>
              <input
                value={bindingCrewId}
                onChange={(event) => setBindingCrewId(event.target.value)}
                placeholder="可选"
                className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 text-sm text-white outline-none focus:border-white/24"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">状态</span>
            <select
              value={bindingStatus}
              onChange={(event) => setBindingStatus(event.target.value as TaskBindingStatus)}
              className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-[#101218] px-2 text-sm text-white outline-none focus:border-white/24"
            >
              <option value="pending">pending</option>
              <option value="active">active</option>
              <option value="done">done</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
        </div>

        {bindings.length > 0 ? (
          <div className="space-y-1.5">
            {bindings.map((binding) => (
              <div key={binding.id} className="rounded-[6px] border border-white/[0.08] bg-black/25 px-2.5 py-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-white">{binding.taskId}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/52">
                      {binding.agentId ? <span>agent={binding.agentId}</span> : null}
                      {binding.crewId ? <span>crew={binding.crewId}</span> : null}
                      <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5">{binding.status}</span>
                      <span className="truncate rounded-[4px] border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5">{binding.id}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fillForEdit(binding)}
                      className="h-7 border-white/[0.15] bg-white/[0.05] px-2 text-[11px] text-white/78 hover:bg-white/[0.1]"
                    >
                      修改
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void removeTaskBinding(binding.id)}
                      disabled={deletingBindingId === binding.id || !onTaskBindingDelete}
                      className="h-7 border-destructive/30 bg-destructive/10 text-destructive-foreground hover:bg-destructive/15"
                    >
                      {deletingBindingId === binding.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[6px] border border-dashed border-white/[0.1] bg-white/[0.02] px-3 py-3 text-center text-xs text-white/38">
            当前无任务绑定，先填入 Task ID 并绑定
          </div>
        )}
      </div>

      {bindingError ? (
        <div className="rounded-[6px] border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-xs leading-5 text-destructive-foreground">
          {bindingError}
        </div>
      ) : null}
    </div>
  )
}

function formatHistoryTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'unknown'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatGraphStoragePath(value?: string | null): string {
  if (!value) return '.drama'
  const normalized = value.replace(/\\/g, '/')
  const dramaIndex = normalized.lastIndexOf('/.drama/')
  if (dramaIndex >= 0) return normalized.slice(dramaIndex + 1)
  const segments = normalized.split('/').filter(Boolean)
  return segments.slice(-2).join('/') || value
}

function InspectorEdge({
  graph,
  edge,
  history,
  onEdgeUpdate,
  onEdgeDelete,
  onTaskBindingUpsert,
  onTaskBindingDelete,
}: {
  graph: DramaGraph | null
  edge: DramaEdge
  history: DramaGraphHistoryResult | null
  onEdgeUpdate?: (update: DramaEdgeUpdate) => Promise<void> | void
  onEdgeDelete?: (edgeId: string) => Promise<void> | void
  onTaskBindingUpsert?: (input: {
    nodeId?: string
    edgeId?: string
    taskId: string
    bindingId?: string
    agentId?: string
    crewId?: string
    status?: TaskBindingStatus
  }) => Promise<void> | void
  onTaskBindingDelete?: (bindingId: string) => Promise<void> | void
}) {
  const [label, setLabel] = React.useState(edge.label)
  const [type, setType] = React.useState<DramaEdgeType>(edge.type)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLabel(edge.label)
    setType(edge.type)
    setError(null)
  }, [edge])

  const dirty = label !== edge.label || type !== edge.type

  const save = React.useCallback(async () => {
    if (!dirty || !onEdgeUpdate) return
    setSaving(true)
    setError(null)
    try {
      await onEdgeUpdate({
        edgeId: edge.id,
        label: label.trim() || edge.type,
        type,
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setSaving(false)
    }
  }, [dirty, edge.id, edge.type, label, onEdgeUpdate, type])

  const deleteEdge = React.useCallback(async () => {
    if (!onEdgeDelete) return
    setDeleting(true)
    setError(null)
    try {
      await onEdgeDelete(edge.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError))
    } finally {
      setDeleting(false)
    }
  }, [edge.id, onEdgeDelete])

  return (
    <div className="space-y-3">
      <div className="rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-3">
        <div className="flex items-start gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-[7px] border border-white/[0.08] bg-white/[0.055] text-amber-200">
            <GitBranch className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{edge.label}</div>
            <div className="mt-1 font-mono text-[10px] text-white/36">{edge.id}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-white/38">
          <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5">{edge.type}</span>
          <span>{edge.sourceId} {'->'} {edge.targetId}</span>
        </div>
      </div>

      <GraphSelfReferencePanel graph={graph} history={history} edge={edge} />

      <div className="space-y-2 rounded-[8px] border border-white/[0.07] bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">编辑关系边</div>
            <div className="mt-0.5 text-[11px] text-white/34">保存后写入 graph event</div>
          </div>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!dirty || saving || !onEdgeUpdate}
            className="h-7 rounded-[6px] bg-white px-2 text-[11px] text-[#07080d] hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            保存
          </Button>
        </div>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">标签</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 text-sm text-white outline-none focus:border-white/24"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">类型</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as DramaEdgeType)}
            className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-[#101218] px-2 text-sm text-white outline-none focus:border-white/24"
          >
            {editableEdgeTypes.map((candidate) => (
              <option key={candidate} value={candidate}>{candidate}</option>
            ))}
          </select>
        </label>
        {error ? (
          <div className="rounded-[6px] border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-xs leading-5 text-destructive-foreground">
            {error}
          </div>
        ) : null}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => void deleteEdge()}
        disabled={deleting || !onEdgeDelete}
        className="w-full justify-center border-destructive/30 bg-destructive/10 text-destructive-foreground hover:bg-destructive/15"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        删除关系边
      </Button>

      <TaskBindingSection
        graph={graph}
        edgeId={edge.id}
        onTaskBindingUpsert={onTaskBindingUpsert}
        onTaskBindingDelete={onTaskBindingDelete}
        titleSuffix="关系边"
      />
    </div>
  )
}

function InspectorNode({
  graph,
  node,
  dramaNode,
  history,
  onNodeUpdate,
  onNodeDelete,
  onTaskBindingUpsert,
  onTaskBindingDelete,
  onOpenPlmChapter,
}: {
  graph: DramaGraph | null
  node: StoryletNativeGraphNode
  dramaNode: DramaNode
  history: DramaGraphHistoryResult | null
  onNodeUpdate?: (update: DramaNodeUpdate) => Promise<void> | void
  onNodeDelete?: (nodeId: string) => Promise<void> | void
  onTaskBindingUpsert?: (input: {
    nodeId?: string
    edgeId?: string
    taskId: string
    bindingId?: string
    agentId?: string
    crewId?: string
    status?: TaskBindingStatus
  }) => Promise<void> | void
  onTaskBindingDelete?: (bindingId: string) => Promise<void> | void
  onOpenPlmChapter?: (request: DramaGraphOpenPlmChapterRequest) => void
}) {
  const meta = kindMeta[node.kind]
  const Icon = meta.icon
  const [title, setTitle] = React.useState(dramaNode.title)
  const [kind, setKind] = React.useState<StoryletCardKind>(dramaNode.kind)
  const [description, setDescription] = React.useState(dramaNode.description ?? '')
  const [fields, setFields] = React.useState(() => dramaNode.fields.map((field) => ({
    id: field.id,
    label: field.label,
    text: field.text,
  })))
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const chapter = graph?.chapters.find((candidate) => candidate.nodeId === dramaNode.id)
  const linkedDrafts = React.useMemo(() => {
    if (!graph) return []
    const targetIds = new Set([
      dramaNode.id,
      ...(chapter ? [chapter.id] : []),
    ])
    return graph.drafts.filter((draft) => targetIds.has(draft.targetId) || chapter?.draftIds.includes(draft.id))
  }, [chapter, dramaNode.id, graph])
  const latestDraft = linkedDrafts[0]

  React.useEffect(() => {
    setTitle(dramaNode.title)
    setKind(dramaNode.kind)
    setDescription(dramaNode.description ?? '')
    setFields(dramaNode.fields.map((field) => ({
      id: field.id,
      label: field.label,
      text: field.text,
    })))
    setSaveError(null)
  }, [dramaNode])

  const dirty = title !== dramaNode.title
    || kind !== dramaNode.kind
    || description !== (dramaNode.description ?? '')
    || fields.some((field, index) => field.text !== (dramaNode.fields[index]?.text ?? ''))

  const save = React.useCallback(async () => {
    if (!dirty || !onNodeUpdate) return
    setSaving(true)
    setSaveError(null)
    try {
      await onNodeUpdate({
        nodeId: dramaNode.id,
        title: title.trim() || dramaNode.title,
        kind,
        description,
        fields: fields.map((field) => ({
          id: field.id,
          text: field.text,
        })),
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }, [description, dirty, dramaNode.id, dramaNode.title, fields, kind, onNodeUpdate, title])

  const deleteNode = React.useCallback(async () => {
    if (!onNodeDelete) return
    const confirmed = window.confirm(`删除节点「${dramaNode.title}」？相关关系边也会一起删除。`)
    if (!confirmed) return
    setDeleting(true)
    setSaveError(null)
    try {
      await onNodeDelete(dramaNode.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
    } finally {
      setDeleting(false)
    }
  }, [dramaNode.id, dramaNode.title, onNodeDelete])

  const openInPlm = React.useCallback(() => {
    if (!chapter) return
    onOpenPlmChapter?.({
      schema: DRAMA_PLM_OPEN_REQUEST_KEY,
      source: 'drama-graph',
      graphId: graph?.id,
      graphNodeId: dramaNode.id,
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      title: dramaNode.title,
      createdAt: Date.now(),
    })
  }, [chapter, dramaNode.id, dramaNode.title, graph?.id, onOpenPlmChapter])

  return (
    <div className="space-y-3">
      <div className={cn('rounded-[8px] border bg-white/[0.035] p-3', meta.nodeClassName)}>
        <div className="flex items-start gap-2.5">
          <div className={cn('grid size-9 shrink-0 place-items-center rounded-[7px] border border-white/[0.08] bg-white/[0.055]', meta.accent)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{dramaNode.title}</div>
            <div className="mt-1 font-mono text-[10px] text-white/36">{node.id}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-white/38">
          <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5">{meta.label}</span>
          <span>{node.fieldCount} fields</span>
          <span>{Math.round(node.x)}, {Math.round(node.y)}</span>
          {chapter ? <span>CH {chapter.number}</span> : null}
        </div>
        {chapter ? (
          <Button
            size="sm"
            variant="outline"
            onClick={openInPlm}
            className="mt-3 h-7 w-full justify-center border-white/[0.12] bg-white/[0.045] text-[11px] text-white hover:bg-white/[0.08]"
          >
            <ScrollText className="size-3.5" />
            在 Drama PLM 打开第 {chapter.number} 章
          </Button>
        ) : null}
      </div>

      <GraphSelfReferencePanel graph={graph} history={history} node={dramaNode} storyletNode={node} />

      <div className="space-y-2 rounded-[8px] border border-white/[0.07] bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">编辑节点</div>
            <div className="mt-0.5 text-[11px] text-white/34">保存后写入 .drama/graphs</div>
          </div>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!dirty || saving || !onNodeUpdate}
            className="h-7 rounded-[6px] bg-white px-2 text-[11px] text-[#07080d] hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            保存
          </Button>
        </div>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">标题</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 text-sm text-white outline-none focus:border-white/24"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">类型</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as StoryletCardKind)}
            className="h-8 w-full rounded-[6px] border border-white/[0.08] bg-[#101218] px-2 text-sm text-white outline-none focus:border-white/24"
          >
            {editableKinds.map((candidate) => (
              <option key={candidate} value={candidate}>{kindMeta[candidate].label}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">描述</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-[6px] border border-white/[0.08] bg-white/[0.045] px-2 py-1.5 text-xs leading-5 text-white outline-none focus:border-white/24"
          />
        </label>
        {saveError ? (
          <div className="rounded-[6px] border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-xs leading-5 text-destructive-foreground">
            {saveError}
          </div>
        ) : null}
      </div>

      {node.summary ? (
        <div className="rounded-[7px] border border-white/[0.07] bg-black/20 px-3 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">Summary</div>
          <div className="mt-1 text-sm leading-6 text-white/72">{node.summary}</div>
        </div>
      ) : null}

      {chapter || latestDraft ? (
        <div className="rounded-[8px] border border-white/[0.07] bg-white/[0.035] p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">PLM 草稿</div>
              <div className="mt-0.5 text-[11px] text-white/34">DramaDraft / 章节状态</div>
            </div>
            {chapter ? (
              <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5 font-mono text-[10px] text-white/42">
                {chapter.status}
              </span>
            ) : null}
          </div>
          {latestDraft ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-white/38">
                <span className="rounded-[4px] border border-emerald-300/15 bg-emerald-300/[0.06] px-1.5 py-0.5 text-emerald-100/72">{latestDraft.source}</span>
                <span>{latestDraft.status}</span>
                <span>{latestDraft.content.length} chars</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-[6px] border border-white/[0.06] bg-black/25 px-2.5 py-2 text-xs leading-5 text-white/68">
                {latestDraft.content}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-[6px] border border-dashed border-white/[0.1] bg-white/[0.02] px-3 py-4 text-center text-xs leading-5 text-white/38">
              这个章节还没有 DramaDraft。到 PLM 生成或保存章节后会自动写回这里。
            </div>
          )}
        </div>
      ) : null}

      <TaskBindingSection
        graph={graph}
        nodeId={dramaNode.id}
        onTaskBindingUpsert={onTaskBindingUpsert}
        onTaskBindingDelete={onTaskBindingDelete}
        titleSuffix="节点"
      />

      <div className="space-y-2">
        {fields.length > 0 ? (
          fields.map((field, index) => (
            <div key={field.id} className="rounded-[7px] border border-white/[0.07] bg-black/20 px-3 py-2.5">
              <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-white/34">{field.label}</div>
              <textarea
                value={field.text}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setFields((current) => current.map((candidate, candidateIndex) => (
                    candidateIndex === index ? { ...candidate, text: nextValue } : candidate
                  )))
                }}
                rows={Math.min(6, Math.max(2, Math.ceil(field.text.length / 48)))}
                className="mt-1 w-full resize-y rounded-[6px] border border-white/[0.06] bg-white/[0.035] px-2 py-1.5 text-xs leading-5 text-white/70 outline-none focus:border-white/22"
              />
            </div>
          ))
        ) : (
          <div className="rounded-[7px] border border-dashed border-white/[0.1] bg-white/[0.02] px-3 py-6 text-center text-xs text-white/38">
            没有可预览字段
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => void deleteNode()}
        disabled={deleting || !onNodeDelete}
        className="w-full justify-center border-destructive/30 bg-destructive/10 text-destructive-foreground hover:bg-destructive/15"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        删除节点
      </Button>
    </div>
  )
}
