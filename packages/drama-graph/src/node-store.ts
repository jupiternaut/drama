import { copyFile, mkdir, readdir, readFile, rename, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve, sep } from 'path'
import {
  compactDramaGraphEvent,
  createDramaGraphEvent,
  type DramaGraph,
  type DramaDraftUpsertInput,
  type DramaEdgeCreateInput,
  type DramaEdgeUpdate,
  type DramaGraphEvent,
  type DramaGraphEventInput,
  type DramaGraphHistoryBackup,
  type DramaGraphHistoryEvent,
  type DramaGraphHistorySnapshot,
  type DramaGraphRepository,
  type DramaGraphSaveResult,
  type DramaNodeCreateInput,
  type DramaNodeDeleteInput,
  type DramaNodePositionUpdate,
  type DramaNodeUpdate,
  type DramaTaskBindingDeleteInput,
  type DramaTaskBindingUpsertInput,
} from '@drama/core'

import {
  createDramaGraphEdge,
  createDramaGraphNode,
  deleteDramaGraphNode,
  deleteDramaGraphEdge,
  isDramaGraph,
  upsertDramaGraphDraft,
  upsertDramaGraphTaskBinding,
  deleteDramaGraphTaskBinding,
  updateDramaGraphEdge,
  updateDramaGraphNode,
  updateDramaGraphNodePositions,
} from './index.ts'
import { recordDramaProjectFile } from './project-files.ts'

export {
  DRAMA_PROJECTS_DIR_NAME,
  recordDramaProjectFile,
  safeDramaProjectFileStem,
  type RecordDramaProjectFileOptions,
} from './project-files.ts'

export interface DramaGraphStoreOptions {
  workspaceRoot: string
  now?: () => number
}

export type DramaGraphSaveEvent = DramaGraphEventInput

export class DramaGraphStore implements DramaGraphRepository {
  private readonly workspaceRoot: string
  private readonly now: () => number

  constructor(options: DramaGraphStoreOptions) {
    this.workspaceRoot = options.workspaceRoot
    this.now = options.now ?? Date.now
  }

  get graphsDir(): string {
    return join(this.workspaceRoot, '.drama', 'graphs')
  }

  get backupsDir(): string {
    return join(this.graphsDir, '.backups')
  }

  get eventLogPath(): string {
    return join(this.graphsDir, 'graph-events.jsonl')
  }

  graphPath(graphId: string): string {
    return join(this.graphsDir, `${safeGraphFileStem(graphId)}.json`)
  }

