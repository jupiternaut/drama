import { describe, expect, it } from 'bun:test'

import type { SkillMoment, SkillMomentShowFeedbackCalibration, SkillMomentSkillInput } from '@craft-agent/shared/skill-moments'
import {
  applySkillMomentVisibility,
  applySkillMomentRepairPass,
  buildSkillMomentActorActivitySnapshot,
  buildSkillMomentActorIntentCards,
  buildSkillMomentActorStateCards,
  buildSkillMomentBeatCompletion,
  buildSkillMomentBrowserQueueSnapshot,
  buildSkillMomentDemoContract,
  buildSkillMomentJudgeRequest,
  buildSkillMomentNextRoundHooks,
  buildSkillMomentRelationshipEvents,
  buildSkillMomentShowQualityIssues,
} from '../demo-theater-control'

function skill(id: string, name: string, handle: string): SkillMomentSkillInput {
  return { id, name, handle }
}

function regressionFeedback(): SkillMomentShowFeedbackCalibration {
  return {
    schemaVersion: 1,
    method: 'heuristic_feedback_adjustment',
    roomId: 'debate',
    baseScore: 0.5,
    adjustedScore: 0.35,
    adjustment: -0.15,
    counts: {
      evolve: 0,
      unchanged: 1,
      regress: 3,
      total: 4,
    },
    sampleWindow: 4,
    source: 'skill_moments_feedback_jsonl',
    reason: '退化反馈较多',
  }
}

