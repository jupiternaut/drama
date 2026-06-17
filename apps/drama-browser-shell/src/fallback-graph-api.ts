import {
  createDramaGraphEdge,
  createDramaGraphNode,
  createEmptyDramaGraph,
  deleteDramaGraphEdge,
  deleteDramaGraphNode,
  deleteDramaGraphTaskBinding,
  updateDramaGraphEdge,
  updateDramaGraphNode,
  updateDramaGraphNodePositions,
  upsertDramaGraphTaskBinding,
  type DramaGraph,
} from '@drama/graph'
import type { DramaGraphUiApi } from '@drama/graph-ui'

let graph: DramaGraph = seedGraph()
const fallbackPath = 'memory://drama-browser-shell/graphs/fallback.json'

function seedGraph(): DramaGraph {
  let next = createEmptyDramaGraph({
    id: 'offline-fallback',
    title: 'Drama Offline Graph',
    now: Date.now(),
  })

  next = createDramaGraphNode(next, {
    nodeId: 'story-open-source',
    kind: 'story',
    title: '开源史诗',
    description: '一个从开源黄金年代走向 agent 时代的长篇叙事。',
    position: { x: 80, y: 80 },
    fields: [
      { key: 'theme', label: '主题', text: '协作、记忆、工具与创作系统' },
      { key: 'tone', label: '语气', text: '冷静、史诗感、技术纪实' },
    ],
  })
  next = createDramaGraphNode(next, {
    nodeId: 'chapter-runtime',
    kind: 'chapter',
    title: '第 1 章：石头开始说话',
    description: '开发者把工具从脚本推进到可协作的 runtime。',
    position: { x: 460, y: 80 },
    fields: [
      { key: 'chapterNumber', label: '章节', text: '1' },
      { key: 'synopsis', label: '梗概', text: '从早期开源协作写到智能体工作台出现。' },
    ],
  })
  next = createDramaGraphNode(next, {
    nodeId: 'scene-memory',
    kind: 'scene',
    title: '1-1 长上下文成为舞台',
    description: '状态机、记忆和 RAG 被接到同一块画布上。',
    position: { x: 840, y: 80 },
    fields: [
      { key: 'status', label: '状态', text: '可编辑' },
      { key: 'plm', label: 'PLM', text: '可回写章节草稿' },
    ],
  })
  next = createDramaGraphEdge(next, {
    edgeId: 'edge-story-chapter',
    sourceId: 'story-open-source',
    targetId: 'chapter-runtime',
    type: 'contains',
    label: 'contains',
  })
  next = createDramaGraphEdge(next, {
    edgeId: 'edge-chapter-scene',
    sourceId: 'chapter-runtime',
    targetId: 'scene-memory',
    type: 'contains',
    label: 'contains',
  })
  return next
}

function mutationResult() {
  return {
    graph,
    path: fallbackPath,
    backupPath: 'memory://drama-browser-shell/backups/latest.json',
  }
}

export const fallbackGraphApi: DramaGraphUiApi = {
  async loadDramaGraph() {
    return {
      graph,
      path: fallbackPath,
      imported: false,
    }
  },
  async loadDramaGraphHistory(request) {
    return {
      graphId: request.graphId,
      backups: [
        {
          path: 'memory://drama-browser-shell/backups/fallback.backup.json',
          createdAt: Date.now(),
          graphName: graph.title,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          valid: true,
        },
      ],
      events: [
        {
          id: 'fallback-event-1',
          graphId: request.graphId,
          type: 'runtime.fallback.loaded',
          actor: 'drama:browser-shell',
          createdAt: Date.now(),
          details: { source: 'memory-fallback' },
        },
      ],
      eventLogPath: 'memory://drama-browser-shell/graph-events.jsonl',
    }
  },
  async updateDramaGraphNodePositions(request) {
    graph = updateDramaGraphNodePositions(graph, request.updates)
    return mutationResult()
  },
  async updateDramaGraphNode(request) {
    graph = updateDramaGraphNode(graph, request.update)
    return mutationResult()
  },
  async createDramaGraphNode(request) {
    graph = createDramaGraphNode(graph, request.input)
    return mutationResult()
  },
  async deleteDramaGraphNode(request) {
    graph = deleteDramaGraphNode(graph, request.input)
    return mutationResult()
  },
  async updateDramaGraphEdge(request) {
    graph = updateDramaGraphEdge(graph, request.update)
    return mutationResult()
  },
  async createDramaGraphEdge(request) {
    graph = createDramaGraphEdge(graph, request.input)
    return mutationResult()
  },
  async deleteDramaGraphEdge(request) {
    graph = deleteDramaGraphEdge(graph, request.edgeId)
    return mutationResult()
  },
  async restoreDramaGraphBackup() {
    graph = seedGraph()
    return mutationResult()
  },
  async upsertDramaGraphTaskBinding(request) {
    graph = upsertDramaGraphTaskBinding(graph, request.input)
    return mutationResult()
  },
  async deleteDramaGraphTaskBinding(request) {
    graph = deleteDramaGraphTaskBinding(graph, request.input)
    return mutationResult()
  },
  openUrl(url) {
    console.log('[drama-browser-shell] openUrl', url)
  },
}
