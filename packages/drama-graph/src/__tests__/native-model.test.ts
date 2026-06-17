import { describe, expect, it } from 'bun:test'

import { createEmptyDramaGraph } from '@drama/core'
import {
  buildStoryletNativeGraphModel,
  buildStoryletNativeGraphModelFromDramaGraph,
  createDramaGraphEdge,
  createDramaGraphNode,
  dramaGraphFromStoryletState,
} from '../index.ts'
import type { StoryletStoryState } from '../storylet-types.ts'

const storyState: StoryletStoryState = {
  schema: 'drama.storylet_state.v1',
  source: 'storylet',
  graphId: 'storylet-native-test',
  graphName: 'Storylet Native Test',
  cards: [
    {
      id: 'world',
      kind: 'world',
      title: 'Token 续命社会',
      fields: [
        {
          id: 'overview',
          key: 'worldOverview',
          name: '世界观',
          value: '所有输入都会被模型胃消化。',
          text: '所有输入都会被模型胃消化。',
        },
      ],
      position: { x: 40, y: 80 },
    },
    {
      id: 'scene',
      kind: 'scene',
      title: 'S01',
      fields: [
        {
          id: 'purpose',
          key: 'scenePurpose',
          name: '场景目的',
          value: '主角发现 token 欠费单。',
          text: '主角发现 token 欠费单。',
        },
      ],
    },
  ],
  edges: [
    { id: 'edge-1', source: 'world', target: 'scene', label: 'pressure', type: 'next' },
    { id: 'broken', source: 'world', target: 'missing', label: 'lost' },
  ],
  summary: {
    cardCount: 2,
    edgeCount: 2,
    worldCount: 1,
    characterCount: 0,
    locationCount: 0,
    chapterCount: 0,
    sceneCount: 1,
  },
}

describe('Storylet native graph model', () => {
  it('projects Storylet state into native canvas nodes and filters dangling edges', () => {
    const model = buildStoryletNativeGraphModel(storyState)

    expect(model.schema).toBe('drama.storylet_native_graph.v1')
    expect(model.graphId).toBe('storylet-native-test')
    expect(model.nodes.find((node) => node.id === 'world')).toMatchObject({
      kind: 'world',
      x: 40,
      y: 80,
      summary: expect.stringContaining('模型胃'),
    })
    expect(model.edges).toEqual([
      expect.objectContaining({ id: 'edge-1', source: 'world', target: 'scene', label: 'pressure' }),
    ])
    expect(model.bounds.width).toBeGreaterThan(0)
    expect(model.summary.edgeCount).toBe(1)
  })

  it('projects DramaGraph into the same canvas model contract', () => {
    let graph = createEmptyDramaGraph({ id: 'native-graph', title: 'Native Graph', now: 1 })
    graph = createDramaGraphNode(graph, {
      kind: 'world',
      title: '世界',
      fields: [{ key: 'worldOverview', label: '世界观', text: '模型胃规则' }],
      position: { x: 0, y: 0 },
    }, { now: 2 })
    graph = createDramaGraphNode(graph, {
      kind: 'scene',
      title: '开场',
      fields: [{ key: 'scenePurpose', label: '场景目的', text: '发现欠费单' }],
      position: { x: 420, y: 0 },
    }, { now: 3 })
    graph = createDramaGraphEdge(graph, {
      sourceId: graph.nodes[0]!.id,
      targetId: graph.nodes[1]!.id,
      type: 'next',
      label: 'next',
    }, { now: 4 })

    const model = buildStoryletNativeGraphModelFromDramaGraph(graph)

    expect(model.graphId).toBe('native-graph')
    expect(model.nodes).toHaveLength(2)
    expect(model.edges).toEqual([
      expect.objectContaining({ source: graph.nodes[0]!.id, target: graph.nodes[1]!.id, type: 'next' }),
    ])
  })

  it('keeps Storylet import compatible with DramaGraph projection', () => {
    const graph = dramaGraphFromStoryletState(storyState, { now: 1 })
    const model = buildStoryletNativeGraphModelFromDramaGraph(graph)

    expect(model.nodes.map((node) => node.id).sort()).toEqual(['scene', 'world'])
    expect(model.edges).toHaveLength(1)
  })
})
