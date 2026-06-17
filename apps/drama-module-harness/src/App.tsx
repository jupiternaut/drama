import * as React from 'react'

import { createSkillCrewSuggestionEvent, inferSkillCrewRoomId } from '@drama/crew'
import { StoryletNativeGraphContainer } from '@drama/graph-ui'
import { createBrowserHostApi } from '@drama/host'
import {
  PlotPilotNativePage,
  type PlotPilotBibleEditorData,
  type PlotPilotChapterEditor,
  type PlotPilotLogEntry,
  type PlotPilotNativeFeatureState,
  type PlotPilotNovel,
} from '@drama/plm-ui'

import { mockGraphApi } from './mock-graph-api'

type Surface = 'graph' | 'plm' | 'crew'

const surfaces: Array<{ id: Surface; title: string; subtitle: string }> = [
  { id: 'graph', title: 'Drama Graph', subtitle: 'Graph UI + in-memory host API' },
  { id: 'plm', title: 'Drama PLM', subtitle: 'PLM UI + mock runtime state' },
  { id: 'crew', title: 'Skill Crew', subtitle: 'Crew public API + graph event contract' },
]

const mockNovel: PlotPilotNovel = {
  id: 'novel-harness',
  title: '开源史诗',
  author: 'Drama Module Harness',
  status: 'draft',
  wordCount: 1280,
  chapterCount: 1,
  beatCount: 3,
  updatedAt: new Date().toLocaleString(),
  lockedGenre: '技术史诗',
  lockedWorldPreset: '近未来创作系统',
  lockedStoryStructure: '六轮角色预演',
  lockedPacingControl: '中速推进',
  lockedWritingStyle: '冷静、纪实、史诗感',
  targetChapters: 12,
  targetWordsPerChapter: 2200,
  autoApproveMode: false,
  bible: {
    logline: '一群开发者把散落的工具重构成可记忆、可协作、可演出的 AgentOS。',
    world: '开源社区、桌面工作台、长上下文记忆层和状态机画布共同构成叙事舞台。',
    themes: ['协作', '记忆', '工具', '创作系统'],
    characters: ['导演', 'PLM', 'Graph', 'Skill Crew'],
    constraints: ['所有 agent 输出必须写成 graph event'],
  },
  chapters: [
    {
      id: 'chapter-runtime',
      number: 1,
      title: '石头开始说话',
      status: 'draft',
      wordCount: 1280,
      updatedAt: new Date().toLocaleString(),
      generationHint: '从开源黄金年代写到本地 agent runtime。',
    },
  ],
  beats: [
    { id: 'beat-1', title: '工具获得记忆', status: 'ready', summary: '文件、上下文和状态机被合并。' },
    { id: 'beat-2', title: '导演控场', status: 'ready', summary: 'Crew 读取 graph state 并提出建议。' },
  ],
}

const mockBible: PlotPilotBibleEditorData = {
  id: 'bible-harness',
  novel_id: mockNovel.id,
  characters: [
    { name: '导演', role: '控场者', voice: '克制、明确、重视边界' },
    { name: 'Graph', role: '状态机', voice: '结构化、可追踪' },
  ],
  world_settings: [
    { name: 'Drama 工作台', description: '一个把 Graph、PLM、Crew 并列集成的本地桌面系统。' },
  ],
  locations: [
    { name: '画布', description: '节点、边、章节、任务和草稿汇合的地方。' },
  ],
  timeline_notes: [
    { event: '模块剥离', description: 'Electron 从业务中心降级为 host shell。' },
  ],
  style_notes: [
    { category: '文风', note: '中文技术叙事，避免营销腔。' },
  ],
  style: 'Drama 深色工作台风格。',
}

const mockChapter: PlotPilotChapterEditor = {
  novelId: mockNovel.id,
  chapterNumber: 1,
  chapterId: 'chapter-runtime',
  title: '石头开始说话',
  status: 'draft',
  wordCount: 1280,
  content: '开源的故事得从很远的地方讲起。工具先是脚本，后来成为协作者，最后开始记住每一次选择。',
  generationHint: '强调长上下文、状态机和本地文件记忆的融合。',
  dirty: false,
  loading: false,
}

const mockLogs: PlotPilotLogEntry[] = [
  { id: 'log-1', level: 'success', time: 'harness', message: 'PLM UI 已脱离 Electron preload 加载。' },
  { id: 'log-2', level: 'info', time: 'harness', message: '当前 runtime 为 mock，用于验证 UI host contract。' },
]

const mockFeatureState: PlotPilotNativeFeatureState = {
  lastMessage: 'Module harness loaded with mock PLM state.',
  plotOutline: {
    stages: ['工具诞生', '记忆出现', '导演控场'],
  },
  knowledgeStats: {
    entities: 4,
    triples: 8,
    source: 'mock',
  },
}

const browserHost = createBrowserHostApi({
  name: 'Drama Module Harness',
  version: '0.1.0',
})

function appendLog(setLogs: React.Dispatch<React.SetStateAction<PlotPilotLogEntry[]>>, message: string) {
  setLogs((current) => [
    { id: `log-${Date.now()}`, level: 'info', time: new Date().toLocaleTimeString(), message },
    ...current,
  ])
}

