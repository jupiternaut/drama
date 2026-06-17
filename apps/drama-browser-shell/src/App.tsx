import * as React from 'react'
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FolderOpen,
  GitBranch,
  ListChecks,
  MessageSquareText,
  Network,
  Radio,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from 'lucide-react'

import { createSkillCrewAgentOutputEvent, createSkillCrewSuggestionEvent, inferSkillCrewRoomId } from '@drama/crew'
import { StoryletNativeGraphContainer } from '@drama/graph-ui'
import { createBrowserHostApi, createDramaRuntimeClient, type DramaRuntimeStatus } from '@drama/host'
import { createGeckoHostApi } from '@drama/host/gecko'
import {
  PlotPilotNativeContainer,
  type PlotPilotNativeApi,
} from '@drama/plm-ui'
import { Button, StatusBadge, WorkbenchToolButton, type StatusTone } from '@drama/ui'

import { fallbackGraphApi } from './fallback-graph-api'
import { createRuntimeBackedGraphApi } from './runtime-graph-api'

type Surface = 'graph' | 'plm' | 'crew'
type StyleReadiness = 'checking' | 'ready' | 'missing'

interface SurfaceDescriptor {
  id: Surface
  title: string
  shortLabel: string
  subtitle: string
  source: string
  Icon: React.ComponentType<{ className?: string }>
}

const surfaces: SurfaceDescriptor[] = [
  { id: 'graph', title: 'Drama Graph', shortLabel: 'Graph', subtitle: '状态机画布', source: '画布 / 状态机 / 剧情结构', Icon: Network },
  { id: 'plm', title: 'Drama PLM', shortLabel: 'PLM', subtitle: '长上下文生成', source: '章节 / Bible / 草稿回写', Icon: ScrollText },
  { id: 'crew', title: 'Skill Crew', shortLabel: 'Crew', subtitle: '导演控场', source: 'Agent / Task / Graph Events', Icon: UsersRound },
]

function getInitialSurface(): Surface {
  const segments = globalThis.location?.pathname?.replace(/^\/+/, '').split('/').filter(Boolean) ?? []
  const path = segments[0] === 'app' ? segments[1] : segments[0]
  if (path === 'plm' || path === 'crew' || path === 'graph') return path
  return 'graph'
}

function getShellBasePath(): string {
  return '/app'
}

function normalizeShellLocation(surface: Surface): void {
  const pathname = globalThis.location?.pathname ?? '/'
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean)
  const alreadyAppRoute = segments[0] === 'app'
  const nakedSurfaceRoute = segments.length === 1 && (segments[0] === 'graph' || segments[0] === 'plm' || segments[0] === 'crew')
  if (alreadyAppRoute || !nakedSurfaceRoute) return

  const nextPath = `${getShellBasePath()}/${surface}${globalThis.location?.search ?? ''}${globalThis.location?.hash ?? ''}`
  globalThis.history?.replaceState?.({}, '', nextPath)
}

function isZenHost(): boolean {
  return new URLSearchParams(globalThis.location?.search ?? '').get('host') === 'zen'
}

function getRuntimeBaseUrl(): string {
  return new URLSearchParams(globalThis.location?.search ?? '').get('runtime')
    ?? import.meta.env.VITE_DRAMA_RUNTIME_BASE_URL
    ?? 'http://127.0.0.1:3198'
}

function offlineRuntimeStatus(message = 'Drama standalone runtime is not reachable.'): DramaRuntimeStatus {
  return {
    state: 'offline',
    message,
    updatedAt: new Date().toISOString(),
  }
}

type PlotPilotNativeRuntimeStatus = Awaited<ReturnType<PlotPilotNativeApi['getPlotPilotRuntimeStatus']>>

function withRuntimeProxyBaseUrl(
  status: PlotPilotNativeRuntimeStatus,
  runtimeBaseUrl: string,
): PlotPilotNativeRuntimeStatus {
  if (!status.healthy) return status
  const proxyBaseUrl = `${runtimeBaseUrl.replace(/\/+$/, '')}/plm/proxy`
  return {
    ...status,
    baseUrl: proxyBaseUrl,
    apiBaseUrl: `${proxyBaseUrl}/api/v1`,
    url: proxyBaseUrl,
  }
}

