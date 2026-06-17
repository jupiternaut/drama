import type { DramaGraphUiApi } from '@drama/graph-ui'
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
import type { DramaRuntimeClient, DramaRuntimeStatus } from '@drama/host'

export interface CreateRuntimeGraphApiOptions {
  runtime: DramaRuntimeClient
  fallback: DramaGraphUiApi
  onRuntimeStatus?: (status: DramaRuntimeStatus) => void
}

const offlineStatus = (message: string): DramaRuntimeStatus => ({
  state: 'offline',
  message,
  updatedAt: new Date().toISOString(),
})

async function withRuntimeFallback<T>(
  options: CreateRuntimeGraphApiOptions,
  channel: string,
  payload: unknown,
  fallback: () => Promise<T> | T,
): Promise<T> {
  try {
    const result = await options.runtime.request<T>(channel, payload)
    options.onRuntimeStatus?.({
      state: 'ready',
      message: 'Drama standalone runtime connected.',
      updatedAt: new Date().toISOString(),
    })
    return result
  } catch (error) {
    options.onRuntimeStatus?.(offlineStatus(error instanceof Error ? error.message : String(error)))
    return fallback()
  }
}

export function createRuntimeBackedGraphApi(options: CreateRuntimeGraphApiOptions): DramaGraphUiApi {
  return {
    loadDramaGraph(): Promise<DramaGraphLoadResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:load',
        undefined,
        () => options.fallback.loadDramaGraph(),
      )
    },

    loadDramaGraphHistory(request: DramaGraphHistoryRequest): Promise<DramaGraphHistoryResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:history',
        request,
        () => options.fallback.loadDramaGraphHistory(request),
      )
    },

    updateDramaGraphNodePositions(request: DramaGraphNodePositionUpdateRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:updateNodePositions',
        request,
        () => options.fallback.updateDramaGraphNodePositions(request),
      )
    },

    updateDramaGraphNode(request: DramaGraphNodeUpdateRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:updateNode',
        request,
        () => options.fallback.updateDramaGraphNode(request),
      )
    },

    createDramaGraphNode(request: DramaGraphNodeCreateRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:createNode',
        request,
        () => options.fallback.createDramaGraphNode(request),
      )
    },

    deleteDramaGraphNode(request: DramaGraphNodeDeleteRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:deleteNode',
        request,
        () => options.fallback.deleteDramaGraphNode(request),
      )
    },

    updateDramaGraphEdge(request: DramaGraphEdgeUpdateRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:updateEdge',
        request,
        () => options.fallback.updateDramaGraphEdge(request),
      )
    },

    createDramaGraphEdge(request: DramaGraphEdgeCreateRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:createEdge',
        request,
        () => options.fallback.createDramaGraphEdge(request),
      )
    },

    deleteDramaGraphEdge(request: DramaGraphEdgeDeleteRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:deleteEdge',
        request,
        () => options.fallback.deleteDramaGraphEdge(request),
      )
    },

    restoreDramaGraphBackup(request: DramaGraphRestoreBackupRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:restoreBackup',
        request,
        () => options.fallback.restoreDramaGraphBackup(request),
      )
    },

    upsertDramaGraphTaskBinding(request: DramaGraphTaskBindingUpsertRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:upsertTaskBinding',
        request,
        () => options.fallback.upsertDramaGraphTaskBinding(request),
      )
    },

    deleteDramaGraphTaskBinding(request: DramaGraphTaskBindingDeleteRequest): Promise<DramaGraphMutationResult> {
      return withRuntimeFallback(
        options,
        'drama:graph:deleteTaskBinding',
        request,
        () => options.fallback.deleteDramaGraphTaskBinding(request),
      )
    },

    openUrl(url) {
      return options.fallback.openUrl(url)
    },
  }
}
