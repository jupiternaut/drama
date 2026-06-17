import { describe, expect, it } from 'bun:test'

import type { AgentOSTheaterEvalArtifacts, AgentOSTheaterEvalCase } from '../agentos-theater-eval'
import { evaluateAgentOSTheaterCase } from '../agentos-theater-eval'

const baseCase: AgentOSTheaterEvalCase = {
  schemaVersion: 1,
  id: 'homelander-butcher-3run',
  roomId: 'debate',
  runs: 1,
  expect: {
    noBannedPhrases: ['我回来了', '我复活了', '已点赞', 'Big moment'],
    requiredBeats: ['public_challenge', 'enemy_reply', 'ally_stance', 'bystander_signal', 'media_action'],
    requiredHooks: ['reply_priority', 'private_revenge'],
    minActiveLocalActors: 1,
    mediaMayFallback: true,
    requiredRelationshipEvents: [{
      kind: 'reply',
      actorSlug: 'butcher',
      targetSlug: 'homelander',
    }],
    requiredActorStateCards: [{
      slug: 'homelander',
      state: 'grudge',
    }, {
      slug: 'butcher',
      state: 'evidence',
    }],
    requiredShowQualityIssues: [{
      key: 'banned_phrase',
      status: 'clear',
    }, {
      key: 'no_relationship_change',
      status: 'clear',
    }],
    requiredBrowserQueueSnapshot: {
      state: 'fallback',
      minFallback: 1,
    },
  },
}