function useStyleReadiness() {
  const cssProbeRef = React.useRef<HTMLDivElement>(null)
  const tailwindProbeRef = React.useRef<HTMLDivElement>(null)
  const [styleReadiness, setStyleReadiness] = React.useState<StyleReadiness>('checking')

  React.useLayoutEffect(() => {
    let disposed = false
    let retryTimer = 0

    const check = () => {
      if (disposed) return
      const cssProbe = cssProbeRef.current
      const tailwindProbe = tailwindProbeRef.current
      if (!cssProbe || !tailwindProbe) {
        setStyleReadiness('missing')
        return
      }

      const cssReady = window.getComputedStyle(cssProbe).getPropertyValue('--drama-css-ready').trim() === 'ready'
      const tailwindReady = window.getComputedStyle(tailwindProbe).display === 'flex'
      const ready = cssReady && tailwindReady
      document.documentElement.dataset.dramaStyles = ready ? 'ready' : 'missing'
      setStyleReadiness(ready ? 'ready' : 'missing')
    }

    check()
    retryTimer = window.setTimeout(check, 120)

    return () => {
      disposed = true
      window.clearTimeout(retryTimer)
    }
  }, [])

  return { cssProbeRef, tailwindProbeRef, styleReadiness }
}

function StyleReadinessProbes({
  cssProbeRef,
  tailwindProbeRef,
}: {
  cssProbeRef: React.RefObject<HTMLDivElement>
  tailwindProbeRef: React.RefObject<HTMLDivElement>
}) {
  const probeStyle: React.CSSProperties = {
    position: 'fixed',
    left: -10000,
    top: -10000,
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  }

  return (
    <>
      <div ref={cssProbeRef} className="drama-css-probe" style={probeStyle} aria-hidden="true" />
      <div ref={tailwindProbeRef} className="drama-tailwind-probe flex" style={probeStyle} aria-hidden="true" />
    </>
  )
}

