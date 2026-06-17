import * as React from 'react'

import {
  DRAMA_PLM_OPEN_REQUEST_KEY,
  StoryletNativeGraphContainer as DramaGraphUiContainer,
  type DramaGraphOpenPlmChapterRequest,
} from '@drama/graph-ui'

import { navigate, routes } from '@/lib/navigate'

import type { WorkspaceTool } from './workspace-tools'

export interface StoryletNativeGraphContainerProps {
  tool: WorkspaceTool
}

export function StoryletNativeGraphContainer({ tool }: StoryletNativeGraphContainerProps) {
  const openPlmChapter = React.useCallback((request: DramaGraphOpenPlmChapterRequest) => {
    window.sessionStorage.setItem(DRAMA_PLM_OPEN_REQUEST_KEY, JSON.stringify(request))
    navigate(routes.view.plotPilot())
  }, [])

  return (
    <DramaGraphUiContainer
      tool={tool}
      api={window.electronAPI}
      onOpenPlmChapter={openPlmChapter}
    />
  )
}
