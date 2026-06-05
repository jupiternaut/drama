import * as React from 'react'

import { routes, useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'

import { WORKSPACE_TOOL_LIST, type WorkspaceToolId } from './workspace-tools'

export interface WorkspaceToolNavigatorPanelProps {
  activeToolId: WorkspaceToolId
}

function routeForTool(toolId: WorkspaceToolId) {
  switch (toolId) {
    case 'storylet':
      return routes.view.storylet()
    case 'plotPilot':
      return routes.view.plotPilot()
  }
}

export function WorkspaceToolNavigatorPanel({
  activeToolId,
}: WorkspaceToolNavigatorPanelProps) {
  const { navigate } = useNavigation()

  const handleToolClick = React.useCallback(
    (toolId: WorkspaceToolId) => {
      navigate(routeForTool(toolId))
    },
    [navigate],
  )

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/70 bg-background/95">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Drama 投影
            </div>
            <div className="mt-1 truncate font-mono text-[11px] text-foreground/55">
              graph / long-context runtime
            </div>
          </div>
          <span className="mt-0.5 inline-flex h-5 shrink-0 items-center gap-1 rounded-[4px] border border-border/70 bg-foreground/[0.03] px-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            本地
          </span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Drama 投影">
        <div className="space-y-1">
          {WORKSPACE_TOOL_LIST.map((tool) => {
            const Icon = tool.icon
            const isActive = tool.id === activeToolId

            return (
              <button
                key={tool.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative flex w-full items-start gap-2 rounded-md px-2 py-2 text-left outline-none transition-colors',
                  'focus-visible:ring-1 focus-visible:ring-ring',
                  isActive
                    ? 'bg-foreground/[0.07] text-foreground shadow-minimal'
                    : 'text-foreground hover:bg-foreground/[0.035]',
                )}
                onClick={() => handleToolClick(tool.id)}
              >
                {isActive ? (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent/70" />
                ) : null}
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-md ring-1 transition-colors',
                    isActive
                      ? 'bg-accent/12 text-accent ring-accent/20'
                      : 'bg-foreground/[0.035] text-muted-foreground ring-border/40 group-hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold leading-4">{tool.title}</span>
                    <span className="size-1.5 shrink-0 rounded-full bg-success" />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {tool.subtitle} · {tool.role}
                  </span>
                  <span className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-muted-foreground/80">
                    <span className="truncate">source: {tool.sourceName}</span>
                    <span className="text-foreground/20">/</span>
                    <span className="truncate">{tool.endpointLabel}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-border/60 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/75">
          2 个投影 · Drama shell
        </div>
      </div>
    </div>
  )
}
