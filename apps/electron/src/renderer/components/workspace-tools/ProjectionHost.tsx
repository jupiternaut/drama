import * as React from 'react'
import { ExternalLink, Loader2, RotateCw } from 'lucide-react'

import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { HeaderIconButton } from '@/components/ui/HeaderIconButton'
import { cn } from '@/lib/utils'

import type { WorkspaceTool } from './workspace-tools'

const IFRAME_SANDBOX = 'allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-same-origin'

type ProjectionFrameState = 'loading' | 'ready' | 'slow'

const frameStateMeta: Record<ProjectionFrameState, { label: string; dotClassName: string; overlayLabel: string }> = {
  loading: {
    label: '加载',
    dotClassName: 'bg-muted-foreground/60',
    overlayLabel: '加载投影视图',
  },
  ready: {
    label: '就绪',
    dotClassName: 'bg-success',
    overlayLabel: '投影视图已就绪',
  },
  slow: {
    label: '等待',
    dotClassName: 'bg-info',
    overlayLabel: '等待本地服务响应',
  },
}

export interface ProjectionHostProps {
  tool: WorkspaceTool
}

export function ProjectionHost({ tool }: ProjectionHostProps) {
  const [reloadKey, setReloadKey] = React.useState(0)
  const [frameState, setFrameState] = React.useState<ProjectionFrameState>('loading')

  const frameSrc = tool.embedUrl ?? tool.url
  const externalUrl = tool.externalUrl ?? tool.url
  const isCanvasProjection = tool.id === 'storylet'

  const handleRefresh = React.useCallback(() => {
    setFrameState('loading')
    setReloadKey((current) => current + 1)
  }, [])

  const handleOpenExternal = React.useCallback(() => {
    void window.electronAPI.openUrl(externalUrl)
  }, [externalUrl])

  React.useEffect(() => {
    setFrameState('loading')
    const timeout = window.setTimeout(() => {
      setFrameState((current) => (current === 'loading' ? 'slow' : current))
    }, 12000)

    return () => window.clearTimeout(timeout)
  }, [tool.id, reloadKey])

  if (isCanvasProjection) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#07080d]">
        <PanelHeader
          title={tool.title}
          badge={<ProjectionRuntimeBadge state={frameState} />}
          className="border-b border-white/[0.07] bg-[#0b0c12]/95 text-white"
          actions={
            <div className="flex items-center gap-1">
              <HeaderIconButton
                icon={<RotateCw className="size-4" />}
                tooltip="刷新"
                aria-label={`刷新 ${tool.title}`}
                onClick={handleRefresh}
                className="text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
              />
              <HeaderIconButton
                icon={<ExternalLink className="size-4" />}
                tooltip="外部打开"
                aria-label={`外部打开 ${tool.title}`}
                onClick={handleOpenExternal}
                className="text-white/55 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/30"
              />
            </div>
          }
        />

        <div
          className="relative min-h-0 flex-1 overflow-hidden bg-[#050609]"
          style={{ contain: 'layout paint' }}
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.045)_1px,_transparent_1px)] bg-[length:24px_24px]" />
          <CanvasRuntimeRail tool={tool} state={frameState} />

          {frameState !== 'ready' ? (
            <CanvasLoadingOverlay state={frameState} />
          ) : null}

          <iframe
            key={`${tool.id}:${reloadKey}`}
            src={frameSrc}
            title={tool.title}
            className="relative z-[1] block h-full w-full border-0 bg-transparent"
            sandbox={IFRAME_SANDBOX}
            loading="eager"
            referrerPolicy="no-referrer"
            onLoad={() => setFrameState('ready')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <PanelHeader
        title={tool.title}
        badge={<ProjectionRuntimeBadge state={frameState} />}
        actions={
          <div className="flex items-center gap-1">
            <HeaderIconButton
              icon={<RotateCw className="size-4" />}
              tooltip="刷新"
              aria-label={`刷新 ${tool.title}`}
              onClick={handleRefresh}
            />
            <HeaderIconButton
              icon={<ExternalLink className="size-4" />}
              tooltip="外部打开"
              aria-label={`外部打开 ${tool.title}`}
              onClick={handleOpenExternal}
            />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 bg-foreground/[0.025]">
        <ProjectionRuntimeStrip tool={tool} />

        <div
          className="relative min-h-0 flex-1 overflow-hidden bg-background"
          style={{ contain: 'layout paint' }}
        >
          {frameState !== 'ready' ? (
            <ProjectionLoadingOverlay state={frameState} />
          ) : null}

          <iframe
            key={`${tool.id}:${reloadKey}`}
            src={frameSrc}
            title={tool.title}
            className="block h-full w-full border-0 bg-background"
            sandbox={IFRAME_SANDBOX}
            loading="eager"
            referrerPolicy="no-referrer"
            onLoad={() => setFrameState('ready')}
          />
        </div>
      </div>
    </div>
  )
}

