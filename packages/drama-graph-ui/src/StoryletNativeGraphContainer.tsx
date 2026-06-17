import * as React from 'react'

import { buildStoryletNativeGraphModelFromDramaGraph, type StoryletNativeGraphModel } from '@drama/graph'
import type { DramaEdgeCreateInput, DramaEdgeUpdate, DramaGraph, DramaNodeCreateInput, DramaNodeUpdate } from '@drama/core'
import type {
  DramaGraphHistoryRequest,
  DramaGraphHistoryResult,
  DramaGraphLoadResult,
  DramaGraphMutationResult,
  DramaGraphNodePositionUpdateRequest,
  DramaGraphNodeUpdateRequest,
  DramaGraphNodeCreateRequest,
  DramaGraphNodeDeleteRequest,
  DramaGraphEdgeUpdateRequest,
  DramaGraphEdgeCreateRequest,
  DramaGraphEdgeDeleteRequest,
  DramaGraphRestoreBackupRequest,
  DramaGraphTaskBindingUpsertRequest,
  DramaGraphTaskBindingDeleteRequest,
} from '@drama/graph/ipc-contract'

import {
  StoryletNativeGraphPage,
  type DramaGraphOpenPlmChapterRequest,
  type DramaGraphToolConfig,
} from './StoryletNativeGraphPage'

type LoadState = 'loading' | 'ready' | 'error'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export interface StoryletNativeGraphContainerProps {
  tool: DramaGraphToolConfig
  api: DramaGraphUiApi
  onOpenPlmChapter?: (request: DramaGraphOpenPlmChapterRequest) => void
}

export interface DramaGraphUiApi {
  loadDramaGraph(): Promise<DramaGraphLoadResult>
  loadDramaGraphHistory(request: DramaGraphHistoryRequest): Promise<DramaGraphHistoryResult>
  updateDramaGraphNodePositions(request: DramaGraphNodePositionUpdateRequest): Promise<DramaGraphMutationResult>
  updateDramaGraphNode(request: DramaGraphNodeUpdateRequest): Promise<DramaGraphMutationResult>
  createDramaGraphNode(request: DramaGraphNodeCreateRequest): Promise<DramaGraphMutationResult>
  deleteDramaGraphNode(request: DramaGraphNodeDeleteRequest): Promise<DramaGraphMutationResult>
  updateDramaGraphEdge(request: DramaGraphEdgeUpdateRequest): Promise<DramaGraphMutationResult>
  createDramaGraphEdge(request: DramaGraphEdgeCreateRequest): Promise<DramaGraphMutationResult>
  deleteDramaGraphEdge(request: DramaGraphEdgeDeleteRequest): Promise<DramaGraphMutationResult>
  restoreDramaGraphBackup(request: DramaGraphRestoreBackupRequest): Promise<DramaGraphMutationResult>
  upsertDramaGraphTaskBinding(request: DramaGraphTaskBindingUpsertRequest): Promise<DramaGraphMutationResult>
  deleteDramaGraphTaskBinding(request: DramaGraphTaskBindingDeleteRequest): Promise<DramaGraphMutationResult>
  openUrl(url: string): Promise<void> | void
}

