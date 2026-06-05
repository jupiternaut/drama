import { ProjectionHost } from './ProjectionHost'
import { getWorkspaceTool, type WorkspaceToolId } from './workspace-tools'

export interface WorkspaceToolPageProps {
  toolId: WorkspaceToolId
}

export function WorkspaceToolPage({ toolId }: WorkspaceToolPageProps) {
  const tool = getWorkspaceTool(toolId)
  return <ProjectionHost tool={tool} />
}