function ProjectionRuntimeBadge({ state }: { state: ProjectionFrameState }) {
  const meta = frameStateMeta[state]

  return (
    <span className="hidden items-center gap-1 rounded-[4px] border border-border/70 bg-foreground/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} />
      {meta.label}
    </span>
  )
}

function ProjectionRuntimeStrip({ tool }: { tool: WorkspaceTool }) {
  return (
    <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3 text-xs text-muted-foreground">
      <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-[4px] border border-border/70 bg-foreground/[0.06] px-1.5 font-mono text-[10px] font-semibold text-foreground/80">
        <span className="size-1.5 rounded-full bg-accent" />
        投影
      </span>
      <span className="min-w-0 truncate text-foreground/75">{tool.role}</span>
      <span className="hidden text-foreground/20 sm:inline">/</span>
      <span className="hidden min-w-0 truncate font-mono text-[11px] sm:inline">
        source: {tool.sourceName}
      </span>
      <span className="hidden text-foreground/20 md:inline">/</span>
      <span className="hidden min-w-0 truncate font-mono text-[11px] md:inline">
        runtime: {tool.endpointLabel}
      </span>
      <span className="ml-auto hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80 lg:inline">
        {tool.bridge}
      </span>
    </div>
  )
}

function CanvasRuntimeRail({ tool, state }: { tool: WorkspaceTool; state: ProjectionFrameState }) {
  const meta = frameStateMeta[state]

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#0b0d13]/80 px-2 py-1 text-[11px] text-white/62 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur">
      <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-[4px] border border-white/[0.08] bg-white/[0.045] px-1.5 font-mono text-[10px] font-semibold text-white/82">
        <span className={cn('size-1.5 rounded-full', meta.dotClassName)} />
        画布
      </span>
      <span className="min-w-0 truncate text-white/72">{tool.role}</span>
      <span className="text-white/20">/</span>
      <span className="hidden min-w-0 truncate font-mono text-[10px] sm:inline">
        source: {tool.sourceName}
      </span>
      <span className="hidden text-white/20 md:inline">/</span>
      <span className="hidden min-w-0 truncate font-mono text-[10px] md:inline">
        JSON Canvas 基线
      </span>
    </div>
  )
}

function CanvasLoadingOverlay({ state }: { state: ProjectionFrameState }) {
  const meta = frameStateMeta[state]

  return (
    <div className="pointer-events-none absolute left-3 top-12 z-10 inline-flex items-center gap-2 rounded-[6px] border border-white/[0.08] bg-[#0b0d13]/90 px-2.5 py-1.5 text-xs text-white/66 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur">
      <Loader2 className={cn('size-3.5', state === 'loading' && 'animate-spin')} />
      <span>{meta.overlayLabel}</span>
    </div>
  )
}

function ProjectionLoadingOverlay({ state }: { state: ProjectionFrameState }) {
  const meta = frameStateMeta[state]

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-local inline-flex items-center gap-2 rounded-[6px] border border-border/70 bg-background/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-minimal">
      <Loader2 className={cn('size-3.5', state === 'loading' && 'animate-spin')} />
      <span>{meta.overlayLabel}</span>
    </div>
  )
}