  async loadGraph(graphId: string): Promise<DramaGraph> {
    const graphPath = this.graphPath(graphId)
    try {
      return parseGraph(await readFile(graphPath, 'utf8'), graphPath)
    } catch (error) {
      const recovered = await this.loadLatestBackup(graphId)
      if (recovered) {
        await this.appendEvent(recovered.id, {
          type: 'graph.recovered',
          details: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
        return recovered
      }
      throw error
    }
  }

  async saveGraph(graph: DramaGraph, event: DramaGraphSaveEvent): Promise<DramaGraphSaveResult> {
    await mkdir(this.graphsDir, { recursive: true })
    const graphPath = this.graphPath(graph.id)
    let backupPath: string | undefined
    if (existsSync(graphPath)) {
      await mkdir(this.backupsDir, { recursive: true })
      backupPath = join(this.backupsDir, `${safeGraphFileStem(graph.id)}.${this.now()}.json`)
      await copyFile(graphPath, backupPath)
    }

    const tempPath = `${graphPath}.tmp-${process.pid}-${this.now()}`
    try {
      await writeFile(tempPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8')
      await rename(tempPath, graphPath)
      await this.appendEvent(graph.id, event)
      await recordDramaProjectFile({
        workspaceRoot: this.workspaceRoot,
        now: this.now,
        request: {
          projectId: graph.id,
          source: 'graph',
          type: event.type,
          title: graph.title,
          summary: {
            backupPath,
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            sceneCount: graph.scenes.length,
            chapterCount: graph.chapters.length,
            draftCount: graph.drafts.length,
            taskBindingCount: graph.taskBindings.length,
          },
          payload: {
            graph,
            event,
          },
        },
      })
      return { path: graphPath, backupPath }
    } catch (error) {
      if (backupPath && existsSync(backupPath)) {
        await copyFile(backupPath, graphPath)
      }
      throw error
    }
  }

  async recordEvent(graphId: string, event: DramaGraphSaveEvent): Promise<void> {
    const graph = await this.loadGraph(graphId)
    const normalizedEvent = compactDramaGraphEvent({
      ...event,
      target: {
        graphId,
        ...event.target,
      },
    })
    await this.appendEvent(graph.id, normalizedEvent)
    await recordDramaProjectFile({
      workspaceRoot: this.workspaceRoot,
      now: this.now,
      request: {
        projectId: graph.id,
        source: normalizedEvent.source ?? eventSourceFromType(normalizedEvent.type),
        type: normalizedEvent.type,
        title: graph.title,
        summary: {
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          sceneCount: graph.scenes.length,
          chapterCount: graph.chapters.length,
          draftCount: graph.drafts.length,
          taskBindingCount: graph.taskBindings.length,
          eventSummary: normalizedEvent.summary,
          eventStatus: normalizedEvent.status,
          eventSeverity: normalizedEvent.severity,
          eventTarget: normalizedEvent.target,
        },
        payload: {
          event: normalizedEvent,
        },
      },
    })
  }

  async updateNodePositions(
    graphId: string,
    updates: DramaNodePositionUpdate[],
    event: DramaGraphSaveEvent = { type: 'graph.nodes.position.updated' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = updateDramaGraphNodePositions(graph, updates, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        nodeIds: updates.map((update) => update.nodeId),
      },
    })
    return { graph: updatedGraph, result }
  }

  async updateNode(
    graphId: string,
    update: DramaNodeUpdate,
    event: DramaGraphSaveEvent = { type: 'graph.node.updated' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = updateDramaGraphNode(graph, update, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        nodeId: update.nodeId,
        fields: update.fields?.map((field) => field.id),
      },
    })
    return { graph: updatedGraph, result }
  }

  async createNode(
    graphId: string,
    input: DramaNodeCreateInput,
    event: DramaGraphSaveEvent = { type: 'graph.node.created' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult; nodeId: string }> {
    const graph = await this.loadGraph(graphId)
    const previousNodeIds = new Set(graph.nodes.map((node) => node.id))
    const updatedGraph = createDramaGraphNode(graph, input, { now: this.now() })
    const createdNode = updatedGraph.nodes.find((node) => !previousNodeIds.has(node.id))
    const nodeId = input.nodeId || createdNode?.id
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        nodeId,
        kind: input.kind,
      },
    })
    return { graph: updatedGraph, result, nodeId: nodeId ?? '' }
  }

  async updateEdge(
    graphId: string,
    update: DramaEdgeUpdate,
    event: DramaGraphSaveEvent = { type: 'graph.edge.updated' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = updateDramaGraphEdge(graph, update, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        edgeId: update.edgeId,
      },
    })
    return { graph: updatedGraph, result }
  }

  async deleteNode(
    graphId: string,
    input: DramaNodeDeleteInput,
    event: DramaGraphSaveEvent = { type: 'graph.node.deleted' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = deleteDramaGraphNode(graph, input, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        nodeId: input.nodeId,
      },
    })
    return { graph: updatedGraph, result }
  }

  async upsertDraft(
    graphId: string,
    input: DramaDraftUpsertInput,
    event: DramaGraphSaveEvent = { type: 'graph.draft.upserted' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = upsertDramaGraphDraft(graph, input, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        draftId: input.draftId,
        targetType: input.targetType,
        targetId: input.targetId,
        source: input.source,
        status: input.status,
        nodeId: input.nodeId,
        chapterId: input.chapterId,
        sceneId: input.sceneId,
      },
    })
    return { graph: updatedGraph, result }
  }

  async upsertTaskBinding(
    graphId: string,
    input: DramaTaskBindingUpsertInput,
    event: DramaGraphSaveEvent = { type: 'graph.taskBinding.upserted' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = upsertDramaGraphTaskBinding(graph, input, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        bindingId: input.bindingId,
        nodeId: input.nodeId,
        edgeId: input.edgeId,
        taskId: input.taskId,
        status: input.status,
        agentId: input.agentId,
        crewId: input.crewId,
      },
    })
    return { graph: updatedGraph, result }
  }

  async deleteTaskBinding(
    graphId: string,
    input: DramaTaskBindingDeleteInput,
    event: DramaGraphSaveEvent = { type: 'graph.taskBinding.deleted' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = deleteDramaGraphTaskBinding(graph, input, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        bindingId: input.bindingId,
      },
    })
    return { graph: updatedGraph, result }
  }

  async createEdge(
    graphId: string,
    input: DramaEdgeCreateInput,
    event: DramaGraphSaveEvent = { type: 'graph.edge.created' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult; edgeId: string }> {
    const graph = await this.loadGraph(graphId)
    const previousEdgeIds = new Set(graph.edges.map((edge) => edge.id))
    const updatedGraph = createDramaGraphEdge(graph, input, { now: this.now() })
    const createdEdge = updatedGraph.edges.find((edge) => !previousEdgeIds.has(edge.id))
    const edgeId = input.edgeId || createdEdge?.id
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        edgeId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        type: input.type,
      },
    })
    return { graph: updatedGraph, result, edgeId: edgeId ?? '' }
  }

  async deleteEdge(
    graphId: string,
    edgeId: string,
    event: DramaGraphSaveEvent = { type: 'graph.edge.deleted' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const graph = await this.loadGraph(graphId)
    const updatedGraph = deleteDramaGraphEdge(graph, edgeId, { now: this.now() })
    const result = await this.saveGraph(updatedGraph, {
      ...event,
      details: {
        ...event.details,
        edgeId,
      },
    })
    return { graph: updatedGraph, result }
  }

  async listHistory(
    graphId: string,
    options: { maxBackups?: number; maxEvents?: number } = {},
  ): Promise<DramaGraphHistorySnapshot> {
    return {
      graphId,
      backups: await this.listBackups(graphId, options.maxBackups ?? 20),
      events: await this.listEvents(graphId, options.maxEvents ?? 40),
      eventLogPath: this.eventLogPath,
    }
  }

  async restoreBackup(
    graphId: string,
    backupPath: string,
    event: DramaGraphSaveEvent = { type: 'graph.restored' },
  ): Promise<{ graph: DramaGraph; result: DramaGraphSaveResult }> {
    const resolvedBackupPath = resolve(backupPath)
    const resolvedBackupsDir = resolve(this.backupsDir)
    if (resolvedBackupPath !== resolvedBackupsDir && !resolvedBackupPath.startsWith(`${resolvedBackupsDir}${sep}`)) {
      throw new Error('Backup path is outside the Drama graph backups directory')
    }

    const backupGraph = parseGraph(await readFile(resolvedBackupPath, 'utf8'), resolvedBackupPath)
    if (backupGraph.id !== graphId) {
      throw new Error(`Backup graph id mismatch: expected ${graphId}, got ${backupGraph.id}`)
    }

    const restoredGraph: DramaGraph = {
      ...backupGraph,
      updatedAt: this.now(),
      metadata: {
        ...backupGraph.metadata,
        restoredFromBackupPath: resolvedBackupPath,
        restoredAt: this.now(),
      },
    }
    const result = await this.saveGraph(restoredGraph, {
      ...event,
      details: {
        ...event.details,
        backupPath: resolvedBackupPath,
      },
    })
    return { graph: restoredGraph, result }
  }

  private async loadLatestBackup(graphId: string): Promise<DramaGraph | null> {
    if (!existsSync(this.backupsDir)) return null
    const stem = safeGraphFileStem(graphId)
    const entries = (await readdir(this.backupsDir))
      .filter((entry) => entry.startsWith(`${stem}.`) && entry.endsWith('.json'))
      .sort()
      .reverse()

    for (const entry of entries) {
      const backupPath = join(this.backupsDir, entry)
      try {
        return parseGraph(await readFile(backupPath, 'utf8'), backupPath)
      } catch {
        // Try older backups.
      }
    }
    return null
  }

  private async listBackups(graphId: string, maxBackups: number): Promise<DramaGraphHistoryBackup[]> {
    if (!existsSync(this.backupsDir)) return []
    const stem = safeGraphFileStem(graphId)
    const entries = (await readdir(this.backupsDir))
      .filter((entry) => entry.startsWith(`${stem}.`) && entry.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, maxBackups)

    const backups: DramaGraphHistoryBackup[] = []
    for (const entry of entries) {
      const backupPath = join(this.backupsDir, entry)
      const createdAt = backupTimestampFromEntry(stem, entry)
      try {
        const graph = parseGraph(await readFile(backupPath, 'utf8'), backupPath)
        backups.push({
          path: backupPath,
          createdAt,
          graphName: graph.title,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          valid: true,
        })
      } catch (error) {
        backups.push({
          path: backupPath,
          createdAt,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return backups
  }

  private async listEvents(graphId: string, maxEvents: number): Promise<DramaGraphHistoryEvent[]> {
    if (!existsSync(this.eventLogPath)) return []
    const lines = (await readFile(this.eventLogPath, 'utf8'))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const events: DramaGraphHistoryEvent[] = []
    for (const line of lines.reverse()) {
      if (events.length >= maxEvents) break
      try {
        const record = JSON.parse(line) as Partial<DramaGraphHistoryEvent>
        if (record.graphId !== graphId || !record.id || !record.type || typeof record.createdAt !== 'number') continue
        events.push({
          id: record.id,
          graphId,
          type: record.type,
          actor: record.actor,
          source: typeof record.source === 'string' ? record.source : undefined,
          target: isRecord(record.target) ? record.target : undefined,
          severity: typeof record.severity === 'string' ? record.severity : undefined,
          status: typeof record.status === 'string' ? record.status : undefined,
          summary: typeof record.summary === 'string' ? record.summary : undefined,
          details: isRecord(record.details) ? record.details : undefined,
          createdAt: record.createdAt,
        })
      } catch {
        // Ignore corrupt log lines; history should stay readable.
      }
    }
    return events
  }

  private async appendEvent(graphId: string, event: DramaGraphSaveEvent): Promise<void> {
    await mkdir(this.graphsDir, { recursive: true })
    const record: DramaGraphEvent = createDramaGraphEvent(
      graphId,
      compactDramaGraphEvent(event),
      { now: this.now() },
    )
    const existing = existsSync(this.eventLogPath) ? await readFile(this.eventLogPath, 'utf8') : ''
    await writeFile(this.eventLogPath, `${existing}${JSON.stringify(record)}\n`, 'utf8')
  }
}

function parseGraph(raw: string, path: string): DramaGraph {
  const parsed = JSON.parse(raw)
  if (!isDramaGraph(parsed)) {
    throw new Error(`Invalid DramaGraph file: ${path}`)
  }
  return parsed
}

function safeGraphFileStem(graphId: string): string {
  return graphId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'graph'
}

function eventSourceFromType(type: string): string {
  const prefix = type.split('.')[0]?.trim()
  if (prefix) return prefix
  return 'graph'
}

function backupTimestampFromEntry(stem: string, entry: string): number {
  const prefix = `${stem}.`
  const suffix = '.json'
  if (!entry.startsWith(prefix) || !entry.endsWith(suffix)) return 0
  const value = Number(entry.slice(prefix.length, -suffix.length))
  return Number.isFinite(value) ? value : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
