import { describe, expect, it } from 'bun:test'

import {
  createDramaGraphEdge,
  createDramaGraphNode,
  deleteDramaGraphNode,
  deleteDramaGraphEdge,
  detectDramaGraphDiagnostics,
  deleteDramaGraphTaskBinding,
  upsertDramaGraphTaskBinding,
  dramaGraphFromStoryletState,
  dramaGraphToStoryletExport,
  summarizeDramaGraph,
  updateDramaGraphEdge,
  updateDramaGraphNode,
  updateDramaGraphNodePositions,
  upsertDramaGraphDraft,
  type DramaGraph,
} from '../index.ts'
import type { StoryletStoryState } from '../storylet-types.ts'

const storyletState: StoryletStoryState = {
  schema: 'drama.storylet_state.v1',
  source: 'storylet',
  graphId: 'storylet-1',
  graphName: '输入框里的梦',
  cards: [
    {
      id: 'world-1',
      title: 'Token 社会',
      kind: 'world',
      description: '所有人用 token 续命。',
      fields: [
        { id: 'world-overview', key: 'worldOverview', name: '世界观', value: 'token 是粮票。', text: 'token 是粮票。' },
      ],
      position: { x: 20, y: 40 },
    },
    {
      id: 'scene-1',
      title: '别在输入框里说真话',
      kind: 'scene',
      fields: [
        { id: 'scene-purpose', key: 'scenePurpose', name: '场景目的', value: '主角第一次发现输入框会记住梦。', text: '主角第一次发现输入框会记住梦。' },
      ],
      position: { x: 420, y: 260 },
    },
  ],
  edges: [
    { id: 'edge-1', source: 'world-1', target: 'scene-1', label: 'causes', type: 'causal' },
  ],
  summary: {
    cardCount: 2,
    edgeCount: 1,
    worldCount: 1,
    characterCount: 0,
    locationCount: 0,
    chapterCount: 0,
    sceneCount: 1,
  },
}

