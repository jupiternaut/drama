import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { DramaGraph } from '@drama/core'

import { DramaGraphStore } from '../drama-graph-store'

const tempRoots: string[] = []

async function tempWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drama-graph-store-'))
  tempRoots.push(root)
  return root
}

function graph(id = 'graph-1', updatedAt = 1000): DramaGraph {
  return {
    schema: 'drama.graph.v1',
    id,
    title: 'Graph One',
    createdAt: 900,
    updatedAt,
    source: { format: 'native' },
    bible: {
      id: `${id}-bible`,
      title: 'Graph One Bible',
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

function graphWithNode(id = 'graph-1', updatedAt = 1000): DramaGraph {
  const base = graph(id, updatedAt)
  return {
    ...base,
    nodes: [
      {
        id: 'node-1',
        kind: 'scene',
        title: 'Scene One',
        fields: [
          {
            id: 'field-1',
            key: 'purpose',
            label: '目的',
            value: 'old',
            text: 'old',
          },
        ],
        position: { x: 10, y: 20 },
        size: { width: 300, height: 190 },
        sourceRefs: [],
        createdAt: 900,
        updatedAt,
      },
    ],
  }
}

function graphWithEdge(id = 'graph-1', updatedAt = 1000): DramaGraph {
  const base = graphWithNode(id, updatedAt)
  return {
    ...base,
    nodes: [
      ...base.nodes,
      {
        id: 'node-2',
        kind: 'scene',
        title: 'Scene Two',
        fields: [],
        position: { x: 400, y: 20 },
        size: { width: 300, height: 190 },
        sourceRefs: [],
        createdAt: 900,
        updatedAt,
      },
    ],
    edges: [
      {
        id: 'edge-1',
        sourceId: 'node-1',
        targetId: 'node-2',
        type: 'supports',
        label: 'supports',
        sourceRefs: [],
        createdAt: 900,
        updatedAt,
      },
    ],
    taskBindings: [
      {
        id: 'binding-1',
        edgeId: 'edge-1',
        taskId: 'task-1',
        status: 'pending',
        createdAt: 900,
        updatedAt,
      },
    ],
  }
}

function graphWithChapter(id = 'graph-1', updatedAt = 1000): DramaGraph {
  const base = graph(id, updatedAt)
  return {
    ...base,
    nodes: [
      {
        id: 'chapter-node-1',
        kind: 'chapter',
        title: '第一章',
        fields: [],
        position: { x: 10, y: 20 },
        size: { width: 300, height: 168 },
        sourceRefs: [],
        createdAt: 900,
        updatedAt,
      },
    ],
    chapters: [
      {
        id: 'chapter:chapter-node-1',
        nodeId: 'chapter-node-1',
        title: '第一章',
        number: 1,
        sceneIds: [],
        draftIds: [],
        status: 'empty',
      },
    ],
  }
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('DramaGraphStore', () => {
  it('writes graphs under .drama/graphs and appends an event', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 2000 })

    const result = await store.saveGraph(graph(), { type: 'graph.imported', actor: 'test' })

    expect(result.path).toBe(join(workspaceRoot, '.drama', 'graphs', 'graph-1.json'))
    expect(result.backupPath).toBeUndefined()
    expect(await store.loadGraph('graph-1')).toMatchObject({ id: 'graph-1', schema: 'drama.graph.v1' })

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.imported"')
    expect(eventLog).toContain('"graphId":"graph-1"')
  })

  it('creates a backup before overwriting an existing graph', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 3000 })
    await store.saveGraph(graph('graph-1', 1000), { type: 'graph.imported' })

    const result = await store.saveGraph(graph('graph-1', 4000), { type: 'graph.updated' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.3000.json'))
    const backup = JSON.parse(await readFile(result.backupPath!, 'utf8')) as DramaGraph
    expect(backup.updatedAt).toBe(1000)
    expect((await store.loadGraph('graph-1')).updatedAt).toBe(4000)
  })

  it('writes append-only root project files for graph saves', async () => {
    const workspaceRoot = await tempWorkspace()
    let now = 3500
    const store = new DramaGraphStore({ workspaceRoot, now: () => now++ })

    await store.saveGraph(graph('graph-1', 1000), { type: 'graph.imported', actor: 'test' })
    await store.saveGraph(graph('graph-1', 4000), { type: 'graph.updated', actor: 'test' })

    const projectGraphDir = join(workspaceRoot, 'drama-projects', 'graph-1', 'graph')
    const entries = (await readdir(projectGraphDir)).sort()
    expect(entries).toHaveLength(2)

    const firstRecord = JSON.parse(await readFile(join(projectGraphDir, entries[0]!), 'utf8')) as Record<string, unknown>
    const secondRecord = JSON.parse(await readFile(join(projectGraphDir, entries[1]!), 'utf8')) as Record<string, unknown>
    expect(firstRecord).toMatchObject({
      schema: 'drama.project_file_event.v1',
      projectId: 'graph-1',
      source: 'graph',
      type: 'graph.imported',
      title: 'Graph One',
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        chapterCount: 0,
      },
    })
    expect(secondRecord).toMatchObject({
      source: 'graph',
      type: 'graph.updated',
      payload: {
        event: { type: 'graph.updated', actor: 'test' },
      },
    })
  })

  it('recovers from the latest valid backup when the current graph is corrupt', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 3000 })
    await store.saveGraph(graph('graph-1', 1000), { type: 'graph.imported' })
    await store.saveGraph(graph('graph-1', 4000), { type: 'graph.updated' })
    await writeFile(join(workspaceRoot, '.drama', 'graphs', 'graph-1.json'), '{bad json', 'utf8')

    const recovered = await store.loadGraph('graph-1')

    expect(recovered.updatedAt).toBe(1000)
  })

  it('updates node positions through safe save, backup, and event logging', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 5000 })
    await store.saveGraph(graphWithNode('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result } = await store.updateNodePositions('graph-1', [
      { nodeId: 'node-1', position: { x: 120, y: 240 } },
    ], { type: 'graph.nodes.position.updated', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.5000.json'))
    expect(updated.nodes[0]?.position).toEqual({ x: 120, y: 240 })
    expect((await store.loadGraph('graph-1')).nodes[0]?.position).toEqual({ x: 120, y: 240 })

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.nodes.position.updated"')
    expect(eventLog).toContain('"nodeIds":["node-1"]')
  })

  it('updates node content through safe save, backup, and event logging', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 6000 })
    await store.saveGraph(graphWithNode('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result } = await store.updateNode('graph-1', {
      nodeId: 'node-1',
      title: 'Scene Two',
      description: 'Updated description',
      fields: [{ id: 'field-1', text: 'new' }],
    }, { type: 'graph.node.updated', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.6000.json'))
    expect(updated.nodes[0]?.title).toBe('Scene Two')
    expect(updated.nodes[0]?.description).toBe('Updated description')
    expect(updated.nodes[0]?.fields[0]?.text).toBe('new')
    expect((await store.loadGraph('graph-1')).nodes[0]?.title).toBe('Scene Two')

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.node.updated"')
    expect(eventLog).toContain('"nodeId":"node-1"')
  })

  it('creates nodes through safe save, backup, and event logging', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 6500 })
    await store.saveGraph(graphWithNode('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result, nodeId } = await store.createNode('graph-1', {
      kind: 'location',
      title: '新地点',
      position: { x: 300, y: 420 },
    }, { type: 'graph.node.created', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.6500.json'))
    expect(nodeId).toBe('node-location-2')
    expect(updated.nodes.find((node) => node.id === nodeId)).toMatchObject({
      kind: 'location',
      title: '新地点',
      position: { x: 300, y: 420 },
    })
    expect((await store.loadGraph('graph-1')).nodes).toHaveLength(2)

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.node.created"')
    expect(eventLog).toContain('"nodeId":"node-location-2"')
  })

  it('deletes nodes through safe save and removes incident edges', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 6750 })
    await store.saveGraph(graphWithEdge('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result } = await store.deleteNode('graph-1', {
      nodeId: 'node-2',
    }, { type: 'graph.node.deleted', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.6750.json'))
    expect(updated.nodes.map((node) => node.id)).toEqual(['node-1'])
    expect(updated.edges).toEqual([])
    expect((await store.loadGraph('graph-1')).nodes).toHaveLength(1)

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.node.deleted"')
    expect(eventLog).toContain('"nodeId":"node-2"')
  })

  it('updates edge content through safe save, backup, and event logging', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 7000 })
    await store.saveGraph(graphWithEdge('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result } = await store.updateEdge('graph-1', {
      edgeId: 'edge-1',
      label: 'blocks',
      type: 'blocks',
    }, { type: 'graph.edge.updated', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.7000.json'))
    expect(updated.edges[0]).toMatchObject({ label: 'blocks', type: 'blocks' })
    expect((await store.loadGraph('graph-1')).edges[0]).toMatchObject({ label: 'blocks', type: 'blocks' })

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.edge.updated"')
    expect(eventLog).toContain('"edgeId":"edge-1"')
  })

  it('creates edges through safe save, backup, and event logging', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 7500 })
    const initial = graphWithEdge('graph-1', 1000)
    await store.saveGraph({ ...initial, edges: [] }, { type: 'graph.imported' })

    const { graph: updated, result, edgeId } = await store.createEdge('graph-1', {
      sourceId: 'node-1',
      targetId: 'node-2',
      label: 'reveals',
      type: 'reveals',
    }, { type: 'graph.edge.created', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.7500.json'))
    expect(edgeId).toBe('edge-node-1-node-2')
    expect(updated.edges[0]).toMatchObject({
      id: 'edge-node-1-node-2',
      sourceId: 'node-1',
      targetId: 'node-2',
      label: 'reveals',
      type: 'reveals',
    })
    expect((await store.loadGraph('graph-1')).edges).toHaveLength(1)

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.edge.created"')
    expect(eventLog).toContain('"edgeId":"edge-node-1-node-2"')
  })

  it('deletes edges through safe save and removes edge task bindings', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 8000 })
    await store.saveGraph(graphWithEdge('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result } = await store.deleteEdge('graph-1', 'edge-1', {
      type: 'graph.edge.deleted',
      actor: 'test',
    })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.8000.json'))
    expect(updated.edges).toEqual([])
    expect(updated.taskBindings).toEqual([])
    expect((await store.loadGraph('graph-1')).edges).toEqual([])

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.edge.deleted"')
    expect(eventLog).toContain('"edgeId":"edge-1"')
  })

  it('upserts chapter drafts through safe save, backup, and event logging', async () => {
    const workspaceRoot = await tempWorkspace()
    const store = new DramaGraphStore({ workspaceRoot, now: () => 8500 })
    await store.saveGraph(graphWithChapter('graph-1', 1000), { type: 'graph.imported' })

    const { graph: updated, result } = await store.upsertDraft('graph-1', {
      targetType: 'chapter',
      targetId: 'chapter:chapter-node-1',
      chapterId: 'chapter:chapter-node-1',
      nodeId: 'chapter-node-1',
      content: '正文写回 DramaGraph。',
      status: 'draft',
      source: 'plotpilot',
      fields: [
        { key: 'novelDraft', label: 'PLM 小说正文', text: '正文写回 DramaGraph。' },
      ],
    }, { type: 'graph.draft.upserted', actor: 'test' })

    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.8500.json'))
    expect(updated.drafts[0]).toMatchObject({
      targetType: 'chapter',
      targetId: 'chapter:chapter-node-1',
      source: 'plotpilot',
      content: '正文写回 DramaGraph。',
    })
    expect(updated.chapters[0]).toMatchObject({
      status: 'draft',
      draftIds: ['chapter:chapter-chapter-node-1:plotpilot'],
    })
    expect(updated.nodes[0]?.fields[0]).toMatchObject({
      key: 'novelDraft',
      text: '正文写回 DramaGraph。',
    })

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.draft.upserted"')
    expect(eventLog).toContain('"targetId":"chapter:chapter-node-1"')
  })

  it('lists recent backups and graph events for version history', async () => {
    const workspaceRoot = await tempWorkspace()
    let now = 9000
    const store = new DramaGraphStore({ workspaceRoot, now: () => now })
    await store.saveGraph(graphWithNode('graph-1', 1000), { type: 'graph.imported', actor: 'test' })
    now = 9100
    await store.updateNodePositions('graph-1', [
      { nodeId: 'node-1', position: { x: 22, y: 33 } },
    ], { type: 'graph.nodes.position.updated', actor: 'test' })
    now = 9200
    await store.updateNode('graph-1', {
      nodeId: 'node-1',
      title: 'Versioned Scene',
    }, { type: 'graph.node.updated', actor: 'test' })

    const history = await store.listHistory('graph-1', { maxBackups: 2, maxEvents: 2 })

    expect(history.graphId).toBe('graph-1')
    expect(history.eventLogPath).toBe(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'))
    expect(history.backups).toHaveLength(2)
    expect(history.backups[0]).toMatchObject({
      createdAt: 9200,
      graphName: 'Graph One',
      nodeCount: 1,
      edgeCount: 0,
      valid: true,
    })
    expect(history.events.map((event) => event.type)).toEqual([
      'graph.node.updated',
      'graph.nodes.position.updated',
    ])
  })

  it('restores a backup through safe save and records a restore event', async () => {
    const workspaceRoot = await tempWorkspace()
    let now = 10000
    const store = new DramaGraphStore({ workspaceRoot, now: () => now })
    await store.saveGraph(graphWithNode('graph-1', 1000), { type: 'graph.imported', actor: 'test' })
    now = 10100
    const { result: updateResult } = await store.updateNode('graph-1', {
      nodeId: 'node-1',
      title: 'Current Scene',
    }, { type: 'graph.node.updated', actor: 'test' })
    now = 10200

    const { graph: restored, result } = await store.restoreBackup('graph-1', updateResult.backupPath!, {
      type: 'graph.restored',
      actor: 'test',
    })

    expect(restored.nodes[0]?.title).toBe('Scene One')
    expect(restored.updatedAt).toBe(10200)
    expect(restored.metadata.restoredFromBackupPath).toBe(updateResult.backupPath)
    expect(result.backupPath).toBe(join(workspaceRoot, '.drama', 'graphs', '.backups', 'graph-1.10200.json'))
    expect((await store.loadGraph('graph-1')).nodes[0]?.title).toBe('Scene One')

    const eventLog = await readFile(join(workspaceRoot, '.drama', 'graphs', 'graph-events.jsonl'), 'utf8')
    expect(eventLog).toContain('"type":"graph.restored"')
    expect(eventLog).toContain('"backupPath"')
  })
})
