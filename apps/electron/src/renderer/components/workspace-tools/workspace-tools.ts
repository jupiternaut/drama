import { FileText, Layers, type LucideIcon } from 'lucide-react'

export type WorkspaceToolId = 'storylet' | 'plotPilot'

export type WorkspaceTool = {
  id: WorkspaceToolId
  title: string
  sourceName: string
  subtitle: string
  role: string
  bridge: string
  endpointLabel: string
  description: string
  url: string
  embedUrl?: string
  externalUrl?: string
  icon: LucideIcon
}

export const WORKSPACE_TOOLS = {
  storylet: {
    id: 'storylet',
    title: 'Drama Graph',
    sourceName: 'Storylet',
    subtitle: '状态机图谱',
    role: '状态机投影',
    bridge: '本地 iframe 桥',
    endpointLabel: 'localhost:3000',
    description: '保留 Storylet 图谱画布与节点风格，由 Drama 负责外层工作区、状态和恢复。',
    url: 'http://localhost:3000/',
    embedUrl: 'http://localhost:3000/?embed=drama',
    externalUrl: 'http://localhost:3000/',
    icon: Layers,
  },
  plotPilot: {
    id: 'plotPilot',
    title: 'Drama PLM',
    sourceName: 'PlotPilot',
    subtitle: '长上下文生成',
    role: '长上下文投影',
    bridge: 'PLM 运行时桥',
    endpointLabel: '127.0.0.1:8005',
    description: '承接长短上下文、bible、beat 和章节稿生成，作为 Drama 的长篇叙事投影。',
    url: 'http://127.0.0.1:8005/',
    embedUrl: 'http://127.0.0.1:8005/?embed=drama',
    externalUrl: 'http://127.0.0.1:8005/',
    icon: FileText,
  },
} as const satisfies Record<WorkspaceToolId, WorkspaceTool>

export const WORKSPACE_TOOL_LIST = [
  WORKSPACE_TOOLS.storylet,
  WORKSPACE_TOOLS.plotPilot,
] as const satisfies readonly WorkspaceTool[]

export function getWorkspaceTool(toolId: WorkspaceToolId): WorkspaceTool {
  return WORKSPACE_TOOLS[toolId]
}
