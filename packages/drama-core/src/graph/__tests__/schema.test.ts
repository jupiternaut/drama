import { describe, expect, it } from 'bun:test'

import {
  createDramaGraphEvent,
  createEmptyDramaGraph,
  isDramaGraph,
  summarizeDramaGraph,
  type DramaGraphRepository,
} from '../index.ts'

describe('Drama core graph schema', () => {
  it('creates a canonical empty graph with stable schema and source metadata', () => {
    const graph = createEmptyDramaGraph({
      id: 'novel-1',
      title: 'Novel One',
      now: 1700000000000,
      source: { path: 'storylet.json' },
    })

    expect(graph).toMatchObject({
      schema: 'drama.graph.v1',
      id: 'novel-1',
      title: 'Novel One',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      source: {
        format: 'native',
        path: 'storylet.json',
        graphId: 'novel-1',
      },
      bible: {
        id: 'novel-1-bible',
        title: 'Novel One Bible',
      },
    })
    expect(summarizeDramaGraph(graph)).toEqual({
      nodeCount: 0,
      edgeCount: 0,
      sceneCount: 0,
      chapterCount: 0,
      draftCount: 0,
      taskBindingCount: 0,
    })
    expect(isDramaGraph(graph)).toBe(true)
  })

  it('rejects partial graph-shaped objects at the package boundary', () => {
    expect(isDramaGraph({ schema: 'drama.graph.v1', id: 'broken', title: 'Broken' })).toBe(false)
  })

  it('creates graph events without leaking storage implementation details', () => {
    const event = createDramaGraphEvent('graph-1', {
      type: 'graph.node.updated',
      actor: 'test',
      details: { nodeId: 'node-1' },
    }, {
      now: 1700000001000,
      random: () => 0.5,
    })

    expect(event).toEqual({
      schema: 'drama.graph_event.v1',
      id: 'graph-1:1700000001000:i',
      graphId: 'graph-1',
      type: 'graph.node.updated',
      actor: 'test',
      details: { nodeId: 'node-1' },
      createdAt: 1700000001000,
    })
  })

  it('defines the repository contract used by host runtimes', async () => {
    const graph = createEmptyDramaGraph({ id: 'graph-1', now: 1 })
    const repository: DramaGraphRepository = {
      async loadGraph() {
        return graph
      },
      async saveGraph() {
        return { path: '/tmp/graph-1.json' }
      },
      async recordEvent() {
        return undefined
      },
      async listHistory() {
        return {
          graphId: 'graph-1',
          backups: [],
          events: [],
          eventLogPath: '/tmp/graph-events.jsonl',
        }
      },
      async restoreBackup() {
        return {
          graph,
          result: { path: '/tmp/graph-1.json', backupPath: '/tmp/backup.json' },
        }
      },
    }

    await expect(repository.loadGraph('graph-1')).resolves.toBe(graph)
    await expect(repository.saveGraph(graph, { type: 'graph.saved' })).resolves.toEqual({ path: '/tmp/graph-1.json' })
  })
})