describe('DramaGraph schema', () => {
  it('imports Storylet state into Drama native graph while preserving source ids', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })

    expect(graph.schema).toBe('drama.graph.v1')
    expect(graph.source.format).toBe('storylet')
    expect(graph.id).toBe('storylet-1')
    expect(graph.nodes.map((node) => node.id)).toEqual(['world-1', 'scene-1'])
    expect(graph.nodes[0]?.sourceRefs[0]).toEqual({ format: 'storylet', id: 'world-1', kind: 'card' })
    expect(graph.edges[0]?.sourceId).toBe('world-1')
    expect(graph.scenes[0]?.nodeId).toBe('scene-1')
    expect(graph.bible.worldNodeIds).toEqual(['world-1'])
  })

  it('exports DramaGraph back to a Storylet-compatible JSON shape', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const storyletExport = dramaGraphToStoryletExport(graph)

    expect(storyletExport.id).toBe('storylet-1')
    expect(storyletExport.name).toBe('输入框里的梦')
    expect(storyletExport.cards).toHaveLength(2)
    expect(storyletExport.connections).toEqual([
      {
        id: 'edge-1',
        sourceCardId: 'world-1',
        targetCardId: 'scene-1',
        relationshipLabel: 'causes',
        relationshipType: 'causal',
      },
    ])
  })

  it('summarizes native node and edge counts from the canonical graph', () => {
    const graph: DramaGraph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })

    expect(summarizeDramaGraph(graph)).toEqual({
      nodeCount: 2,
      edgeCount: 1,
      sceneCount: 1,
      chapterCount: 0,
      draftCount: 0,
      taskBindingCount: 0,
    })
  })

  it('updates node positions immutably and bumps graph timestamps', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const updated = updateDramaGraphNodePositions(graph, [
      { nodeId: 'scene-1', position: { x: 520, y: 360 } },
    ], { now: 1710000001000 })

    expect(updated).not.toBe(graph)
    expect(updated.updatedAt).toBe(1710000001000)
    expect(updated.nodes.find((node) => node.id === 'scene-1')?.position).toEqual({ x: 520, y: 360 })
    expect(updated.nodes.find((node) => node.id === 'scene-1')?.updatedAt).toBe(1710000001000)
    expect(graph.nodes.find((node) => node.id === 'scene-1')?.position).toEqual({ x: 420, y: 260 })
  })

  it('updates node fields and reconciles derived chapter and bible indexes', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const updated = updateDramaGraphNode(graph, {
      nodeId: 'scene-1',
      title: '第一章',
      kind: 'chapter',
      description: '主角开始把梦写成章节。',
      fields: [
        {
          id: 'scene-purpose',
          text: '主角决定把输入框梦境写成第一章。',
        },
      ],
    }, { now: 1710000002000 })

    const node = updated.nodes.find((candidate) => candidate.id === 'scene-1')
    expect(node?.title).toBe('第一章')
    expect(node?.kind).toBe('chapter')
    expect(node?.description).toBe('主角开始把梦写成章节。')
    expect(node?.fields[0]?.text).toBe('主角决定把输入框梦境写成第一章。')
    expect(node?.updatedAt).toBe(1710000002000)
    expect(updated.scenes).toHaveLength(0)
    expect(updated.chapters).toMatchObject([{ nodeId: 'scene-1', title: '第一章' }])
    expect(updated.bible.worldNodeIds).toEqual(['world-1'])
  })

  it('upserts a task binding to a node target', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const updated = upsertDramaGraphTaskBinding(graph, {
      nodeId: 'scene-1',
      taskId: 'task-1',
      agentId: 'agent-x',
      crewId: 'crew-1',
      status: 'active',
    }, { now: 1710000001000 })

    expect(updated.taskBindings).toEqual([
      {
        id: 'binding:scene-1:task-1',
        nodeId: 'scene-1',
        edgeId: undefined,
        taskId: 'task-1',
        agentId: 'agent-x',
        crewId: 'crew-1',
        status: 'active',
        createdAt: 1710000001000,
        updatedAt: 1710000001000,
      },
    ])
  })

  it('upserts a task binding to an edge target and updates by bindingId', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const withBinding = upsertDramaGraphTaskBinding(graph, {
      edgeId: 'edge-1',
      taskId: 'task-edge',
      status: 'pending',
    }, { now: 1710000001100 })
    const rewritten = upsertDramaGraphTaskBinding(withBinding, {
      bindingId: withBinding.taskBindings[0]?.id,
      edgeId: 'edge-1',
      taskId: 'task-edge',
      crewId: 'crew-main',
      status: 'done',
    }, { now: 1710000001200 })

    expect(rewritten.taskBindings).toHaveLength(1)
    expect(rewritten.taskBindings[0]).toMatchObject({
      id: withBinding.taskBindings[0]?.id,
      edgeId: 'edge-1',
      taskId: 'task-edge',
      crewId: 'crew-main',
      status: 'done',
      createdAt: 1710000001100,
      updatedAt: 1710000001200,
    })
  })

  it('deletes task binding through binding id', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const withBinding = upsertDramaGraphTaskBinding(graph, {
      edgeId: 'edge-1',
      taskId: 'task-legacy',
      status: 'pending',
    }, { now: 1710000001100 })
    const updated = deleteDramaGraphTaskBinding(withBinding, {
      bindingId: withBinding.taskBindings[0]?.id ?? 'missing',
    }, { now: 1710000001300 })

    expect(updated.taskBindings).toEqual([])
    expect(updated.updatedAt).toBe(1710000001300)
  })

  it('creates native nodes and reconciles derived collections', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const updated = createDramaGraphNode(graph, {
      kind: 'chapter',
      title: '新章节节点',
      description: '原生创建的章节。',
      position: { x: 720, y: 440 },
      fields: [
        { key: 'chapterNumber', label: '章节编号', text: '3' },
      ],
    }, { now: 1710000002500 })

    const created = updated.nodes.find((node) => node.title === '新章节节点')
    expect(created).toMatchObject({
      id: 'node-chapter-3',
      kind: 'chapter',
      description: '原生创建的章节。',
      position: { x: 720, y: 440 },
      createdAt: 1710000002500,
      updatedAt: 1710000002500,
    })
    expect(created?.fields[0]).toMatchObject({
      key: 'chapterNumber',
      label: '章节编号',
      text: '3',
    })
    expect(updated.chapters.some((chapter) => chapter.nodeId === created?.id && chapter.title === '新章节节点')).toBe(true)
    expect(updated.updatedAt).toBe(1710000002500)
  })

  it('upserts PLM chapter drafts onto Drama chapters and node fields', () => {
    const graph = updateDramaGraphNode(
      dramaGraphFromStoryletState(storyletState, { now: 1710000000000 }),
      {
        nodeId: 'scene-1',
        title: '第一章',
        kind: 'chapter',
      },
      { now: 1710000001000 },
    )
    const chapter = graph.chapters[0]
    expect(chapter).toBeDefined()

    const updated = upsertDramaGraphDraft(graph, {
      targetType: 'chapter',
      targetId: chapter!.id,
      chapterId: chapter!.id,
      nodeId: chapter!.nodeId,
      content: '她在输入框里看见自己的梦。',
      status: 'draft',
      source: 'plotpilot',
      fields: [
        { key: 'novelDraft', label: 'PLM 小说正文', text: '她在输入框里看见自己的梦。' },
        { key: 'scriptStatus', label: '剧本状态', text: 'draft' },
      ],
    }, { now: 1710000005000 })

    expect(updated.drafts).toMatchObject([
      {
        id: 'chapter:chapter-scene-1:plotpilot',
        targetType: 'chapter',
        targetId: 'chapter:scene-1',
        content: '她在输入框里看见自己的梦。',
        source: 'plotpilot',
        status: 'draft',
      },
    ])
    expect(updated.chapters[0]).toMatchObject({
      id: 'chapter:scene-1',
      draftIds: ['chapter:chapter-scene-1:plotpilot'],
      status: 'draft',
    })
    expect(updated.nodes.find((node) => node.id === 'scene-1')?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'novelDraft', text: '她在输入框里看见自己的梦。' }),
      expect.objectContaining({ key: 'scriptStatus', text: 'draft' }),
    ]))
    expect(updated.updatedAt).toBe(1710000005000)
  })

  it('records WritingSpec failures as blocked PLM drafts and node fields', () => {
    const graph = updateDramaGraphNode(
      dramaGraphFromStoryletState(storyletState, { now: 1710000000000 }),
      {
        nodeId: 'scene-1',
        title: '第一章',
        kind: 'chapter',
      },
      { now: 1710000001000 },
    )
    const chapter = graph.chapters[0]
    expect(chapter).toBeDefined()

    const updated = upsertDramaGraphDraft(graph, {
      draftId: `chapter:${chapter!.id}:plotpilot-writing-spec-failure`,
      targetType: 'chapter',
      targetId: chapter!.id,
      chapterId: chapter!.id,
      nodeId: chapter!.nodeId,
      content: 'WritingSpec 未通过：不要写剧情概要',
      status: 'blocked',
      source: 'plotpilot',
      fields: [
        { key: 'writingSpecStatus', label: 'WritingSpec 状态', value: 'failed', text: 'failed' },
        { key: 'writingSpecFailureReport', label: 'WritingSpec 失败报告', value: { passed: false }, text: '{"passed":false}' },
        { key: 'scriptStatus', label: '剧本状态', value: 'blocked', text: 'blocked' },
      ],
    }, { now: 1710000006000 })

    expect(updated.drafts[0]).toMatchObject({
      id: 'chapter:chapter:scene-1:plotpilot-writing-spec-failure',
      targetType: 'chapter',
      targetId: 'chapter:scene-1',
      source: 'plotpilot',
      status: 'blocked',
    })
    expect(updated.chapters[0]).toMatchObject({
      status: 'blocked',
      draftIds: ['chapter:chapter:scene-1:plotpilot-writing-spec-failure'],
    })
    expect(updated.nodes.find((node) => node.id === 'scene-1')?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'writingSpecStatus', text: 'failed' }),
      expect.objectContaining({ key: 'scriptStatus', text: 'blocked' }),
    ]))
  })

  it('updates edge label and type immutably', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const updated = updateDramaGraphEdge(graph, {
      edgeId: 'edge-1',
      label: 'blocks truth',
      type: 'blocks',
    }, { now: 1710000003000 })

    expect(updated).not.toBe(graph)
    expect(updated.updatedAt).toBe(1710000003000)
    expect(updated.edges[0]).toMatchObject({
      id: 'edge-1',
      label: 'blocks truth',
      type: 'blocks',
      updatedAt: 1710000003000,
    })
    expect(graph.edges[0]).toMatchObject({ label: 'causes', type: 'causal' })
  })

  it('creates a native edge with stable generated id', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const withoutEdges: DramaGraph = { ...graph, edges: [] }
    const updated = createDramaGraphEdge(withoutEdges, {
      sourceId: 'world-1',
      targetId: 'scene-1',
      label: 'reveals memory',
      type: 'reveals',
    }, { now: 1710000003500 })

    expect(updated.edges).toHaveLength(1)
    expect(updated.edges[0]).toMatchObject({
      id: 'edge-world-1-scene-1',
      sourceId: 'world-1',
      targetId: 'scene-1',
      label: 'reveals memory',
      type: 'reveals',
      sourceRefs: [{ format: 'native', id: 'edge-world-1-scene-1', kind: 'edge' }],
      createdAt: 1710000003500,
      updatedAt: 1710000003500,
    })
    expect(updated.updatedAt).toBe(1710000003500)
  })

  it('rejects invalid edge creation requests', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })

    expect(() => createDramaGraphEdge(graph, {
      sourceId: 'missing',
      targetId: 'scene-1',
      label: 'bad',
      type: 'custom',
    })).toThrow('source node not found')

    expect(() => createDramaGraphEdge(graph, {
      sourceId: 'scene-1',
      targetId: 'scene-1',
      label: 'self',
      type: 'custom',
    })).toThrow('source and target are the same node')
  })

  it('deletes an edge and removes task bindings attached to it', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const withBinding: DramaGraph = {
      ...graph,
      taskBindings: [
        {
          id: 'binding-1',
          edgeId: 'edge-1',
          taskId: 'task-1',
          status: 'pending',
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
      ],
    }
    const updated = deleteDramaGraphEdge(withBinding, 'edge-1', { now: 1710000004000 })

    expect(updated.edges).toEqual([])
    expect(updated.taskBindings).toEqual([])
    expect(updated.updatedAt).toBe(1710000004000)
  })

  it('deletes nodes and removes incident edges plus task bindings', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const withBindings: DramaGraph = {
      ...graph,
      taskBindings: [
        {
          id: 'node-binding',
          nodeId: 'scene-1',
          taskId: 'task-node',
          status: 'pending',
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
        {
          id: 'edge-binding',
          edgeId: 'edge-1',
          taskId: 'task-edge',
          status: 'pending',
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
      ],
    }

    const updated = deleteDramaGraphNode(withBindings, { nodeId: 'scene-1' }, { now: 1710000004500 })

    expect(updated.nodes.map((node) => node.id)).toEqual(['world-1'])
    expect(updated.edges).toEqual([])
    expect(updated.scenes).toEqual([])
    expect(updated.taskBindings).toEqual([])
    expect(updated.updatedAt).toBe(1710000004500)
  })

  it('detects graph relationship diagnostics for invalid or weak state', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const diagnosticGraph: DramaGraph = {
      ...graph,
      nodes: [
        ...graph.nodes,
        {
          id: 'lonely-node',
          kind: 'plot',
          title: '孤立伏笔',
          description: '还没有接入状态机。',
          fields: [],
          position: { x: 0, y: 0 },
          size: { width: 280, height: 150 },
          sourceRefs: [],
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
      ],
      edges: [
        ...graph.edges,
        {
          id: 'dangling-edge',
          sourceId: 'world-1',
          targetId: 'missing-node',
          type: 'supports',
          label: 'supports',
          sourceRefs: [],
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
        {
          id: 'self-loop-edge',
          sourceId: 'scene-1',
          targetId: 'scene-1',
          type: 'custom',
          label: 'loops',
          sourceRefs: [],
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
        {
          id: 'duplicate-edge-a',
          sourceId: 'world-1',
          targetId: 'scene-1',
          type: 'causal',
          label: 'causes',
          sourceRefs: [],
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
      ],
    }

    const diagnostics = detectDramaGraphDiagnostics(diagnosticGraph)
    const kinds = diagnostics.map((diagnostic) => diagnostic.kind)

    expect(kinds).toContain('dangling_edge')
    expect(kinds).toContain('self_loop')
    expect(kinds).toContain('duplicate_edge')
    expect(kinds).toContain('isolated_node')
    expect(diagnostics.find((diagnostic) => diagnostic.kind === 'dangling_edge')?.severity).toBe('error')
  })

  it('detects chapter chain gaps and contains cycles', () => {
    const graph = dramaGraphFromStoryletState(storyletState, { now: 1710000000000 })
    const chapterGraph: DramaGraph = {
      ...graph,
      nodes: [
        {
          ...graph.nodes[0]!,
          id: 'chapter-a',
          kind: 'chapter',
          title: '第一章',
        },
        {
          ...graph.nodes[1]!,
          id: 'chapter-b',
          kind: 'chapter',
          title: '第二章',
        },
      ],
      edges: [
        {
          id: 'contains-a-b',
          sourceId: 'chapter-a',
          targetId: 'chapter-b',
          type: 'contains',
          label: 'contains',
          sourceRefs: [],
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
        {
          id: 'contains-b-a',
          sourceId: 'chapter-b',
          targetId: 'chapter-a',
          type: 'contains',
          label: 'contains',
          sourceRefs: [],
          createdAt: 1710000000000,
          updatedAt: 1710000000000,
        },
      ],
      chapters: [
        { id: 'chapter:chapter-a', nodeId: 'chapter-a', title: '第一章', number: 1, sceneIds: [], draftIds: [], status: 'empty' },
        { id: 'chapter:chapter-b', nodeId: 'chapter-b', title: '第二章', number: 2, sceneIds: [], draftIds: [], status: 'empty' },
      ],
      scenes: [],
    }

    const kinds = detectDramaGraphDiagnostics(chapterGraph).map((diagnostic) => diagnostic.kind)

    expect(kinds).toContain('chapter_next_gap')
    expect(kinds).toContain('contains_cycle')
  })
})