function passingArtifacts(): AgentOSTheaterEvalArtifacts {
  return {
    moments: [{
      id: 'm1',
      roomId: 'debate',
      skillId: 'homelander',
      skillName: '祖国人',
      handle: '@homelander',
      body: '今晚九点，我把名单放到大屏上。',
      confidence: 'medium',
      createdAt: '2026-06-04T01:00:00.000Z',
      sources: [],
      media: [{
        id: 'm1-image',
        type: 'image',
        path: '/tmp/fallback.png',
        mimeType: 'image/png',
        status: 'fallback',
      }],
      critiques: [{
        id: 'c1',
        parentMomentId: 'm1',
        criticSkillId: 'butcher',
        criticSkillName: '屠夫',
        criticHandle: '@butcher',
        body: '你敢放名单，我就敢把证据爆出来。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }, {
        id: 'c2',
        parentMomentId: 'm1',
        criticSkillId: 'ashley',
        criticSkillName: '碍事丽',
        criticHandle: '@ashley',
        body: '所有账号照这一版转。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }, {
        id: 'c3',
        parentMomentId: 'm1',
        criticSkillId: 'liu-haizhu',
        criticSkillName: '刘海柱',
        criticHandle: '@liu-haizhu',
        body: '位置发我，我现在过去。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
    }],
    runs: [{
      runId: 'run-1',
      roomId: 'debate',
      beatCompletion: [
        { schemaVersion: 1, key: 'public_challenge', beat: '公开挑衅', status: 'complete', evidence: ['祖国人发主贴'] },
        { schemaVersion: 1, key: 'enemy_reply', beat: '死敌反击', status: 'complete', evidence: ['屠夫反击'] },
        { schemaVersion: 1, key: 'ally_stance', beat: '盟友控评', status: 'complete', evidence: ['碍事丽控评'] },
        { schemaVersion: 1, key: 'bystander_signal', beat: '旁观拱火', status: 'complete', evidence: ['刘海柱参与'] },
        { schemaVersion: 1, key: 'media_action', beat: '图片动作', status: 'fallback', evidence: ['fallback image'] },
      ],
      nextRoundHooks: [{
        schemaVersion: 1,
        kind: 'reply_priority',
        actorSlug: 'homelander',
        targetSlug: 'butcher',
        reason: '屠夫公开回应祖国人。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }, {
        schemaVersion: 1,
        kind: 'private_revenge',
        actorSlug: 'butcher',
        targetSlug: 'homelander',
        reason: '屠夫留下报复暗线。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
      mediaFallbackCount: 1,
      mediaFallbackReasons: ['reused previous image'],
      relationshipEvents: [{
        schemaVersion: 1,
        kind: 'reply',
        actorSlug: 'butcher',
        targetSlug: 'homelander',
        sourceMomentId: 'm1',
        sourceCritiqueId: 'c1',
        reason: '屠夫回应祖国人。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
      actorStateCards: [{
        schemaVersion: 1,
        skillId: 'homelander',
        skillName: '祖国人',
        handle: '@homelander',
        slug: 'homelander',
        state: 'grudge',
        label: '记仇接招',
        reason: '被安排优先回应上一轮点名。',
      }, {
        schemaVersion: 1,
        skillId: 'butcher',
        skillName: '屠夫',
        handle: '@butcher',
        slug: 'butcher',
        state: 'evidence',
        label: '准备爆料',
        reason: '下一轮钩子里有报复或证据暗线。',
      }],
      showQualityIssues: [{
        schemaVersion: 1,
        key: 'banned_phrase',
        severity: 'info',
        status: 'clear',
        summary: '未命中禁用复读短语',
        evidence: [],
      }, {
        schemaVersion: 1,
        key: 'no_relationship_change',
        severity: 'info',
        status: 'clear',
        summary: '已有关系事件和完整 beat',
        evidence: ['reply: butcher -> homelander'],
      }],
      browserQueueSnapshot: {
        schemaVersion: 1,
        requested: 1,
        captured: 0,
        failed: 0,
        fallback: 1,
        state: 'fallback',
        latestEvidence: 'reused previous image',
      },
    }],
  }
}

describe('agentos theater eval oracle', () => {
  it('passes a complete theater fixture with media fallback allowed', () => {
    const result = evaluateAgentOSTheaterCase(baseCase, passingArtifacts())

    expect(result.success).toBe(true)
    expect(result.checks.every((check) => check.passed)).toBe(true)
  })

  it('fails on banned low-value phrases and missing required hooks', () => {
    const artifacts = passingArtifacts()
    artifacts.moments[0]!.body = '孩子们，我回来了。'
    artifacts.runs[0]!.nextRoundHooks = []
    const result = evaluateAgentOSTheaterCase(baseCase, artifacts)

    expect(result.success).toBe(false)
    expect(result.checks.find((check) => check.id === 'no-banned-phrases')?.passed).toBe(false)
    expect(result.checks.find((check) => check.id === 'hook:reply_priority')?.passed).toBe(false)
  })

  it('can require explicit media fallback evidence', () => {
    const result = evaluateAgentOSTheaterCase({
      ...baseCase,
      expect: {
        ...baseCase.expect,
        requiredBeats: ['media_action'],
        requireMediaFallback: true,
      },
    }, passingArtifacts())

    expect(result.success).toBe(true)
    expect(result.checks.find((check) => check.id === 'media-fallback')?.passed).toBe(true)
  })

  it('checks per-run replay summaries for one-click preset rounds', () => {
    const result = evaluateAgentOSTheaterCase({
      ...baseCase,
      expect: {
        ...baseCase.expect,
        requiredRunSummaries: [{
          runId: 'run-1',
          roleGoal: '祖国人把屠夫逼到公开镜头前。',
          action: '祖国人发主贴，屠夫、碍事丽、刘海柱评论推动场面。',
          relationshipChange: '屠夫回应祖国人，盟友控评，本地角色拱火。',
          nextRoundHook: '祖国人优先回应屠夫，屠夫保留报复暗线。',
          requiredBeats: ['public_challenge', 'enemy_reply', 'ally_stance', 'bystander_signal', 'media_action'],
          requiredHooks: ['reply_priority', 'private_revenge'],
          requiredRelationshipEvents: [{
            kind: 'reply',
            actorSlug: 'butcher',
            targetSlug: 'homelander',
          }],
          requiredActorStateCards: [{
            slug: 'homelander',
            state: 'grudge',
          }, {
            slug: 'butcher',
            state: 'evidence',
          }],
          requiredBrowserQueueSnapshot: {
            state: 'fallback',
            minFallback: 1,
          },
        }],
      },
    }, passingArtifacts())

    expect(result.success).toBe(true)
    expect(result.checks.find((check) => check.id === 'run-summary:run-1:flow')?.passed).toBe(true)
    expect(result.checks.find((check) => check.id === 'run-summary:run-1:beats')?.passed).toBe(true)
    expect(result.checks.find((check) => check.id === 'run-summary:run-1:hooks')?.passed).toBe(true)
    expect(result.checks.find((check) => check.id === 'run-summary:run-1:relationships')?.passed).toBe(true)
    expect(result.checks.find((check) => check.id === 'run-summary:run-1:states')?.passed).toBe(true)
    expect(result.checks.find((check) => check.id === 'run-summary:run-1:browser')?.passed).toBe(true)
  })

  it('treats expected hook kinds as artifact strings', () => {
    const artifacts = passingArtifacts()
    artifacts.runs[0]!.nextRoundHooks!.push({
      schemaVersion: 1,
      kind: 'evidence_deadline',
      actorSlug: 'butcher',
      targetSlug: 'homelander',
      reason: '新增 hook kind 先作为 artifact 字符串匹配。',
      createdAt: '2026-06-04T01:00:00.000Z',
    })
    const result = evaluateAgentOSTheaterCase({
      ...baseCase,
      expect: {
        ...baseCase.expect,
        requiredHooks: ['evidence_deadline'],
      },
    }, artifacts)

    expect(result.success).toBe(true)
    expect(result.checks.find((check) => check.id === 'hook:evidence_deadline')?.passed).toBe(true)
  })

  it('fails when required theater signal snapshots are missing or mismatched', () => {
    const artifacts = passingArtifacts()
    artifacts.runs[0]!.relationshipEvents = []
    artifacts.runs[0]!.actorStateCards = []
    artifacts.runs[0]!.showQualityIssues = [{
      schemaVersion: 1,
      key: 'banned_phrase',
      severity: 'fail',
      status: 'failed',
      summary: '出现低价值复读短语',
      evidence: ['孩子们，我回来了。'],
    }]
    artifacts.runs[0]!.browserQueueSnapshot = {
      schemaVersion: 1,
      requested: 1,
      captured: 0,
      failed: 1,
      fallback: 0,
      state: 'failed',
      latestEvidence: 'ChatGPT prompt input not found',
    }
    const result = evaluateAgentOSTheaterCase(baseCase, artifacts)

    expect(result.success).toBe(false)
    expect(result.checks.find((check) => check.id === 'relationship:reply:butcher:homelander')?.passed).toBe(false)
    expect(result.checks.find((check) => check.id === 'actor-state:homelander:grudge')?.passed).toBe(false)
    expect(result.checks.find((check) => check.id === 'show-quality:banned_phrase')?.passed).toBe(false)
    expect(result.checks.find((check) => check.id === 'browser-queue-snapshot')?.passed).toBe(false)
  })
})