describe('skill moment demo theater control', () => {
  it('builds a small demo contract with anti-repeat rules and original shell', () => {
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: {
        prioritizedActorSlugs: [],
        notes: [],
      },
      mediaEnabled: true,
    })

    expect(contract.title).toBe('AI 角色朋友圈剧场')
    expect(contract.conflict?.publicLabel).toBe('祖国人 vs 屠夫')
    expect(contract.requiredBeats.join('\n')).toContain('死敌必须反击')
    expect(contract.requiredBeats.join('\n')).toContain('图片动作')
    expect(contract.antiRepeatRules.join('\n')).toContain('禁止重复')
    expect(contract.originalShell?.world).toContain('朋友圈')
  })

  it('uses regression feedback to force stronger next-round scheduling', () => {
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: {
        prioritizedActorSlugs: [],
        notes: [],
      },
      feedbackCalibration: regressionFeedback(),
    })

    expect(contract.feedbackInfluence).toContain('退化')
    expect(contract.feedbackInfluence).toContain('反击')
  })

  it('turns selected actors into visible intent cards', () => {
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: {
        prioritizedActorSlugs: ['homelander', 'butcher'],
        notes: [],
      },
      mediaEnabled: true,
    })
    const cards = buildSkillMomentActorIntentCards({
      skills: [
        skill('homelander', '祖国人', '@homelander'),
        skill('butcher', '屠夫', '@butcher'),
        skill('ashley', '碍事丽', '@ashley'),
      ],
      dramaSchedule: {
        prioritizedActorSlugs: ['homelander', 'butcher'],
        notes: [],
      },
      demoContract: contract,
      mediaEnabled: true,
    })

    expect(cards[0]?.slug).toBe('homelander')
    expect(cards[0]?.nextAction).toContain('点名')
    expect(cards[0]?.mediaIntent).toBe(true)
    expect(cards[1]?.slug).toBe('butcher')
    expect(cards[1]?.visibility).toBe('private')
    expect(cards[1]?.nextAction).toContain('仅可见')
    expect(cards[2]?.role).toContain('公关')
  })

  it('repairs missing dramatic beats without turning silence into filler', () => {
    const skills = [
      skill('homelander', '祖国人', '@homelander'),
      skill('butcher', '屠夫', '@butcher'),
      skill('ashley', '碍事丽', '@ashley'),
      skill('liu-haizhu', '刘海柱', '@liu-haizhu'),
    ]
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: {
        prioritizedActorSlugs: ['homelander', 'butcher'],
        notes: [],
      },
    })
    const completion = buildSkillMomentBeatCompletion({
      contract,
      actorIntents: buildSkillMomentActorIntentCards({
        skills,
        dramaSchedule: {
          prioritizedActorSlugs: ['homelander', 'butcher'],
          notes: [],
        },
        demoContract: contract,
      }),
      moments: [],
    })
    const repaired = applySkillMomentRepairPass({
      roomId: 'debate',
      runId: 'run-1',
      createdAt: '2026-06-04T01:00:00.000Z',
      moments: [],
      eligibleSkills: skills,
      beatCompletion: completion,
    })

    expect(repaired.repairs.length).toBeGreaterThanOrEqual(1)
    expect(repaired.moments[0]?.body).not.toContain('<SILENCE')
    expect(repaired.moments[0]?.artifacts).toContain('agentos_repair_pass')
    expect(repaired.repairs.map((repair) => repair.artifact).join('\n')).toContain('beat_repair:public_challenge')
  })

  it('creates next-round hooks from Butcher replies and private revenge lines', () => {
    const moments = [{
      id: 'm1',
      roomId: 'debate',
      skillId: 'homelander',
      skillName: '祖国人',
      handle: '@homelander',
      body: '把名单拿出来。',
      confidence: 'medium' as const,
      createdAt: '2026-06-04T01:00:00.000Z',
      sources: [],
      critiques: [{
        id: 'c1',
        parentMomentId: 'm1',
        criticSkillId: 'butcher',
        criticSkillName: '屠夫',
        criticHandle: '@butcher',
        body: '你敢放名单，我就敢把证据爆出来。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
    }]

    const hooks = buildSkillMomentNextRoundHooks({
      runId: 'run-1',
      createdAt: '2026-06-04T01:00:00.000Z',
      moments,
      beatCompletion: [],
      actorActivitySnapshot: [],
    })

    expect(hooks.some((hook) => hook.kind === 'reply_priority' && hook.actorSlug === 'homelander' && hook.targetSlug === 'butcher')).toBe(true)
    expect(hooks.some((hook) => hook.kind === 'private_revenge' && hook.actorSlug === 'butcher')).toBe(true)
  })

  it('turns likes into next-round stance pressure', () => {
    const moments = applySkillMomentVisibility([{
      id: 'm1',
      roomId: 'debate',
      skillId: 'homelander',
      skillName: '祖国人',
      handle: '@homelander',
      body: '今晚直播点名。',
      confidence: 'medium' as const,
      createdAt: '2026-06-04T01:00:00.000Z',
      sources: [],
      reactions: [{
        skillId: 'black-noir',
        skillName: '玄色',
        handle: '@black-noir',
        kind: 'like' as const,
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
      critiques: [],
    }])
    const relationshipEvents = buildSkillMomentRelationshipEvents({
      moments,
      createdAt: '2026-06-04T01:00:00.000Z',
    })
    const hooks = buildSkillMomentNextRoundHooks({
      runId: 'run-1',
      createdAt: '2026-06-04T01:00:00.000Z',
      moments,
      beatCompletion: [],
      actorActivitySnapshot: [],
      relationshipEvents,
    })

    expect(relationshipEvents.some((event) => event.kind === 'like' && event.actorSlug === 'black-noir')).toBe(true)
    expect(hooks.some((hook) => (
      hook.kind === 'stance_pressure'
      && hook.actorSlug === 'black-noir'
      && hook.targetSlug === 'homelander'
      && hook.reason.includes('站队')
    ))).toBe(true)
  })

  it('turns private and leaked visibility into next-round escalation', () => {
    const moments = applySkillMomentVisibility([{
      id: 'm1',
      roomId: 'debate',
      skillId: 'butcher',
      skillName: '屠夫',
      handle: '@butcher',
      body: '仅可见：我今晚去查那份名单。',
      confidence: 'medium' as const,
      createdAt: '2026-06-04T01:00:00.000Z',
      sources: [],
      critiques: [],
    }, {
      id: 'm2',
      roomId: 'debate',
      skillId: 'starlight',
      skillName: '星光',
      handle: '@starlight',
      body: '截图外泄了，别再装没人看见。',
      confidence: 'medium' as const,
      createdAt: '2026-06-04T01:01:00.000Z',
      sources: [],
      critiques: [],
    }])
    const hooks = buildSkillMomentNextRoundHooks({
      runId: 'run-1',
      createdAt: '2026-06-04T01:00:00.000Z',
      moments,
      beatCompletion: [],
      actorActivitySnapshot: [],
    })

    expect(moments[0]?.visibility).toBe('private')
    expect(moments[1]?.visibility).toBe('leaked')
    expect(hooks.some((hook) => hook.kind === 'leak_escalation' && hook.actorSlug === 'butcher')).toBe(true)
    expect(hooks.some((hook) => hook.kind === 'leak_escalation' && hook.actorSlug === 'starlight')).toBe(true)
  })

  it('uses degraded feedback and previous hooks in actor strategy', () => {
    const schedule = {
      prioritizedActorSlugs: [],
      notes: ['下一轮钩子：stance_pressure:starlight->homelander'],
      nextRoundHooks: [{
        schemaVersion: 1 as const,
        kind: 'stance_pressure' as const,
        actorSlug: 'starlight',
        targetSlug: 'homelander',
        reason: '星光点赞祖国人。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
    }
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: schedule,
      feedbackCalibration: regressionFeedback(),
    })
    const cards = buildSkillMomentActorIntentCards({
      skills: [
        skill('homelander', '祖国人', '@homelander'),
        skill('starlight', '星光', '@starlight'),
      ],
      dramaSchedule: schedule,
      demoContract: contract,
      feedbackCalibration: regressionFeedback(),
    })

    expect(contract.antiRepeatRules.join('\n')).toContain('退化反馈')
    expect(contract.antiRepeatRules.join('\n')).toContain('站队压力')
    expect(cards[0]?.slug).toBe('starlight')
    expect(cards[0]?.memory).toContain('站队压力')
    expect(cards[0]?.nextAction).toContain('给新证据')
  })

  it('boosts quiet life-flow actors without making them primary conflict owners', () => {
    const snapshot = buildSkillMomentActorActivitySnapshot({
      skills: [
        skill('homelander', '祖国人', '@homelander'),
        skill('gazi', '嘎子', '@gazi'),
        skill('dongbei-yujie', '东北雨姐', '@dongbei-yujie'),
        skill('liu-haizhu', '刘海柱', '@liu-haizhu'),
      ],
      recentMoments: [{
        id: 'm1',
        roomId: 'debate',
        skillId: 'homelander',
        skillName: '祖国人',
        handle: '@homelander',
        body: '今晚直播。',
        confidence: 'medium' as const,
        createdAt: '2026-06-04T01:00:00.000Z',
        sources: [],
        critiques: [],
      }],
    })

    expect(snapshot.find((entry) => entry.slug === 'homelander')?.boosted).toBe(false)
    expect(snapshot.find((entry) => entry.slug === 'gazi')?.boosted).toBe(true)
    expect(snapshot.find((entry) => entry.slug === 'dongbei-yujie')?.boosted).toBe(true)
    expect(snapshot.find((entry) => entry.slug === 'liu-haizhu')?.boosted).toBe(true)
  })

  it('raises quiet local life-flow actors in intent priority without forcing filler', () => {
    const schedule = {
      prioritizedActorSlugs: ['homelander'],
      actorActivityBoostSlugs: ['gazi'],
      notes: ['沉默角色加权：gazi'],
    }
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: schedule,
    })
    const cards = buildSkillMomentActorIntentCards({
      skills: [
        skill('homelander', '祖国人', '@homelander'),
        skill('gazi', '嘎子', '@gazi'),
      ],
      dramaSchedule: schedule,
      demoContract: contract,
    })
    const gazi = cards.find((card) => card.slug === 'gazi')

    expect(cards.map((card) => card.slug)).toEqual(['homelander', 'gazi'])
    expect(gazi?.memory).toContain('本地生活流沉默')
    expect(gazi?.nextAction).toContain('生活流短句')
    expect(gazi?.visibility).toBe('comment')
  })

  it('infers friend-circle visibility and turns likes/replies into relationship events', () => {
    const visible = applySkillMomentVisibility([{
      id: 'm1',
      roomId: 'debate',
      skillId: 'butcher',
      skillName: '屠夫',
      handle: '@butcher',
      body: '仅可见：我今晚去查那份名单。',
      confidence: 'medium',
      createdAt: '2026-06-04T01:00:00.000Z',
      sources: [],
      reactions: [{
        skillId: 'starlight',
        skillName: '星光',
        handle: '@starlight',
        kind: 'like',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
      critiques: [{
        id: 'c1',
        parentMomentId: 'm1',
        criticSkillId: 'homelander',
        criticSkillName: '祖国人',
        criticHandle: '@homelander',
        body: '你最好把定位打开。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
    }])
    const events = buildSkillMomentRelationshipEvents({
      moments: visible,
      createdAt: '2026-06-04T01:00:00.000Z',
    })

    expect(visible[0]?.visibility).toBe('private')
    expect(events.some((event) => event.kind === 'private_post' && event.actorSlug === 'butcher')).toBe(true)
    expect(events.some((event) => event.kind === 'like' && event.actorSlug === 'starlight' && event.targetSlug === 'butcher')).toBe(true)
    expect(events.some((event) => event.kind === 'reply' && event.actorSlug === 'homelander' && event.targetSlug === 'butcher')).toBe(true)
  })

  it('builds actor state cards from hooks, activity, and relationship pressure', () => {
    const skills = [
      skill('homelander', '祖国人', '@homelander'),
      skill('ashley', '碍事丽', '@ashley'),
      skill('gazi', '嘎子', '@gazi'),
    ]
    const contract = buildSkillMomentDemoContract({
      roomId: 'debate',
      dramaSchedule: {
        prioritizedActorSlugs: ['homelander', 'ashley'],
        notes: [],
      },
    })
    const intents = buildSkillMomentActorIntentCards({
      skills,
      dramaSchedule: {
        prioritizedActorSlugs: ['homelander', 'ashley'],
        notes: [],
      },
      demoContract: contract,
    })
    const states = buildSkillMomentActorStateCards({
      skills,
      actorIntents: intents,
      nextRoundHooks: [{
        schemaVersion: 1,
        kind: 'reply_priority',
        actorSlug: 'homelander',
        targetSlug: 'butcher',
        reason: '屠夫公开回应。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
      actorActivitySnapshot: [{
        schemaVersion: 1,
        skillId: 'gazi',
        skillName: '嘎子',
        handle: '@gazi',
        slug: 'gazi',
        silenceStreak: 3,
        postCount: 0,
        commentCount: 0,
        reactionCount: 0,
        boosted: true,
      }],
      relationshipEvents: [{
        schemaVersion: 1,
        kind: 'like',
        actorSlug: 'gazi',
        targetSlug: 'homelander',
        reason: '嘎子点赞祖国人。',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
    })

    expect(states.find((state) => state.slug === 'homelander')?.state).toBe('grudge')
    expect(states.find((state) => state.slug === 'ashley')?.state).toBe('spin')
    expect(states.find((state) => state.slug === 'gazi')?.state).toBe('clout')
  })

  it('flags boring output and summarizes browser media queue state', () => {
    const moments: SkillMoment[] = [{
      id: 'm1',
      roomId: 'debate',
      skillId: 'homelander',
      skillName: '祖国人',
      handle: '@homelander',
      body: 'Big moment，我回来了。',
      confidence: 'medium',
      createdAt: '2026-06-04T01:00:00.000Z',
      sources: [],
      critiques: [{
        id: 'c1',
        parentMomentId: 'm1',
        criticSkillId: 'ashley',
        criticSkillName: '碍事丽',
        criticHandle: '@ashley',
        body: '收到',
        createdAt: '2026-06-04T01:00:00.000Z',
      }],
      media: [{
        id: 'm1-image',
        type: 'image',
        path: '/tmp/fallback.png',
        mimeType: 'image/png',
        status: 'fallback',
      }],
    }]
    const issues = buildSkillMomentShowQualityIssues({
      moments,
      beatCompletion: [],
      relationshipEvents: [],
    })
    const browser = buildSkillMomentBrowserQueueSnapshot({
      moments,
      mediaErrors: ['prompt input not found'],
      mediaFallbacks: ['reused previous image'],
    })
    const judge = buildSkillMomentJudgeRequest({
      roomId: 'debate',
      moments,
      actorStateCards: [],
      showQualityIssues: issues,
    })

    expect(issues.find((issue) => issue.key === 'banned_phrase')?.status).toBe('failed')
    expect(issues.find((issue) => issue.key === 'robotic_reply')?.status).toBe('risk')
    expect(browser.state).toBe('fallback')
    expect(browser.failed).toBe(1)
    expect(judge.prompt).toContain('输出 JSON')
  })
})
