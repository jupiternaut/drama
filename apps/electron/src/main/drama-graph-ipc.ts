import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createEmptyDramaGraph } from '@drama/core'
import { createSkillCrewTaskBindingDeleteEvent, createSkillCrewTaskBindingUpsertEvent } from '@drama/crew'
import { dramaGraphFromStoryletState } from '@drama/graph'

import { DramaGraphStore, recordDramaProjectFile } from '@drama/graph/node-store'
import {
  applyPlotPilotChapterToStoryletGraph,
  buildStoryletBridgeSnapshot,
  type StoryletBridgeLoadOptions,
  type StoryletChapterWritebackFileResult,
  type StoryletChapterWritebackRequest,
} from '../shared/storylet-plotpilot-bridge'
import type {
  DramaGraphDraftUpsertRequest,
  DramaGraphEdgeCreateRequest,
  DramaGraphEdgeDeleteRequest,
  DramaGraphEdgeUpdateRequest,
  DramaGraphHistoryRequest,
  DramaGraphHistoryResult,
  DramaGraphLoadOptions,
  DramaGraphLoadResult,
  DramaGraphMutationResult,
  DramaGraphNodeCreateRequest,
  DramaGraphNodeDeleteRequest,
  DramaGraphNodePositionUpdateRequest,
  DramaGraphNodeUpdateRequest,
  DramaGraphRestoreBackupRequest,
  DramaGraphTaskBindingDeleteRequest,
  DramaGraphTaskBindingUpsertRequest,
  DramaProjectFileRecordRequest,
  DramaProjectFileRecordResult,
} from '@drama/graph/ipc-contract'

export interface DramaGraphIpcLogger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
}

export interface DramaGraphIpcDeps {
  ipcMain: Pick<IpcMain, 'handle'>
  resolveWorkspaceRoot: (event: IpcMainInvokeEvent) => string
  resolveStoryletGraphPath?: (options?: StoryletBridgeLoadOptions) => string
  logger?: DramaGraphIpcLogger
}

function defaultStoryletGraphPath(options?: StoryletBridgeLoadOptions): string {
  return options?.path
    ?? process.env.STORYLET_GRAPH_PATH
    ?? join(homedir(), 'Downloads', 'Storylet-Codex', '.data', 'storylet-current.graph.json')
}

function storyletBackupPath(graphPath: string, updatedAt: number): string {
  const stamp = new Date(updatedAt).toISOString().replace(/[:.]/g, '-')
  return `${graphPath}.${stamp}.bak`
}

function mutationResult(
  graph: DramaGraphMutationResult['graph'],
  result: { path: string; backupPath?: string },
): DramaGraphMutationResult {
  return {
    graph,
    path: result.path,
    backupPath: result.backupPath,
  }
}