export function StoryletNativeGraphContainer({ tool, api, onOpenPlmChapter }: StoryletNativeGraphContainerProps) {
  const [state, setState] = React.useState<LoadState>('loading')
  const [graph, setGraph] = React.useState<DramaGraph | null>(null)
  const [model, setModel] = React.useState<StoryletNativeGraphModel | null>(null)
  const [sourcePath, setSourcePath] = React.useState<string | undefined>()
  const [error, setError] = React.useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null)
  const [graphId, setGraphId] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<DramaGraphHistoryResult | null>(null)

  const loadHistory = React.useCallback(async (targetGraphId: string) => {
    try {
      const snapshot = await api.loadDramaGraphHistory({
        graphId: targetGraphId,
        maxBackups: 12,
        maxEvents: 16,
      })
      setHistory(snapshot)
    } catch {
      setHistory(null)
    }
  }, [])

  const loadGraph = React.useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const snapshot = await api.loadDramaGraph()
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(snapshot.graph)
      setGraph(snapshot.graph)
      setModel(nextModel)
      setGraphId(snapshot.graph.id)
      setSourcePath(snapshot.path)
      void loadHistory(snapshot.graph.id)
      setSelectedNodeId((current) => (
        current && nextModel.nodes.some((node) => node.id === current)
          ? current
          : nextModel.nodes[0]?.id ?? null
      ))
      setSelectedEdgeId((current) => (
        current && snapshot.graph.edges.some((edge) => edge.id === current)
          ? current
          : null
      ))
      setState('ready')
    } catch (loadError) {
      setModel(null)
      setGraph(null)
      setGraphId(null)
      setSelectedEdgeId(null)
      setHistory(null)
      setError(errorMessage(loadError))
      setState('error')
    }
  }, [loadHistory])

  const updateNodePosition = React.useCallback(async (nodeId: string, position: { x: number; y: number }) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.updateDramaGraphNodePositions({
        graphId: targetGraphId,
        updates: [{ nodeId, position }],
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
    }
  }, [graphId, model?.graphId])

  const updateNodePositions = React.useCallback(async (updates: Array<{ nodeId: string; position: { x: number; y: number } }>) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId || updates.length === 0) return
    try {
      const result = await api.updateDramaGraphNodePositions({
        graphId: targetGraphId,
        updates,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graphId, model?.graphId])

  const updateNode = React.useCallback(async (update: DramaNodeUpdate) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.updateDramaGraphNode({
        graphId: targetGraphId,
        update,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setSelectedNodeId(update.nodeId)
      setSelectedEdgeId(null)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graphId, model?.graphId])

  const createNode = React.useCallback(async (input: DramaNodeCreateInput) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const previousNodeIds = new Set(graph?.nodes.map((node) => node.id) ?? [])
      const result = await api.createDramaGraphNode({
        graphId: targetGraphId,
        input,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      const createdNode = result.graph.nodes.find((node) => !previousNodeIds.has(node.id))
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setSelectedNodeId(createdNode?.id ?? nextModel.nodes[0]?.id ?? null)
      setSelectedEdgeId(null)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graph?.nodes, graphId, model?.graphId])

  const deleteNode = React.useCallback(async (nodeId: string) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.deleteDramaGraphNode({
        graphId: targetGraphId,
        input: { nodeId },
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setSelectedEdgeId(null)
      setSelectedNodeId(nextModel.nodes[0]?.id ?? null)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graphId, model?.graphId])

  const updateEdge = React.useCallback(async (update: DramaEdgeUpdate) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.updateDramaGraphEdge({
        graphId: targetGraphId,
        update,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setSelectedNodeId(null)
      setSelectedEdgeId(update.edgeId)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graphId, model?.graphId])

  const createEdge = React.useCallback(async (input: DramaEdgeCreateInput) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const previousEdgeIds = new Set(graph?.edges.map((edge) => edge.id) ?? [])
      const result = await api.createDramaGraphEdge({
        graphId: targetGraphId,
        input,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      const createdEdge = result.graph.edges.find((edge) => !previousEdgeIds.has(edge.id))
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setSelectedNodeId(null)
      setSelectedEdgeId(createdEdge?.id ?? null)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graph?.edges, graphId, model?.graphId])

  const deleteEdge = React.useCallback(async (edgeId: string) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.deleteDramaGraphEdge({
        graphId: targetGraphId,
        edgeId,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setSelectedEdgeId(null)
      setSelectedNodeId(nextModel.nodes[0]?.id ?? null)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graphId, model?.graphId])

  const upsertTaskBinding = React.useCallback(async (input: {
    nodeId?: string
    edgeId?: string
    taskId: string
    agentId?: string
    crewId?: string
    status?: 'pending' | 'active' | 'done' | 'cancelled'
  }) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.upsertDramaGraphTaskBinding({
        graphId: targetGraphId,
        input,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setState('ready')
    } catch (error) {
      setError(errorMessage(error))
      setState('error')
      throw error
    }
  }, [graphId, loadHistory, model?.graphId])

  const deleteTaskBinding = React.useCallback(async (bindingId: string) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.deleteDramaGraphTaskBinding({
        graphId: targetGraphId,
        input: { bindingId },
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      void loadHistory(result.graph.id)
      setState('ready')
    } catch (error) {
      setError(errorMessage(error))
      setState('error')
      throw error
    }
  }, [graphId, loadHistory, model?.graphId])

  const restoreBackup = React.useCallback(async (backupPath: string) => {
    const targetGraphId = graphId ?? model?.graphId
    if (!targetGraphId) return
    try {
      const result = await api.restoreDramaGraphBackup({
        graphId: targetGraphId,
        backupPath,
      })
      const nextModel = buildStoryletNativeGraphModelFromDramaGraph(result.graph)
      setGraph(result.graph)
      setModel(nextModel)
      setSourcePath(result.path)
      setSelectedEdgeId(null)
      setSelectedNodeId(nextModel.nodes[0]?.id ?? null)
      void loadHistory(result.graph.id)
      setState('ready')
    } catch (updateError) {
      setError(errorMessage(updateError))
      setState('error')
      throw updateError
    }
  }, [graphId, loadHistory, model?.graphId])

  const externalUrl = tool.externalUrl ?? tool.url
  const canOpenExternal = externalUrl?.startsWith('http://') || externalUrl?.startsWith('https://') || externalUrl?.startsWith('drama://') || externalUrl?.startsWith('craftagents://')
  const openExternal = React.useCallback(() => {
    if (!canOpenExternal) return
    void api.openUrl(externalUrl)
  }, [canOpenExternal, externalUrl])

  React.useEffect(() => {
    void loadGraph()
  }, [loadGraph])

  return (
    <StoryletNativeGraphPage
      tool={tool}
      state={state}
      graph={graph}
      history={history}
      model={model}
      sourcePath={sourcePath}
      error={error}
      selectedNodeId={selectedNodeId}
      selectedEdgeId={selectedEdgeId}
      onSelectNode={setSelectedNodeId}
      onSelectEdge={setSelectedEdgeId}
      onNodePositionChange={(nodeId, position) => void updateNodePosition(nodeId, position)}
      onNodePositionsChange={updateNodePositions}
      onNodeCreate={createNode}
      onNodeUpdate={updateNode}
      onNodeDelete={deleteNode}
      onEdgeCreate={createEdge}
      onEdgeUpdate={updateEdge}
      onEdgeDelete={deleteEdge}
      onTaskBindingUpsert={upsertTaskBinding}
      onTaskBindingDelete={deleteTaskBinding}
      onRestoreBackup={restoreBackup}
      onOpenPlmChapter={onOpenPlmChapter}
      onRefresh={() => void loadGraph()}
      onOpenExternal={canOpenExternal ? openExternal : undefined}
    />
  )
}