export function App() {
  const [surface, setSurface] = React.useState<Surface>('graph')
  const [logs, setLogs] = React.useState(mockLogs)
  const crewRoom = inferSkillCrewRoomId({
    slug: 'screenplay-director',
    path: 'C:/Users/gengr/.codex/skills/screenplay-director',
    metadata: {
      name: '导演控场',
      description: 'screenplay graph state director',
    },
  })
  const crewEvent = createSkillCrewSuggestionEvent({
    nodeId: 'chapter-runtime',
    agentId: 'screenplay-director',
    title: '章节节奏建议',
    body: '第 1 章应先建立开源黄金年代，再进入 AgentOS 的状态机工作台。',
    patch: {
      fields: [{ key: 'pacing', text: '先历史叙事，再技术转场' }],
    },
  })

  return (
    <div className="harness-shell">
      <aside className="harness-sidebar">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/38">Drama Modules</div>
          <div className="mt-2 text-xl font-semibold text-white">解耦验证台</div>
          <div className="mt-1 text-xs leading-5 text-white/48">不加载 Electron preload，只验证 package public API。</div>
        </div>

        <div className="space-y-2">
          {surfaces.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSurface(item.id)}
              className={[
                'w-full rounded-[7px] border px-3 py-2 text-left transition-colors',
                surface === item.id
                  ? 'border-white/16 bg-white/[0.09] text-white'
                  : 'border-white/[0.07] bg-white/[0.03] text-white/64 hover:bg-white/[0.06]',
              ].join(' ')}
            >
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="mt-1 text-[11px] text-white/42">{item.subtitle}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[7px] border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-xs leading-5 text-emerald-100/80">
          当前 host: {browserHost.getInfo().kind} / {browserHost.getInfo().name}
          <br />
          UI package 通过 props 接收 host 能力，不直接调用 Electron。
        </div>
      </aside>

      <main className="harness-main">
        {surface === 'graph' ? (
          <StoryletNativeGraphContainer
            tool={{
              title: 'Drama Graph',
              url: 'memory://drama-module-harness/graph',
            }}
            api={mockGraphApi}
            onOpenPlmChapter={(request) => {
              appendLog(setLogs, `Graph requested PLM chapter open: ${request.chapterId ?? request.graphNodeId}`)
              setSurface('plm')
            }}
          />
        ) : null}

        {surface === 'plm' ? (
          <PlotPilotNativePage
            runtimeStatus={{
              state: 'ready',
              message: 'Mock PLM runtime ready',
              endpoint: 'mock://plotpilot',
              updatedAt: new Date().toISOString(),
            }}
            novels={[mockNovel]}
            selectedNovel={mockNovel}
            selectedBibleData={mockBible}
            chapterEditor={mockChapter}
            logs={logs}
            featureState={mockFeatureState}
            codexStatus={{
              available: true,
              authenticated: true,
              email: 'codex-oauth@example.local',
              planType: 'ChatGPT OAuth mock',
            }}
            projectGuardStatus={{
              writingSpecId: 'spec-harness',
              writingSpecTitle: 'Drama 中文技术叙事规范',
              humanizerEnabled: true,
              humanizerPolicy: 'fallback_original',
            }}
            handlers={{
              onStartEngine: () => appendLog(setLogs, 'Mock engine start requested.'),
              onRestartEngine: () => appendLog(setLogs, 'Mock engine restart requested.'),
              onGenerateChapter: (_novelId, chapterNumber) => appendLog(setLogs, `Mock generate chapter ${chapterNumber ?? 1}.`),
              onSaveChapter: (_novelId, chapterNumber) => appendLog(setLogs, `Mock save chapter ${chapterNumber}.`),
              onWriteBackChapter: (_novelId, chapterNumber) => appendLog(setLogs, `Mock write back chapter ${chapterNumber ?? 1} to Graph.`),
              onRefreshMemory: () => appendLog(setLogs, 'Mock memory refresh requested.'),
            }}
          />
        ) : null}

        {surface === 'crew' ? (
          <section className="flex h-full min-h-0 flex-col rounded-[8px] border border-white/[0.08] bg-[#090a10] p-5 text-white">
            <header className="border-b border-white/[0.08] pb-4">
              <div className="text-sm font-semibold">Skill Crew Public API</div>
              <div className="mt-1 text-xs text-white/48">Crew room inference and graph event helpers loaded without Electron.</div>
            </header>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 pt-4">
              <div className="rounded-[7px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">Room</div>
                <div className="mt-3 text-2xl font-semibold">{crewRoom}</div>
                <div className="mt-2 text-sm leading-6 text-white/58">
                  `inferSkillCrewRoomId` 根据 skill slug/path/metadata 把导演 skill 放进 screenplay room。
                </div>
              </div>
              <div className="min-h-0 rounded-[7px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/38">Graph Event</div>
                <pre className="mt-3 max-h-[70vh] overflow-auto rounded-[6px] bg-black/35 p-3 text-xs leading-5 text-white/72">
                  {JSON.stringify(crewEvent, null, 2)}
                </pre>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
