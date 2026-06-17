import { describe, expect, it } from 'bun:test'
import {
  createPlotPilotClient,
  extractPlotPilotWritingSpecFailure,
  PlotPilotHttpError,
} from '../client.ts'

type FetchCall = {
  url: string
  init: RequestInit | undefined
}

function createFetchStub(
  responder: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const fetchStub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
    calls.push({ url, init })
    return responder(url, init)
  }
  return { fetch: fetchStub as typeof fetch, calls }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function streamResponse(body: string, contentType: string): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body))
        controller.close()
      },
    }),
    { headers: { 'Content-Type': contentType } },
  )
}

describe('createPlotPilotClient', () => {
  it('derives /health from an API v1 base URL and keeps API calls under /api/v1', async () => {
    const { fetch, calls } = createFetchStub((url) => {
      if (url.endsWith('/health')) {
        return jsonResponse({
          status: 'healthy',
          version: '4.5.1',
          build_id: 'dev',
          uptime_seconds: 12,
          daemon_process: { running: true, pid: 1234 },
        })
      }
      return jsonResponse([])
    })
    const client = createPlotPilotClient({
      baseUrl: 'http://127.0.0.1:8123/api/v1',
      fetch,
    })

    await expect(client.health()).resolves.toMatchObject({ status: 'healthy' })
    await expect(client.listNovels()).resolves.toEqual([])

    expect(calls.map(call => call.url)).toEqual([
      'http://127.0.0.1:8123/health',
      'http://127.0.0.1:8123/api/v1/novels/',
    ])
  })

  it('accepts a port target for JSON create/read calls', async () => {
    const createdNovel = {
      id: 'novel-1',
      title: 'Test Novel',
      author: 'Tester',
      target_chapters: 12,
      stage: 'planning',
      premise: '',
      chapters: [],
      total_word_count: 0,
    }
    const { fetch, calls } = createFetchStub((url) => {
      if (url.endsWith('/novels/')) return jsonResponse(createdNovel, 201)
      return jsonResponse({
        id: 'bible-1',
        novel_id: 'novel 1',
        characters: [],
        world_settings: [],
        locations: [],
        timeline_notes: [],
        style_notes: [],
      })
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.createNovel({
      novel_id: 'novel-1',
      title: 'Test Novel',
      author: 'Tester',
      target_chapters: 12,
    })).resolves.toEqual(createdNovel)
    await expect(client.getBible('novel 1')).resolves.toMatchObject({ novel_id: 'novel 1' })

    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:8005/api/v1/novels/',
      init: { method: 'POST' },
    })
    expect(calls[0]?.init?.body).toBe(JSON.stringify({
      novel_id: 'novel-1',
      title: 'Test Novel',
      author: 'Tester',
      target_chapters: 12,
    }))
    expect(calls[1]?.url).toBe('http://127.0.0.1:8005/api/v1/bible/novels/novel%201/bible')
  })

  it('covers chapter, bible status, and beat sheet JSON endpoints', async () => {
    const chapter = {
      id: 'chapter-novel-1-1',
      number: 1,
      title: '第一章',
      content: '',
      word_count: 0,
      novel_id: 'novel-1',
      status: 'draft',
    }
    const beatSheet = {
      id: 'beat-1',
      chapter_id: chapter.id,
      scenes: [{
        title: '便利店门口',
        goal: '压缩 token 债务危机',
        pov_character: '顾临川',
        location: '便利店',
        tone: '压迫',
        estimated_words: 900,
        order_index: 0,
      }],
      total_scenes: 1,
      total_estimated_words: 900,
    }
    const { fetch, calls } = createFetchStub((url, init) => {
      if (url.endsWith('/bible/status')) return jsonResponse({ exists: true, ready: true, novel_id: 'novel-1' })
      if (url.endsWith('/chapters') && init?.method === 'GET') return jsonResponse([chapter])
      if (url.endsWith('/chapters/1') && init?.method === 'GET') return jsonResponse(chapter)
      if (url.endsWith('/chapters/1/ensure')) return jsonResponse(chapter)
      if (url.endsWith('/chapters/1/micro-beats')) return jsonResponse({ ok: true, chapter_number: 1, count: 1 })
      if (url.endsWith('/chapters/1') && init?.method === 'PUT') return jsonResponse({ ...chapter, content: '正文', word_count: 2 })
      if (url.endsWith('/beat-sheets/generate')) return jsonResponse(beatSheet)
      if (url.endsWith(`/beat-sheets/${chapter.id}`)) return jsonResponse(beatSheet)
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.getBibleStatus('novel-1')).resolves.toEqual({ exists: true, ready: true, novel_id: 'novel-1' })
    await expect(client.listChapters('novel-1')).resolves.toEqual([chapter])
    await expect(client.getChapter('novel-1', 1)).resolves.toEqual(chapter)
    await expect(client.ensureChapter('novel-1', 1, { title: '第一章' })).resolves.toEqual(chapter)
    await expect(client.updateChapter('novel-1', 1, { content: '正文' })).resolves.toMatchObject({ content: '正文' })
    await expect(client.updateChapterMicroBeats('novel-1', 1, {
      micro_beats: [{ description: '门口欠费单', target_words: 900 }],
    })).resolves.toMatchObject({ ok: true, count: 1 })
    await expect(client.generateBeatSheet({
      chapter_id: chapter.id,
      outline: '顾临川在便利店门口看见欠费单。',
    })).resolves.toEqual(beatSheet)
    await expect(client.getBeatSheet(chapter.id)).resolves.toEqual(beatSheet)

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'GET http://127.0.0.1:8005/api/v1/bible/novels/novel-1/bible/status',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/chapters',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/chapters/1',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/chapters/1/ensure',
      'PUT http://127.0.0.1:8005/api/v1/novels/novel-1/chapters/1',
      'PUT http://127.0.0.1:8005/api/v1/novels/novel-1/chapters/1/micro-beats',
      'POST http://127.0.0.1:8005/api/v1/beat-sheets/generate',
      `GET http://127.0.0.1:8005/api/v1/beat-sheets/${chapter.id}`,
    ])
    expect(calls[3]?.init?.body).toBe(JSON.stringify({ title: '第一章' }))
    expect(calls[4]?.init?.body).toBe(JSON.stringify({ content: '正文' }))
    expect(calls[6]?.init?.body).toBe(JSON.stringify({
      chapter_id: chapter.id,
      outline: '顾临川在便利店门口看见欠费单。',
    }))
  })

  it('parses Bible generation SSE events', async () => {
    const sse = [
      'event: phase',
      'data: {"phase":"init","message":"start"}',
      '',
      'event: data',
      'data: {"type":"style_chunk","chunk":"hello"}',
      '',
      'event: done',
      'data: {"novel_id":"novel-1","message":"ok"}',
      '',
      '',
    ].join('\n')
    const { fetch, calls } = createFetchStub(() => streamResponse(sse, 'text/event-stream'))
    const client = createPlotPilotClient({ origin: 'http://127.0.0.1:8005', fetch })

    const events = []
    for await (const event of client.generateBibleStream('novel-1', { stage: 'worldbuilding' })) {
      events.push(event)
    }

    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:8005/api/v1/bible/novels/novel-1/generate-stream?stage=worldbuilding',
      init: { method: 'POST' },
    })
    expect(events).toEqual([
      { type: 'phase', phase: 'init', message: 'start' },
      { type: 'data', data_type: 'style_chunk', chunk: 'hello' },
      { type: 'done', novel_id: 'novel-1', message: 'ok' },
    ])
  })

  it('posts and parses chapter generation SSE events', async () => {
    const sse = [
      'data: {"type":"phase","phase":"planning","message":"准备上下文"}',
      '',
      'data: {"type":"llm_chunk","stage":"outline_partition","text":"[{\\"description\\":\\"开场\\"}]"}',
      '',
      'data: {"type":"beats_generated","beats":[{"description":"便利店门口","target_words":900,"focus":"conflict"}]}',
      '',
      'data: {"type":"chunk","text":"第一段正文","stats":{"chars":5,"chunks":1,"estimated_tokens":3}}',
      '',
      'data: {"type":"done","content":"第一段正文","consistency_report":{"issues":[],"warnings":[],"suggestions":["ok"]},"token_count":3,"output_tokens":3,"total_tokens":9,"chars":5}',
      '',
      '',
    ].join('\n')
    const { fetch, calls } = createFetchStub(() => streamResponse(sse, 'text/event-stream'))
    const client = createPlotPilotClient({ origin: 'http://127.0.0.1:8005', fetch })

    const events = []
    for await (const event of client.generateChapterStream('novel-1', {
      chapter_number: 1,
      outline: '顾临川在便利店门口看见欠费单。',
    })) {
      events.push(event)
    }

    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:8005/api/v1/novels/novel-1/generate-chapter-stream',
      init: { method: 'POST' },
    })
    expect(calls[0]?.init?.body).toBe(JSON.stringify({
      chapter_number: 1,
      outline: '顾临川在便利店门口看见欠费单。',
    }))
    expect(events).toEqual([
      { type: 'phase', phase: 'planning', message: '准备上下文' },
      { type: 'llm_chunk', stage: 'outline_partition', text: '[{"description":"开场"}]' },
      {
        type: 'beats_generated',
        beats: [{ description: '便利店门口', target_words: 900, focus: 'conflict' }],
      },
      {
        type: 'chunk',
        text: '第一段正文',
        stats: { chars: 5, chunks: 1, estimated_tokens: 3 },
      },
      {
        type: 'done',
        content: '第一段正文',
        consistency_report: { issues: [], warnings: [], suggestions: ['ok'] },
        token_count: 3,
        output_tokens: 3,
        total_tokens: 9,
        chars: 5,
      },
    ])
  })

  it('posts and parses hosted write SSE events without stopping on per-chapter done', async () => {
    const sse = [
      'data: {"type":"session","from_chapter":1,"to_chapter":2}',
      '',
      'data: {"type":"chapter_start","chapter":1,"title":"第一章"}',
      '',
      'data: {"type":"chunk","chapter":1,"text":"第一章正文","stats":{"chars":5,"chunks":1,"estimated_tokens":3}}',
      '',
      'data: {"type":"saved","chapter":1,"chapter_id":"chapter-1","word_count":5}',
      '',
      'data: {"type":"chapter_start","chapter":2,"title":"第二章"}',
      '',
      'data: {"type":"session_done","saved":2,"chapters":[1,2]}',
      '',
      '',
    ].join('\n')
    const { fetch, calls } = createFetchStub(() => streamResponse(sse, 'text/event-stream'))
    const client = createPlotPilotClient({ origin: 'http://127.0.0.1:8005', fetch })

    const events = []
    for await (const event of client.hostedWriteStream('novel-1', {
      from_chapter: 1,
      to_chapter: 2,
      auto_save: true,
      auto_outline: true,
    })) {
      events.push(event)
    }

    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:8005/api/v1/novels/novel-1/hosted-write-stream',
      init: { method: 'POST' },
    })
    expect(calls[0]?.init?.body).toBe(JSON.stringify({
      from_chapter: 1,
      to_chapter: 2,
      auto_save: true,
      auto_outline: true,
    }))
    expect(events.map((event) => event.type)).toEqual([
      'session',
      'chapter_start',
      'chunk',
      'saved',
      'chapter_start',
      'session_done',
    ])
  })

  it('covers v4.6 Autopilot control endpoints and log stream', async () => {
    const sse = [
      'data: {"type":"connected","message":"日志流已连接","metadata":{"current_stage":"writing"}}',
      '',
      'data: {"type":"progress","message":"第 1 章写作中","metadata":{"current_chapter_number":1}}',
      '',
      'data: {"type":"paused_for_review","message":"等待人工确认"}',
      '',
      '',
    ].join('\n')
    const { fetch, calls } = createFetchStub((url) => {
      if (url.endsWith('/status')) {
        return jsonResponse({
          autopilot_status: 'running',
          current_stage: 'writing',
          current_chapter_number: 1,
        })
      }
      if (url.endsWith('/start')) return jsonResponse({ success: true, autopilot_status: 'running' })
      if (url.endsWith('/stop')) return jsonResponse({ success: true, message: '自动驾驶已停止' })
      if (url.endsWith('/resume')) return jsonResponse({ success: true, current_stage: 'writing' })
      if (url.endsWith('/circuit-breaker')) return jsonResponse({ status: 'closed', error_count: 0, max_errors: 3 })
      if (url.endsWith('/circuit-breaker/reset')) return jsonResponse({ success: true, message: '熔断计数已清零' })
      if (url.includes('/stream?after_seq=9')) return streamResponse(sse, 'text/event-stream')
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.getAutopilotStatus('novel-1')).resolves.toMatchObject({ current_stage: 'writing' })
    await expect(client.startAutopilot('novel-1', {
      max_auto_chapters: 8,
      target_chapters: 24,
      target_words_per_chapter: 2500,
    })).resolves.toMatchObject({ autopilot_status: 'running' })
    await expect(client.stopAutopilot('novel-1')).resolves.toMatchObject({ success: true })
    await expect(client.resumeAutopilot('novel-1')).resolves.toMatchObject({ current_stage: 'writing' })
    await expect(client.getAutopilotCircuitBreaker('novel-1')).resolves.toMatchObject({ status: 'closed' })
    await expect(client.resetAutopilotCircuitBreaker('novel-1')).resolves.toMatchObject({ success: true })

    const events = []
    for await (const event of client.autopilotLogStream('novel-1', 9)) {
      events.push(event)
    }

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'GET http://127.0.0.1:8005/api/v1/autopilot/novel-1/status',
      'POST http://127.0.0.1:8005/api/v1/autopilot/novel-1/start',
      'POST http://127.0.0.1:8005/api/v1/autopilot/novel-1/stop',
      'POST http://127.0.0.1:8005/api/v1/autopilot/novel-1/resume',
      'GET http://127.0.0.1:8005/api/v1/autopilot/novel-1/circuit-breaker',
      'POST http://127.0.0.1:8005/api/v1/autopilot/novel-1/circuit-breaker/reset',
      'GET http://127.0.0.1:8005/api/v1/autopilot/novel-1/stream?after_seq=9',
    ])
    expect(calls[1]?.init?.body).toBe(JSON.stringify({
      max_auto_chapters: 8,
      target_chapters: 24,
      target_words_per_chapter: 2500,
    }))
    expect(events.map((event) => event.type)).toEqual(['connected', 'progress', 'paused_for_review'])
    expect(events[1]).toMatchObject({
      message: '第 1 章写作中',
      metadata: { current_chapter_number: 1 },
    })
  })

  it('covers v4.6 setup wizard streams, outline save, and auto approve toggle', async () => {
    const optionsSse = [
      'data: {"type":"phase","phase":"plot_options","message":"正在生成叙事结构"}',
      '',
      'data: {"type":"approval_required","session_id":"session-main","status":"awaiting_acceptance","next_action":"review"}',
      '',
      '',
    ].join('\n')
    const outlineSse = [
      'data: {"type":"phase","phase":"plot_outline","message":"正在生成剧情总纲"}',
      '',
      'data: {"type":"done","plot_outline":{"core_conflict":"债务","stage_plan":[]},"invocation_session_id":"session-outline"}',
      '',
      '',
    ].join('\n')
    const { fetch, calls } = createFetchStub((url, init) => {
      if (url.endsWith('/auto-approve-mode')) return jsonResponse({
        id: 'novel-1',
        title: 'Drama',
        author: 'Tester',
        target_chapters: 24,
        stage: 'planning',
        chapters: [],
        total_word_count: 0,
        auto_approve_mode: true,
      })
      if (url.endsWith('/setup/suggest-main-plot-options-stream')) return streamResponse(optionsSse, 'text/event-stream')
      if (url.endsWith('/setup/suggest-main-plot-options')) {
        return jsonResponse({
          plot_options: [{ id: 'main-1', title: '债务主线', logline: '以记忆债务推动主角。' }],
          invocation_session_id: 'session-main',
        })
      }
      if (url.endsWith('/setup/generate-plot-outline-stream')) return streamResponse(outlineSse, 'text/event-stream')
      if (url.endsWith('/setup/plot-outline') && init?.method === 'PUT') {
        return jsonResponse({ plot_outline: { core_conflict: '债务', stage_plan: [] } })
      }
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.setNovelAutoApproveMode('novel-1', true)).resolves.toMatchObject({ auto_approve_mode: true })
    await expect(client.suggestMainPlotOptions('novel-1')).resolves.toMatchObject({
      plot_options: [{ id: 'main-1', title: '债务主线' }],
    })
    await expect(client.savePlotOutline('novel-1', {
      plot_outline: {
        core_conflict: '债务',
        main_story_overview: '主角清偿记忆债务。',
        expected_ending: '完成偿还。',
        stage_plan: [],
      },
    })).resolves.toMatchObject({ plot_outline: { core_conflict: '债务' } })

    const optionEvents = []
    for await (const event of client.suggestMainPlotOptionsStream('novel-1')) {
      optionEvents.push(event)
    }
    const outlineEvents = []
    for await (const event of client.generatePlotOutlineStream('novel-1')) {
      outlineEvents.push(event)
    }

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'PATCH http://127.0.0.1:8005/api/v1/novels/novel-1/auto-approve-mode',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/setup/suggest-main-plot-options',
      'PUT http://127.0.0.1:8005/api/v1/novels/novel-1/setup/plot-outline',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/setup/suggest-main-plot-options-stream',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/setup/generate-plot-outline-stream',
    ])
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ auto_approve_mode: true }))
    expect(calls[2]?.init?.body).toBe(JSON.stringify({
      plot_outline: {
        core_conflict: '债务',
        main_story_overview: '主角清偿记忆债务。',
        expected_ending: '完成偿还。',
        stage_plan: [],
      },
    }))
    expect(optionEvents).toEqual([
      { type: 'phase', phase: 'plot_options', message: '正在生成叙事结构' },
      { type: 'approval_required', session_id: 'session-main', status: 'awaiting_acceptance', next_action: 'review' },
    ])
    expect(outlineEvents).toEqual([
      { type: 'phase', phase: 'plot_outline', message: '正在生成剧情总纲' },
      {
        type: 'done',
        plot_outline: { core_conflict: '债务', stage_plan: [] },
        invocation_session_id: 'session-outline',
      },
    ])
  })

  it('covers v4.6 Autopilot status and chapter streams', async () => {
    const statusSse = [
      'data: {"type":"status","autopilot_status":"running","current_stage":"writing","progress_pct":12.5}',
      '',
      'data: {"type":"autopilot_stopped","message":"自动驾驶已停止"}',
      '',
      '',
    ].join('\n')
    const chapterSse = [
      'data: {"type":"connected","message":"章节内容流已连接"}',
      '',
      'data: {"type":"chapter_start","message":"开始撰写第 1 章正文","metadata":{"chapter_number":1}}',
      '',
      'data: {"type":"chapter_chunk","message":"","metadata":{"chunk":"第一段","beat_index":0}}',
      '',
      'data: {"type":"paused_for_review","message":"等待审阅确认"}',
      '',
      '',
    ].join('\n')
    const { fetch, calls } = createFetchStub((url) => {
      if (url.endsWith('/events')) return streamResponse(statusSse, 'text/event-stream')
      if (url.endsWith('/chapter-stream')) return streamResponse(chapterSse, 'text/event-stream')
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    const statusEvents = []
    for await (const event of client.autopilotEventsStream('novel-1')) {
      statusEvents.push(event)
    }
    const chapterEvents = []
    for await (const event of client.autopilotChapterStream('novel-1')) {
      chapterEvents.push(event)
    }

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'GET http://127.0.0.1:8005/api/v1/autopilot/novel-1/events',
      'GET http://127.0.0.1:8005/api/v1/autopilot/novel-1/chapter-stream',
    ])
    expect(statusEvents.map((event) => event.type)).toEqual(['status', 'autopilot_stopped'])
    expect(statusEvents[0]).toMatchObject({ current_stage: 'writing', progress_pct: 12.5 })
    expect(chapterEvents.map((event) => event.type)).toEqual([
      'connected',
      'chapter_start',
      'chapter_chunk',
      'paused_for_review',
    ])
    expect(chapterEvents[2]).toMatchObject({ metadata: { chunk: '第一段', beat_index: 0 } })
  })

  it('covers v4.6 planning, review, memory, and debug endpoints', async () => {
    const { fetch, calls } = createFetchStub((url, init) => {
      if (url.endsWith('/setup/plot-outline')) return jsonResponse({ plot_outline: { core_conflict: '债务' } })
      if (url.endsWith('/setup/generate-plot-outline')) return jsonResponse({ invocation_session_id: 'session-outline' })
      if (url.endsWith('/plan')) return jsonResponse({ success: true, message: 'ok', structure_created: true, nodes_created: 3 })
      if (url.endsWith('/planning/novels/novel-1/structure')) return jsonResponse({ success: true, data: { id: 'root' } })
      if (url.endsWith('/planning/novels/novel-1/continue')) return jsonResponse({ success: true, next: 'act-2' })
      if (url.endsWith('/chapters/1/review')) return jsonResponse({ chapter_number: 1, suggestions: ['收紧节奏'], score: 88 })
      if (url.endsWith('/simulate')) return jsonResponse({ success: true, data: { overall_readability: 82 } })
      if (url.endsWith('/simulation')) return jsonResponse({ success: true, data: { overall_readability: 82 } })
      if (url.endsWith('/simulations')) return jsonResponse({ success: true, data: { novel_id: 'novel-1', chapters: [], total: 0 } })
      if (url.includes('/churn-alerts')) return jsonResponse({ success: true, data: { novel_id: 'novel-1', threshold: 60, alerts: [], total: 0 } })
      if (url.endsWith('/knowledge-graph/novels/novel-1/infer')) return jsonResponse({ success: true, data: { inferred_triples: 2 } })
      if (url.endsWith('/knowledge-graph/novels/novel-1/statistics')) return jsonResponse({ success: true, data: { total_triples: 2 } })
      if (url.endsWith('/knowledge-graph/novels/novel-1/triples')) return jsonResponse({ success: true, data: { total: 2, triples: [] } })
      if (url.includes('/knowledge-graph/novels/novel-1/search')) return jsonResponse({ success: true, data: { results: [] } })
      if (url.endsWith('/novels/novel-1/traces')) return jsonResponse({ traces: [], total: 0 })
      if (url.endsWith('/novels/novel-1/traces/stats')) return jsonResponse({ total_traces: 0, by_node_type: {}, by_operation: {}, avg_duration_ms: 0 })
      if (url.includes('/novels/novel-1/ai-traces')) return jsonResponse({ traces: [], total: 0 })
      if (url.endsWith('/novels/novel-1/traces/trace-1/timeline')) return jsonResponse({ trace_id: 'trace-1', spans: [], total: 0 })
      if (url.endsWith('/llm-control/prompts/stats')) return jsonResponse({ total: 1 })
      if (url.endsWith('/llm-control/prompts')) return jsonResponse({ prompts: [] })
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.getPlotOutline('novel-1')).resolves.toMatchObject({ plot_outline: { core_conflict: '债务' } })
    await expect(client.generatePlotOutline('novel-1')).resolves.toMatchObject({ invocation_session_id: 'session-outline' })
    await expect(client.planNovel('novel-1', { mode: 'initial' })).resolves.toMatchObject({ nodes_created: 3 })
    await expect(client.getPlanningStructure('novel-1')).resolves.toMatchObject({ data: { id: 'root' } })
    await expect(client.continuePlanning('novel-1', { current_chapter: 1 })).resolves.toMatchObject({ next: 'act-2' })
    await expect(client.reviewChapter('novel-1', 1)).resolves.toMatchObject({ score: 88 })
    await expect(client.simulateReaders('novel-1', 1)).resolves.toMatchObject({ data: { overall_readability: 82 } })
    await expect(client.getChapterSimulation('novel-1', 1)).resolves.toMatchObject({ data: { overall_readability: 82 } })
    await expect(client.listReaderSimulations('novel-1')).resolves.toMatchObject({ data: { total: 0 } })
    await expect(client.getChurnAlerts('novel-1')).resolves.toMatchObject({ data: { total: 0 } })
    await expect(client.inferKnowledgeGraph('novel-1')).resolves.toMatchObject({ data: { inferred_triples: 2 } })
    await expect(client.getKnowledgeGraphStatistics('novel-1')).resolves.toMatchObject({ data: { total_triples: 2 } })
    await expect(client.getKnowledgeGraphTriples('novel-1')).resolves.toMatchObject({ data: { total: 2 } })
    await expect(client.searchKnowledgeGraph('novel-1', { query: '债务' })).resolves.toMatchObject({ data: { results: [] } })
    await expect(client.listTraces('novel-1')).resolves.toMatchObject({ total: 0 })
    await expect(client.getTraceStats('novel-1')).resolves.toMatchObject({ total_traces: 0 })
    await expect(client.listAiTraces('novel-1')).resolves.toMatchObject({ total: 0 })
    await expect(client.getAiTraceTimeline('novel-1', 'trace-1')).resolves.toMatchObject({ trace_id: 'trace-1' })
    await expect(client.getPromptStats()).resolves.toMatchObject({ total: 1 })
    await expect(client.listPrompts()).resolves.toMatchObject({ prompts: [] })

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/setup/plot-outline',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/setup/generate-plot-outline',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/plan',
      'GET http://127.0.0.1:8005/api/v1/planning/novels/novel-1/structure',
      'POST http://127.0.0.1:8005/api/v1/planning/novels/novel-1/continue',
      'POST http://127.0.0.1:8005/api/v1/novels/novel-1/chapters/1/review',
      'POST http://127.0.0.1:8005/api/v1/reader/novels/novel-1/chapters/1/simulate',
      'GET http://127.0.0.1:8005/api/v1/reader/novels/novel-1/chapters/1/simulation',
      'GET http://127.0.0.1:8005/api/v1/reader/novels/novel-1/simulations',
      'GET http://127.0.0.1:8005/api/v1/reader/novels/novel-1/churn-alerts?threshold=60',
      'POST http://127.0.0.1:8005/api/v1/knowledge-graph/novels/novel-1/infer',
      'GET http://127.0.0.1:8005/api/v1/knowledge-graph/novels/novel-1/statistics',
      'GET http://127.0.0.1:8005/api/v1/knowledge-graph/novels/novel-1/triples',
      'POST http://127.0.0.1:8005/api/v1/knowledge-graph/novels/novel-1/search?query=%E5%80%BA%E5%8A%A1&limit=10&min_score=0.5',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/traces',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/traces/stats',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/ai-traces?limit=80',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/traces/trace-1/timeline',
      'GET http://127.0.0.1:8005/api/v1/llm-control/prompts/stats',
      'GET http://127.0.0.1:8005/api/v1/llm-control/prompts',
    ])
  })

  it('covers v4.6 Bible bulk save and AI Invocation review endpoints', async () => {
    const bible = {
      id: 'bible-1',
      novel_id: 'novel-1',
      characters: [{
        id: 'char-1',
        name: '顾临川',
        description: '欠费小说家',
        relationships: [],
      }],
      world_settings: [{
        id: 'world-1',
        name: '债务规则',
        description: '记忆以债务计价',
        setting_type: 'rule',
      }],
      locations: [],
      timeline_notes: [],
      style_notes: [],
    }
    const invocation = {
      session: {
        id: 'session-1',
        operation: 'setup.plot_outline',
        node_key: 'setup-plot-outline',
        policy: 'FULL_INTERACTIVE',
        status: 'awaiting_acceptance',
        context: { novel_id: 'novel-1' },
        metadata: {},
        attempts: ['attempt-1'],
      },
      attempt: {
        id: 'attempt-1',
        session_id: 'session-1',
        status: 'succeeded',
        content: '{"core_conflict":"债务"}',
      },
      next_action: 'acceptance_required',
    }
    const { fetch, calls } = createFetchStub((url, init) => {
      if (url.endsWith('/bible/novels/novel-1/bible') && init?.method === 'PUT') return jsonResponse(bible)
      if (url.endsWith('/ai-invocations/session-1/reject')) return jsonResponse({ ...invocation, next_action: 'cancelled' })
      if (url.endsWith('/ai-invocations/session-1/prompt-draft/preview')) {
        return jsonResponse({ prompt_snapshot: { prompt: { system: 's', user: 'u' } }, variable_plan: { aliases: {} } })
      }
      if (url.endsWith('/ai-invocations/session-1/prompt-draft')) return jsonResponse(invocation)
      if (url.endsWith('/ai-invocations/session-1/variables')) return jsonResponse(invocation)
      return jsonResponse(invocation)
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.updateBible('novel-1', {
      characters: bible.characters,
      world_settings: bible.world_settings,
      locations: [],
      timeline_notes: [],
      style_notes: [],
    })).resolves.toEqual(bible)
    await expect(client.rejectInvocation('session-1', {
      attempt_id: 'attempt-1',
      accepted_by: 'drama',
    })).resolves.toMatchObject({ next_action: 'cancelled' })
    await expect(client.previewInvocationPromptDraft('session-1', {
      system_template: 's',
      user_template: 'u',
    })).resolves.toMatchObject({ prompt_snapshot: { prompt: { system: 's', user: 'u' } } })
    await expect(client.saveInvocationPromptDraft('session-1', {
      system_template: 's',
      user_template: 'u',
    })).resolves.toMatchObject({ session: { id: 'session-1' } })
    await expect(client.updateInvocationVariables('session-1', {
      values: { outline: '债务' },
      updated_by: 'drama',
    })).resolves.toMatchObject({ session: { id: 'session-1' } })

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'PUT http://127.0.0.1:8005/api/v1/bible/novels/novel-1/bible',
      'POST http://127.0.0.1:8005/api/v1/ai-invocations/session-1/reject',
      'POST http://127.0.0.1:8005/api/v1/ai-invocations/session-1/prompt-draft/preview',
      'PUT http://127.0.0.1:8005/api/v1/ai-invocations/session-1/prompt-draft',
      'PUT http://127.0.0.1:8005/api/v1/ai-invocations/session-1/variables',
    ])
  })

  it('parses Bible generation NDJSON events', async () => {
    const ndjson = [
      JSON.stringify({ type: 'phase', phase: 'init', message: 'start' }),
      JSON.stringify({ type: 'data', data_type: 'worldbuilding_field', dimension: 'core_rules', field: 'rule', value: 'cost' }),
      JSON.stringify({ type: 'done', novel_id: 'novel-1' }),
    ].join('\n')
    const { fetch } = createFetchStub(() => streamResponse(`${ndjson}\n`, 'application/x-ndjson'))
    const client = createPlotPilotClient({ port: 8005, fetch })

    const events = []
    for await (const event of client.generateBibleStream('novel-1')) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'phase', phase: 'init', message: 'start' },
      {
        type: 'data',
        data_type: 'worldbuilding_field',
        dimension: 'core_rules',
        field: 'rule',
        value: 'cost',
      },
      { type: 'done', novel_id: 'novel-1' },
    ])
  })

  it('reads Codex OAuth status and starts ChatGPT login through LLM Control', async () => {
    const { fetch, calls } = createFetchStub((url) => {
      if (url.endsWith('/llm-control/codex/status')) {
        return jsonResponse({
          available: true,
          authenticated: false,
          requires_openai_auth: true,
          email: null,
          plan_type: null,
          error: null,
        })
      }
      if (url.endsWith('/llm-control/codex/login/start')) {
        return jsonResponse({
          auth_url: 'https://chatgpt.com/auth/login?flow=codex',
          login_id: 'login-1',
        })
      }
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.getCodexStatus()).resolves.toMatchObject({
      available: true,
      authenticated: false,
      requires_openai_auth: true,
    })
    await expect(client.startCodexLogin()).resolves.toEqual({
      auth_url: 'https://chatgpt.com/auth/login?flow=codex',
      login_id: 'login-1',
    })

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'GET http://127.0.0.1:8005/api/v1/llm-control/codex/status',
      'POST http://127.0.0.1:8005/api/v1/llm-control/codex/login/start',
    ])
  })

  it('creates a v4.6 chapter prose AI Invocation request', async () => {
    const invocation = {
      session: {
        id: 'session-1',
        operation: 'chapter.generate.prose',
        node_key: 'chapter-prose-generation',
        policy: 'DIRECT',
        status: 'completed',
        context: { novel_id: 'novel-1', chapter_number: 1 },
        metadata: {},
        attempts: ['attempt-1'],
      },
      attempt: {
        id: 'attempt-1',
        session_id: 'session-1',
        status: 'succeeded',
        content: '第一章正文',
      },
      decision: {
        id: 'decision-1',
        session_id: 'session-1',
        attempt_id: 'attempt-1',
        decision: 'accepted',
        accept_content: true,
        commit_prompt_version: false,
        commit_variable_outputs: false,
        commit_variable_bindings: false,
      },
      commit: {
        id: 'commit-1',
        session_id: 'session-1',
        decision_id: 'decision-1',
        status: 'succeeded',
        steps: [{
          name: 'project_chapter_prose_to_chapters',
          status: 'succeeded',
          result: { chapter_number: 1, word_count: 5 },
          error: '',
        }],
        result: { chapter_number: 1 },
        error: '',
      },
      next_action: 'completed',
    }
    const { fetch, calls } = createFetchStub((url) => {
      if (url.endsWith('/ai-invocations')) return jsonResponse(invocation)
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.createInvocation({
      operation: 'chapter.generate.prose',
      node_key: 'chapter-prose-generation',
      policy: 'DIRECT',
      context: { novel_id: 'novel-1', chapter_number: 1 },
      variables: {
        novel_title: 'Drama',
        chapter_number: 1,
        chapter_title: '第一章',
        user_requirements: '保持冷峻语气',
      },
    })).resolves.toEqual(invocation)

    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:8005/api/v1/ai-invocations',
      init: { method: 'POST' },
    })
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      operation: 'chapter.generate.prose',
      node_key: 'chapter-prose-generation',
      policy: 'DIRECT',
      context: { novel_id: 'novel-1', chapter_number: 1 },
      variables: {
        novel_title: 'Drama',
        chapter_number: 1,
        chapter_title: '第一章',
        user_requirements: '保持冷峻语气',
      },
    })
  })

  it('covers v4.6 WritingSpec and Humanizer project settings', async () => {
    const { fetch, calls } = createFetchStub((url, init) => {
      if (url.endsWith('/novels/novel-1/writing-spec') && init?.method === 'GET') {
        return jsonResponse({
          novel_id: 'novel-1',
          writing_spec_id: '',
          spec_title: '',
          spec_version: '',
          context_key: 'novel_id:novel-1',
        })
      }
      if (url.endsWith('/novels/novel-1/writing-spec') && init?.method === 'PUT') {
        return jsonResponse({
          novel_id: 'novel-1',
          writing_spec_id: 'webnovel-cn-v1',
          spec_title: '中文网文规范',
          spec_version: '1.0',
          context_key: 'novel_id:novel-1',
        })
      }
      if (url.endsWith('/novels/novel-1/humanizer') && init?.method === 'GET') {
        return jsonResponse({
          novel_id: 'novel-1',
          context_key: 'novel_id:novel-1',
          enabled: false,
          revision_note: '',
          failure_policy: 'fallback_original',
          temperature: 0.65,
          max_tokens: null,
        })
      }
      if (url.endsWith('/novels/novel-1/humanizer') && init?.method === 'PUT') {
        return jsonResponse({
          novel_id: 'novel-1',
          context_key: 'novel_id:novel-1',
          enabled: true,
          revision_note: '降低 AI 腔',
          failure_policy: 'fail',
          temperature: 0.7,
          max_tokens: 4096,
        })
      }
      return jsonResponse({})
    })
    const client = createPlotPilotClient({ port: 8005, fetch })

    await expect(client.getWritingSpec('novel-1')).resolves.toMatchObject({ writing_spec_id: '' })
    await expect(client.setWritingSpec('novel-1', { writing_spec_id: 'webnovel-cn-v1' })).resolves.toMatchObject({
      spec_title: '中文网文规范',
    })
    await expect(client.getHumanizer('novel-1')).resolves.toMatchObject({ enabled: false })
    await expect(client.setHumanizer('novel-1', {
      enabled: true,
      revision_note: '降低 AI 腔',
      failure_policy: 'fail',
      temperature: 0.7,
      max_tokens: 4096,
    })).resolves.toMatchObject({ enabled: true, failure_policy: 'fail' })

    expect(calls.map(call => `${call.init?.method ?? 'GET'} ${call.url}`)).toEqual([
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/writing-spec',
      'PUT http://127.0.0.1:8005/api/v1/novels/novel-1/writing-spec',
      'GET http://127.0.0.1:8005/api/v1/novels/novel-1/humanizer',
      'PUT http://127.0.0.1:8005/api/v1/novels/novel-1/humanizer',
    ])
    expect(calls[1]?.init?.body).toBe(JSON.stringify({ writing_spec_id: 'webnovel-cn-v1' }))
    expect(calls[3]?.init?.body).toBe(JSON.stringify({
      enabled: true,
      revision_note: '降低 AI 腔',
      failure_policy: 'fail',
      temperature: 0.7,
      max_tokens: 4096,
    }))
  })

  it('extracts WritingSpec validation failures from chapter save errors', async () => {
    const failureBody = {
      success: false,
      message: 'WritingSpec validation failed; chapter was not saved.',
      code: 'writing_spec_failed',
      details: null,
      detail: {
        code: 'writing_spec_failed',
        message: 'WritingSpec validation failed; chapter was not saved.',
        report: {
          passed: false,
          violations: [{ rule_id: 'no-summary', message: '不要写剧情概要' }],
        },
      },
    }
    const { fetch } = createFetchStub(() => jsonResponse(failureBody, 422))
    const client = createPlotPilotClient({ port: 8005, fetch })

    try {
      await client.updateChapter('novel-1', 1, {
        content: '这里是一段违反规范的概要。',
        writing_spec_id: 'webnovel-cn-v1',
      })
      throw new Error('Expected updateChapter to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(PlotPilotHttpError)
      expect(extractPlotPilotWritingSpecFailure(error)).toEqual({
        code: 'writing_spec_failed',
        message: 'WritingSpec validation failed; chapter was not saved.',
        report: {
          passed: false,
          violations: [{ rule_id: 'no-summary', message: '不要写剧情概要' }],
        },
      })
    }
  })
})