export function registerDramaGraphIpc(deps: DramaGraphIpcDeps): void {
  const resolveStoryletGraphPath = deps.resolveStoryletGraphPath ?? defaultStoryletGraphPath
  const logger = deps.logger

  deps.ipcMain.handle('drama:graph:load', async (event, options?: DramaGraphLoadOptions): Promise<DramaGraphLoadResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const storyletPath = options?.storyletPath ?? resolveStoryletGraphPath(options ? { path: options.storyletPath } : undefined)
    const requestedGraphId = options?.graphId?.trim()
    const shouldImport = options?.importStoryletIfMissing ?? true
    const defaultGraphId = 'default'

    if (requestedGraphId) {
      try {
        return { graph: await store.loadGraph(requestedGraphId), path: store.graphPath(requestedGraphId), imported: false }
      } catch (error) {
        if (!shouldImport) throw error
      }
    }

    let snapshot: ReturnType<typeof buildStoryletBridgeSnapshot> | null = null
    if (shouldImport) {
      try {
        const raw = await readFile(storyletPath, 'utf8')
        snapshot = buildStoryletBridgeSnapshot(JSON.parse(raw), { sourcePath: storyletPath })
      } catch (error) {
        const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined
        if (code !== 'ENOENT') {
          logger?.warn('[drama:graph:load] Failed to read Storylet source:', error)
        } else {
          logger?.info('[drama:graph:load] Storylet source missing, initializing native graph')
        }
      }
    }

    const graphId = requestedGraphId ?? snapshot?.storyState.graphId ?? defaultGraphId

    try {
      return {
        graph: await store.loadGraph(graphId),
        path: store.graphPath(graphId),
        sourcePath: snapshot ? storyletPath : undefined,
        imported: false,
      }
    } catch {
      if (snapshot) {
        const graphFromStorylet = dramaGraphFromStoryletState(snapshot.storyState, {
          sourcePath: storyletPath,
        })
        const graph = {
          ...graphFromStorylet,
          id: graphId,
          source: { ...graphFromStorylet.source, graphId },
          bible: {
            ...graphFromStorylet.bible,
            id: `${graphId}-bible`,
          },
        }
        const result = await store.saveGraph(graph, {
          type: 'graph.imported',
          actor: 'drama:graph:load',
          details: {
            source: 'storylet',
            sourcePath: storyletPath,
          },
        })
        return {
          graph,
          path: result.path,
          backupPath: result.backupPath,
          sourcePath: storyletPath,
          imported: true,
        }
      }

      const fallbackGraph = createEmptyDramaGraph({
        id: graphId,
        title: 'Drama Graph',
        source: { path: storyletPath, graphId },
      })
      const result = await store.saveGraph(fallbackGraph, {
        type: 'graph.created',
        actor: 'drama:graph:load',
        details: {
          source: 'native',
          requestedGraphId,
        },
      })
      return {
        graph: fallbackGraph,
        path: result.path,
        backupPath: result.backupPath,
        sourcePath: storyletPath,
        imported: false,
      }
    }
  })

  deps.ipcMain.handle('drama:graph:history', async (
    event,
    request: DramaGraphHistoryRequest,
  ): Promise<DramaGraphHistoryResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    return store.listHistory(request.graphId, {
      maxBackups: request.maxBackups,
      maxEvents: request.maxEvents,
    })
  })

  deps.ipcMain.handle('drama:projectFile:record', async (
    event,
    request: DramaProjectFileRecordRequest,
  ): Promise<DramaProjectFileRecordResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    return recordDramaProjectFile({
      workspaceRoot,
      request,
    })
  })

  deps.ipcMain.handle('drama:graph:restoreBackup', async (
    event,
    request: DramaGraphRestoreBackupRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.restoreBackup(request.graphId, request.backupPath, {
      type: 'graph.restored',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:updateNodePositions', async (
    event,
    request: DramaGraphNodePositionUpdateRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.updateNodePositions(request.graphId, request.updates, {
      type: 'graph.nodes.position.updated',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:updateNode', async (
    event,
    request: DramaGraphNodeUpdateRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.updateNode(request.graphId, request.update, {
      type: 'graph.node.updated',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:createNode', async (
    event,
    request: DramaGraphNodeCreateRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.createNode(request.graphId, request.input, {
      type: 'graph.node.created',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:deleteNode', async (
    event,
    request: DramaGraphNodeDeleteRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.deleteNode(request.graphId, request.input, {
      type: 'graph.node.deleted',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:upsertDraft', async (
    event,
    request: DramaGraphDraftUpsertRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.upsertDraft(request.graphId, request.input, {
      type: 'graph.draft.upserted',
      actor: 'drama:plm',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:upsertTaskBinding', async (
    event,
    request: DramaGraphTaskBindingUpsertRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.upsertTaskBinding(
      request.graphId,
      request.input,
      createSkillCrewTaskBindingUpsertEvent(request.input),
    )
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:deleteTaskBinding', async (
    event,
    request: DramaGraphTaskBindingDeleteRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.deleteTaskBinding(
      request.graphId,
      request.input,
      createSkillCrewTaskBindingDeleteEvent(request.input),
    )
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:updateEdge', async (
    event,
    request: DramaGraphEdgeUpdateRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.updateEdge(request.graphId, request.update, {
      type: 'graph.edge.updated',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:createEdge', async (
    event,
    request: DramaGraphEdgeCreateRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.createEdge(request.graphId, request.input, {
      type: 'graph.edge.created',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('drama:graph:deleteEdge', async (
    event,
    request: DramaGraphEdgeDeleteRequest,
  ): Promise<DramaGraphMutationResult> => {
    const workspaceRoot = deps.resolveWorkspaceRoot(event)
    const store = new DramaGraphStore({ workspaceRoot })
    const { graph, result } = await store.deleteEdge(request.graphId, request.edgeId, {
      type: 'graph.edge.deleted',
      actor: 'drama:graph',
    })
    return mutationResult(graph, result)
  })

  deps.ipcMain.handle('storylet:bridge:snapshot', async (_event, options?: StoryletBridgeLoadOptions) => {
    const graphPath = resolveStoryletGraphPath(options)
    const raw = await readFile(graphPath, 'utf8')
    return buildStoryletBridgeSnapshot(JSON.parse(raw), {
      sourcePath: graphPath,
      novelIdPrefix: options?.novelIdPrefix,
    })
  })

  deps.ipcMain.handle('storylet:bridge:writeChapter', async (
    _event,
    request: StoryletChapterWritebackRequest,
  ): Promise<StoryletChapterWritebackFileResult> => {
    const graphPath = resolveStoryletGraphPath(request)
    const raw = await readFile(graphPath, 'utf8')
    const graph = JSON.parse(raw)
    const updatedAt = typeof request.now === 'function' ? request.now() : request.now ?? Date.now()
    const backupPath = storyletBackupPath(graphPath, updatedAt)
    await mkdir(dirname(backupPath), { recursive: true })
    await writeFile(backupPath, raw, 'utf8')

    const result = applyPlotPilotChapterToStoryletGraph(graph, request.chapter, {
      now: updatedAt,
      scriptStatus: request.scriptStatus,
    })
    await writeFile(graphPath, `${JSON.stringify(result.graph, null, 2)}\n`, 'utf8')

    return {
      path: graphPath,
      backupPath,
      summary: result.summary,
    }
  })
}