function StyleFailurePanel({ state }: { state: StyleReadiness }) {
  const isChecking = state === 'checking'
  return (
    <main className="drama-critical-fallback" data-drama-style-state={state}>
      <section className="drama-critical-card" role="status" aria-live="polite">
        <div className="drama-critical-mark">D</div>
        <div className="drama-critical-copy">
          <p className="drama-critical-kicker">Drama Workbench</p>
          <h1>{isChecking ? '正在校验工作台样式' : '工作台样式未完整加载'}</h1>
          <p>
            {isChecking
              ? '正在确认 Drama/Warp 样式和 Tailwind 原子类是否已加载。'
              : '为避免显示默认 HTML 或裸组件，Drama 已停止渲染当前页面。请刷新或重新构建 browser shell。'}
          </p>
          {!isChecking ? (
            <button type="button" onClick={() => window.location.reload()} className="drama-critical-button">
              重新加载
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function RuntimeChip({
  status,
  stateLabel,
}: {
  status: DramaRuntimeStatus
  stateLabel: string
}) {
  const toneByState: Record<DramaRuntimeStatus['state'], StatusTone> = {
    starting: 'info',
    ready: 'success',
    error: 'danger',
    offline: 'danger',
  }
  return (
    <StatusBadge
      className={['drama-runtime-chip', `runtime-status-${status.state}`].join(' ')}
      tone={toneByState[status.state] ?? 'neutral'}
      dot
      role="status"
      aria-live="polite"
      title={status.message}
    >
      <span>{stateLabel}</span>
    </StatusBadge>
  )
}

function SurfaceButton({
  item,
  active,
  onClick,
}: {
  item: SurfaceDescriptor
  active: boolean
  onClick: () => void
}) {
  const Icon = item.Icon
  return (
    <WorkbenchToolButton
      onClick={onClick}
      active={active}
      title={`${item.title} - ${item.subtitle}`}
      label={item.shortLabel}
      icon={<Icon className="drama-workbench-tool-button-svg" />}
    />
  )
}

function DramaWorkbenchShell({
  surface,
  surfaces,
  activeSurface,
  zenHost,
  hostKind,
  runtimeStatus,
  runtimeStateLabel,
  onSwitchSurface,
  children,
}: {
  surface: Surface
  surfaces: SurfaceDescriptor[]
  activeSurface: SurfaceDescriptor
  zenHost: boolean
  hostKind: string
  runtimeStatus: DramaRuntimeStatus
  runtimeStateLabel: string
  onSwitchSurface: (surface: Surface) => void
  children: React.ReactNode
}) {
  const surfaceIcon = activeSurface.Icon
  const ShellSurfaceIcon = surfaceIcon

  return (
    <div
      className={['drama-shell', zenHost ? 'zen-host' : ''].filter(Boolean).join(' ')}
      data-drama-shell="workbench"
      data-host={zenHost ? 'zen' : 'browser'}
    >
      {!zenHost ? (
        <aside className="drama-sidebar">
          <div className="drama-sidebar-brand">
            <div className="drama-mark" aria-hidden="true">D</div>
            <div>
              <div className="drama-sidebar-kicker">Drama</div>
              <div className="drama-sidebar-title">Workspace</div>
            </div>
          </div>

          <nav className="drama-sidebar-nav" aria-label="Drama surfaces">
            {surfaces.map((item) => (
              <SurfaceButton
                key={item.id}
                item={item}
                active={surface === item.id}
                onClick={() => onSwitchSurface(item.id)}
              />
            ))}
          </nav>

          <div className="drama-sidebar-status">
            <span className={['runtime-status-dot', `runtime-status-dot-${runtimeStatus.state}`].join(' ')} />
            <span>{hostKind}</span>
          </div>
        </aside>
      ) : null}

      <main className="drama-main" data-drama-surface={surface}>
        <header className="drama-workbench-bar">
          <div className="drama-workbench-left">
            {zenHost ? <div className="drama-mark drama-mark-inline" aria-hidden="true">D</div> : null}
            <nav className="drama-tool-switcher" aria-label="Drama workspace surfaces">
              {surfaces.map((item) => (
                <SurfaceButton
                  key={item.id}
                  item={item}
                  active={surface === item.id}
                  onClick={() => onSwitchSurface(item.id)}
                />
              ))}
            </nav>
          </div>

          <div className="drama-surface-title">
            <span className="drama-surface-title-icon" aria-hidden="true">
              <ShellSurfaceIcon />
            </span>
            <span className="drama-surface-title-copy">
              <span className="drama-surface-title-primary">Drama Workspace</span>
              <span className="drama-surface-title-secondary">{activeSurface.title}</span>
            </span>
            <span className="drama-mode-pill" title={activeSurface.source}>{activeSurface.subtitle}</span>
          </div>

          <div className="drama-workbench-meta">
            <span className="drama-host-badge">{zenHost ? 'Zen' : hostKind}</span>
            <RuntimeChip status={runtimeStatus} stateLabel={runtimeStateLabel} />
          </div>
        </header>

        <section className="drama-surface-frame" data-surface={surface}>
          {children}
        </section>
      </main>
    </div>
  )
}

export function App() {
  const [surface, setSurface] = React.useState<Surface>(getInitialSurface)
  const [zenHost, setZenHost] = React.useState(isZenHost)
  const { cssProbeRef, tailwindProbeRef, styleReadiness } = useStyleReadiness()
  const runtimeBaseUrl = React.useMemo(getRuntimeBaseUrl, [])
  const runtimeClient = React.useMemo(() => createDramaRuntimeClient({ baseUrl: runtimeBaseUrl }), [runtimeBaseUrl])
  const [runtimeStatus, setRuntimeStatus] = React.useState<DramaRuntimeStatus>({
    state: 'starting',
    message: 'Connecting to Drama standalone runtime.',
    updatedAt: new Date().toISOString(),
  })
  const [crewWriteStatus, setCrewWriteStatus] = React.useState<string>('尚未写入 runtime')
  const browserHost = React.useMemo(() => (
    zenHost
      ? createGeckoHostApi({
        name: 'Drama Zen Browser Host',
        version: '0.1.0',
        runtimeBaseUrl,
      })
      : createBrowserHostApi({
        name: 'Drama Browser Shell',
        version: '0.1.0',
      })
  ), [runtimeBaseUrl, zenHost])
  const graphApi = React.useMemo(() => createRuntimeBackedGraphApi({
    runtime: runtimeClient,
    fallback: fallbackGraphApi,
    onRuntimeStatus: setRuntimeStatus,
  }), [runtimeClient])
  const plmApi = React.useMemo<PlotPilotNativeApi>(() => ({
    async getPlotPilotRuntimeLogs() {
      return runtimeClient.request('plotpilot:runtime:logs', { limit: 80 })
    },
    async getPlotPilotRuntimeStatus() {
      return withRuntimeProxyBaseUrl(
        await runtimeClient.request('plotpilot:runtime:status', { checkHealth: true }),
        runtimeBaseUrl,
      )
    },
    async startPlotPilotRuntime() {
      return withRuntimeProxyBaseUrl(
        await runtimeClient.request('plotpilot:runtime:start', { preferExisting: true }),
        runtimeBaseUrl,
      )
    },
    async restartPlotPilotRuntime() {
      return withRuntimeProxyBaseUrl(
        await runtimeClient.request('plotpilot:runtime:restart', { preferExisting: false }),
        runtimeBaseUrl,
      )
    },
    async openUrl(url: string) {
      await browserHost.shell.openUrl(url)
    },
    recordDramaProjectFile(request) {
      return runtimeClient.request('drama:projectFile:record', request)
    },
    loadDramaGraph() {
      return runtimeClient.request('drama:graph:load', { importStoryletIfMissing: false })
    },
    upsertDramaGraphDraft(request) {
      return runtimeClient.request('drama:graph:upsertDraft', request)
    },
    recordDramaGraphEvent(request) {
      return runtimeClient.request('drama:graph:recordEvent', request)
    },
    async loadStoryletBridgeSnapshot() {
      throw new Error('Storylet JSON compatibility import is not available in the Zen/browser host. Use Drama Graph as the primary source.')
    },
    async writeStoryletChapterFromPlotPilot() {
      throw new Error('Storylet JSON compatibility writeback is disabled in the Zen/browser host. Drama Graph writeback remains enabled.')
    },
  }), [browserHost, runtimeBaseUrl, runtimeClient])
  const crewRoom = inferSkillCrewRoomId({
    slug: 'screenplay-director',
    path: 'C:/Users/gengr/.codex/skills/screenplay-director',
    metadata: {
      name: '导演控场',
      description: 'screenplay graph state director',
    },
  })
  const crewSuggestion = {
    nodeId: 'chapter-runtime',
    agentId: 'screenplay-director',
    title: '章节节奏建议',
    body: '第 1 章应先建立开源黄金年代，再进入 AgentOS 的状态机工作台。',
    patch: {
      fields: [{ key: 'pacing', text: '先历史叙事，再技术转场' }],
    },
  }
  const crewEvent = createSkillCrewSuggestionEvent(crewSuggestion)
  const crewAgentOutputEvent = createSkillCrewAgentOutputEvent({
    nodeId: 'chapter-runtime',
    agentId: 'screenplay-director',
    roomId: crewRoom,
    title: '导演控场输出',
    body: crewSuggestion.body,
    outputType: 'proposal',
    artifacts: [
      {
        type: 'graph.patch',
        patch: crewSuggestion.patch,
      },
    ],
  })
  const crewChannels = [
    { label: '现压', count: 0, tone: 'muted' },
    { label: '待办', count: 0, tone: 'muted' },
    { label: '待审查', count: 3, tone: 'warn' },
    { label: '完成', count: 1, tone: 'done' },
  ]
  const crewAgents = [
    { id: '@screenplay-director', label: '导演控场', detail: '读取当前 graph state，拆解章节节奏', Icon: Bot, active: true },
    { id: '@story-state', label: '状态机记录', detail: '把 agent 输出写入 graph event', Icon: GitBranch, active: false },
    { id: '@continuity-reader', label: '连续性读者', detail: '检查人物、伏笔和章节断链', Icon: ShieldCheck, active: false },
    { id: '@plm-bridge', label: 'PLM 桥接', detail: '把章节建议同步到长上下文生成', Icon: ScrollText, active: false },
  ]
  const crewMoments = [
    {
      id: 'moment-director',
      agent: '@screenplay-director',
      time: 'runtime',
      level: 'high',
      visibility: '公开',
      title: crewSuggestion.title,
      body: crewSuggestion.body,
      source: 'drama.graph.current_state',
      chips: ['graph event', 'chapter-runtime', 'pacing'],
      patchLabel: crewSuggestion.patch.fields[0]?.text ?? 'pending patch',
    },
    {
      id: 'moment-state',
      agent: '@story-state',
      time: 'queued',
      level: 'medium',
      visibility: '内部',
      title: '状态机缺口',
      body: 'Graph 里已有章节与人物节点，但 Crew 输出需要优先绑定到 chapter_next_gap，避免散文本漂在面板里。',
      source: 'drama.graph.diagnostics',
      chips: ['state machine', 'binding', 'diagnostics'],
      patchLabel: '新增 crew.taskBinding.upserted 事件',
    },
  ]
  const crewDirectorQueue = [
    { state: '完成', label: '读取当前 Drama Graph', Icon: CheckCircle2 },
    { state: '风险', label: '章节链 next 仍有缺口', Icon: TriangleAlert },
    { state: '待审', label: '把建议写回 graph event', Icon: Clock3 },
    { state: '观察', label: '等待 PLM 章节生成状态', Icon: Activity },
  ]

  React.useEffect(() => {
    normalizeShellLocation(surface)
  }, [surface])

  React.useEffect(() => {
    const handlePopState = () => {
      setSurface(getInitialSurface())
      setZenHost(isZenHost())
    }
    globalThis.addEventListener?.('popstate', handlePopState)
    return () => globalThis.removeEventListener?.('popstate', handlePopState)
  }, [])

  React.useEffect(() => {
    let disposed = false
    let interval: ReturnType<typeof globalThis.setInterval> | undefined

    const refresh = async () => {
      try {
        const status = await runtimeClient.getStatus()
        if (!disposed) setRuntimeStatus(status)
      } catch (error) {
        if (!disposed) {
          setRuntimeStatus(offlineRuntimeStatus(error instanceof Error ? error.message : String(error)))
        }
      }
    }

    void refresh()
    interval = globalThis.setInterval(refresh, 5000)
    return () => {
      disposed = true
      if (interval !== undefined) globalThis.clearInterval(interval)
    }
  }, [crewRoom, runtimeClient])

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'drama:host-theme') return
      const variables = event.data.theme?.variables
      if (!variables || typeof variables !== 'object') return
      document.documentElement.dataset.host = 'zen'
      for (const [key, value] of Object.entries(variables)) {
        if (typeof key === 'string' && key.startsWith('--zen-') && typeof value === 'string') {
          document.documentElement.style.setProperty(key, value.trim())
        }
      }
    }
    globalThis.addEventListener?.('message', handleMessage)
    return () => globalThis.removeEventListener?.('message', handleMessage)
  }, [])

  const switchSurface = React.useCallback((next: Surface) => {
    setSurface(next)
    const params = new URLSearchParams()
    if (zenHost) params.set('host', 'zen')
    if (runtimeBaseUrl !== 'http://127.0.0.1:3198') params.set('runtime', runtimeBaseUrl)
    const search = params.toString() ? `?${params.toString()}` : ''
    globalThis.history?.pushState?.({}, '', `${getShellBasePath()}/${next}${search}`)
  }, [runtimeBaseUrl, zenHost])

  const writeCrewSuggestion = React.useCallback(() => {
    void (async () => {
      try {
        await runtimeClient.request('drama:crew:suggestionCreate', {
          nodeId: 'story-thesis',
          agentId: 'screenplay-director',
          title: '章节节奏建议',
          body: '第 1 章应先建立开源黄金年代，再进入 AgentOS 的状态机工作台。',
          patch: {
            fields: [{ key: 'pacing', text: '先历史叙事，再技术转场' }],
          },
        })
        await runtimeClient.request('drama:crew:agentOutputRecord', {
          nodeId: 'story-thesis',
          agentId: 'screenplay-director',
          roomId: crewRoom,
          title: '导演控场输出',
          body: '第 1 章应先建立开源黄金年代，再进入 AgentOS 的状态机工作台。',
          outputType: 'proposal',
          artifacts: [
            {
              type: 'graph.patch',
              patch: {
                fields: [{ key: 'pacing', text: '先历史叙事，再技术转场' }],
              },
            },
          ],
        })
        setCrewWriteStatus(`已写入 ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        setCrewWriteStatus(`写入失败：${error instanceof Error ? error.message : String(error)}`)
      }
    })()
  }, [runtimeClient])

  const activeSurface = surfaces.find((item) => item.id === surface) ?? surfaces[0]!
  const runtimeStateLabel = runtimeStatus.state === 'ready' ? 'ready' : runtimeStatus.state
  const hostKind = browserHost.getInfo().kind

  const probes = (
    <StyleReadinessProbes
      cssProbeRef={cssProbeRef}
      tailwindProbeRef={tailwindProbeRef}
    />
  )

  if (styleReadiness !== 'ready') {
    return (
      <>
        {probes}
        <StyleFailurePanel state={styleReadiness} />
      </>
    )
  }

  return (
    <>
      {probes}
      <DramaWorkbenchShell
        surface={surface}
        surfaces={surfaces}
        activeSurface={activeSurface}
        zenHost={zenHost}
        hostKind={hostKind}
        runtimeStatus={runtimeStatus}
        runtimeStateLabel={runtimeStateLabel}
        onSwitchSurface={switchSurface}
      >
        {surface === 'graph' ? (
          <StoryletNativeGraphContainer
            tool={{
              title: 'Drama Graph',
              url: `${runtimeBaseUrl}/app/graph`,
            }}
            api={graphApi}
            onOpenPlmChapter={() => {
              switchSurface('plm')
            }}
          />
        ) : null}

        {surface === 'plm' ? (
          <PlotPilotNativeContainer api={plmApi} />
        ) : null}

        {surface === 'crew' ? (
          <section className="drama-crew-surface">
            <aside className="drama-crew-rail" aria-label="Skill Crew navigation">
              <Button variant="outline" size="sm" className="drama-crew-new-chat">
                <MessageSquareText className="drama-crew-inline-icon" />
                新建会话
              </Button>

              <div className="drama-crew-nav-block">
                <div className="drama-panel-kicker">所有会话</div>
                <div className="drama-crew-channel-list">
                  {crewChannels.map((item) => (
                    <button key={item.label} type="button" className="drama-crew-channel" data-tone={item.tone}>
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="drama-crew-nav-block">
                <div className="drama-panel-kicker">数据源</div>
                <div className="drama-crew-source-row">
                  <Database className="drama-crew-inline-icon" />
                  <span>Drama Graph</span>
                </div>
                <div className="drama-crew-source-row">
                  <FolderOpen className="drama-crew-inline-icon" />
                  <span>.drama / graph-events</span>
                </div>
              </div>

              <div className="drama-crew-nav-block drama-crew-tree-block">
                <div className="drama-panel-kicker">Crew Tree</div>
                <div className="drama-crew-room">{crewRoom}</div>
                <div className="drama-crew-agent-list">
                  {crewAgents.map((agent) => {
                    const AgentIcon = agent.Icon
                    return (
                      <button key={agent.id} type="button" className="drama-crew-agent-card" data-active={agent.active ? 'true' : 'false'}>
                        <AgentIcon className="drama-crew-agent-icon" />
                        <span>
                          <span className="drama-crew-agent-name">{agent.id}</span>
                          <span className="drama-crew-agent-detail">{agent.detail}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            <main className="drama-crew-stage" aria-label="Skill Crew moment feed">
              <header className="drama-crew-stage-header">
                <div className="drama-crew-room-title">
                  <span>#screenplay</span>
                  <small>导演控场 / graph state room</small>
                </div>
                <div className="drama-crew-stage-actions">
                  <Button variant="outline" size="sm" className="drama-crew-ghost-button">
                    <Radio className="drama-crew-inline-icon" />
                    导演控场
                  </Button>
                  <Button size="sm" onClick={writeCrewSuggestion} className="drama-primary-button">
                    <GitBranch className="drama-crew-inline-icon" />
                    写入 Event
                  </Button>
                </div>
              </header>

              <nav className="drama-crew-tabs" aria-label="Crew views">
                <Button variant="ghost" size="xs">聊天</Button>
                <Button variant="ghost" size="xs" data-active="true">朋友圈</Button>
                <Button variant="ghost" size="xs">AgentOS</Button>
              </nav>

              <div className="drama-crew-feed">
                {crewMoments.map((moment) => (
                  <article key={moment.id} className="drama-crew-event-card" data-level={moment.level}>
                    <div className="drama-crew-event-avatar">
                      <Bot className="drama-crew-inline-icon" />
                    </div>
                    <div className="drama-crew-event-body">
                      <div className="drama-crew-event-header">
                        <span>{moment.agent}</span>
                        <span>{moment.time}</span>
                        <span className="drama-crew-event-chip">{moment.visibility}</span>
                      </div>
                      <h3>{moment.title}</h3>
                      <p>{moment.body}</p>
                      <div className="drama-crew-source-pill">
                        <Network className="drama-crew-inline-icon" />
                        {moment.source}
                      </div>
                      <div className="drama-crew-event-patch">
                        <div className="drama-crew-event-field">
                          <span>graph patch</span>
                          <strong>{moment.patchLabel}</strong>
                        </div>
                      </div>
                      <div className="drama-crew-chip-row">
                        {moment.chips.map((chip) => <span key={chip}>{chip}</span>)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </main>

            <aside className="drama-crew-control" aria-label="Director control panel">
              <section className="drama-crew-control-card">
                <div className="drama-crew-control-title">
                  <Radio className="drama-crew-inline-icon" />
                  <span>AgentOS 状态</span>
                  <StatusBadge
                    tone={runtimeStatus.state === 'ready' ? 'success' : runtimeStatus.state === 'starting' ? 'info' : 'danger'}
                    dot
                    title={runtimeStatus.message}
                  >
                    {runtimeStateLabel}
                  </StatusBadge>
                </div>
                <div className="drama-crew-control-subtitle">{crewWriteStatus}</div>
                <div className="drama-crew-director-list">
                  {crewDirectorQueue.map((item) => {
                    const ItemIcon = item.Icon
                    return (
                      <div key={item.label} className="drama-crew-director-item" data-state={item.state}>
                        <ItemIcon className="drama-crew-inline-icon" />
                        <span>{item.state}</span>
                        <strong>{item.label}</strong>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="drama-crew-control-card drama-crew-panel-code">
                <div className="drama-crew-control-title">
                  <ListChecks className="drama-crew-inline-icon" />
                  <span>Graph Event Trace</span>
                </div>
                <div className="drama-crew-trace-actions">
                  <RefreshCw className="drama-crew-trace-icon" />
                  <span>structured event preview</span>
                </div>
                <pre>{JSON.stringify({ suggestion: crewEvent, agentOutput: crewAgentOutputEvent }, null, 2)}</pre>
              </section>
            </aside>
          </section>
        ) : null}
      </DramaWorkbenchShell>
    </>
  )
}
