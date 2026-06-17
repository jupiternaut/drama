import type {
  SkillMoment,
  SkillMomentActorIntentCard,
  SkillMomentActorActivityEntry,
  SkillMomentActorStateCard,
  SkillMomentBeatCompletion,
  SkillMomentBrowserQueueSnapshot,
  SkillMomentCritique,
  SkillMomentDemoContract,
  SkillMomentJudgeRequest,
  SkillMomentNextRoundHook,
  SkillMomentRepairRecord,
  SkillMomentRelationshipEvent,
  SkillMomentShowQualityIssue,
  SkillMomentShowFeedbackCalibration,
  SkillMomentSkillInput,
  SkillMomentStageControl,
  SkillMomentVisibility,
} from '@craft-agent/shared/skill-moments'
import { normalizeSkillMomentSlug } from './room-policies'

export type SkillMomentStagePlanLike = {
  sceneType?: SkillMomentStageControl['sceneType']
  conflict?: {
    left: string
    right: string
  }
  goal?: string
  constraints?: string[]
  mediaInstruction?: string
  reveal?: string
  inferredActorSlugs?: string[]
}

export type SkillMomentDramaScheduleLike = {
  prioritizedActorSlugs: string[]
  requiredBeats?: string[]
  antiRepeatRules?: string[]
  feedbackInfluence?: string
  nextRoundHookCount?: number
  actorActivityBoostSlugs?: string[]
  nextRoundHooks?: SkillMomentNextRoundHook[]
  notes: string[]
}

function compactIntentText(value: string | undefined, fallback: string): string {
  const trimmed = value?.replace(/\s+/g, ' ').trim()
  if (!trimmed) return fallback
  return trimmed.length > 86 ? `${trimmed.slice(0, 84)}...` : trimmed
}

function describeFeedbackInfluence(feedback?: SkillMomentShowFeedbackCalibration): string | undefined {
  if (!feedback || feedback.counts.total === 0) {
    return undefined
  }
  if (feedback.adjustment < -0.01) {
    return '观众反馈偏退化：下一轮强制减少复读和套话，优先安排反击、爆料、短评论。'
  }
  if (feedback.adjustment > 0.01) {
    return '观众反馈偏进化：下一轮继续强化冲突、画面和有效站队。'
  }
  return '观众反馈分歧不大：维持当前冲突节奏，但每条内容仍必须推进局势。'
}

const knownNextRoundHookKinds: SkillMomentNextRoundHook['kind'][] = [
  'reply_priority',
  'private_revenge',
  'media_retry',
  'activity_boost',
  'stance_pressure',
  'leak_escalation',
]

function isNextRoundHookKind(value: string): value is SkillMomentNextRoundHook['kind'] {
  return knownNextRoundHookKinds.includes(value as SkillMomentNextRoundHook['kind'])
}

function isFeedbackRegression(feedbackInfluence?: string): boolean {
  return Boolean(feedbackInfluence && /退化|减少复读|套话|regress/i.test(feedbackInfluence))
}

function scheduleHookRefs(schedule: SkillMomentDramaScheduleLike): Array<Pick<SkillMomentNextRoundHook, 'kind' | 'actorSlug' | 'targetSlug'>> {
  const refs: Array<Pick<SkillMomentNextRoundHook, 'kind' | 'actorSlug' | 'targetSlug'>> = []
  for (const hook of schedule.nextRoundHooks ?? []) {
    refs.push({
      kind: hook.kind,
      actorSlug: hook.actorSlug,
      targetSlug: hook.targetSlug,
    })
  }
  for (const note of schedule.notes) {
    const hookNote = note.match(/下一轮钩子：(.+)/)
    if (!hookNote?.[1]) continue
    for (const rawEntry of hookNote[1].split(',')) {
      const entry = rawEntry.trim()
      const match = entry.match(/^([a-z_]+):([^,\s;；]+)(?:->([^,\s;；]+))?/)
      if (!match?.[1] || !match[2] || !isNextRoundHookKind(match[1])) continue
      refs.push({
        kind: match[1],
        actorSlug: match[2],
        targetSlug: match[3],
      })
    }
  }

  const seen = new Set<string>()
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.actorSlug}:${ref.targetSlug ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function hasScheduleHookKind(schedule: SkillMomentDramaScheduleLike, kind: SkillMomentNextRoundHook['kind']): boolean {
  return scheduleHookRefs(schedule).some((hook) => hook.kind === kind)
}

function defaultAntiRepeatRules(args: {
  feedbackInfluence?: string
  dramaSchedule: SkillMomentDramaScheduleLike
}): string[] {
  return [
    '禁止重复“我回来了/我复活了”式宣言',
    '禁止只有“已点赞/欢迎回来/Big moment”的低价值评论',
    '每条主贴或评论必须带来新动作、新证据、新站队或新画面',
    isFeedbackRegression(args.feedbackInfluence) ? '退化反馈后禁止复述上一轮句式，必须给出反击、证据或具体动作' : undefined,
    hasScheduleHookKind(args.dramaSchedule, 'stance_pressure') ? '点赞造成的站队压力必须在下一轮兑现为立场、撤退或反噬' : undefined,
    hasScheduleHookKind(args.dramaSchedule, 'leak_escalation') ? '仅可见或外泄不能停在暗示，下一轮必须处理截图后果' : undefined,
    args.dramaSchedule.actorActivityBoostSlugs?.length ? '沉默加权角色只用短句出场，不能补无意义存在感' : undefined,
  ].filter((rule): rule is string => Boolean(rule))
}

function defaultConflict(roomId: string): { left: string; right: string } {
  if (roomId === 'debate') {
    return { left: '祖国人', right: '屠夫' }
  }
  return { left: '主角', right: '对手' }
}

function defaultRequiredBeats(args: {
  roomId: string
  stagePlan?: SkillMomentStagePlanLike
  mediaEnabled: boolean
}): string[] {
  const beats = [
    '主角必须公开挑衅或抛出要求',
    '死敌必须反击、埋雷或转入仅可见行动',
    '至少一名盟友控评或站队',
    '至少一名旁观者质疑、拱火或给出证据线索',
  ]
  if (args.stagePlan?.reveal) {
    beats.push('爆料必须改变下一轮目标')
  }
  if (args.mediaEnabled || args.stagePlan?.mediaInstruction) {
    beats.push('本轮至少准备一条有画面感的图片动作')
  }
  return beats
}

export function buildSkillMomentDemoContract(args: {
  roomId: string
  stageControl?: SkillMomentStageControl
  stagePlan?: SkillMomentStagePlanLike
  dramaSchedule: SkillMomentDramaScheduleLike
  feedbackCalibration?: SkillMomentShowFeedbackCalibration
  mediaEnabled?: boolean
}): SkillMomentDemoContract {
  const conflict = args.stagePlan?.conflict ?? defaultConflict(args.roomId)
  const mediaEnabled = Boolean(args.mediaEnabled || args.stageControl?.mediaPolicy === 'allow_actor_requested_images' || args.stagePlan?.mediaInstruction)
  const feedbackInfluence = args.dramaSchedule.feedbackInfluence ?? describeFeedbackInfluence(args.feedbackCalibration)

  return {
    schemaVersion: 1,
    title: 'AI 角色朋友圈剧场',
    scene: args.stageControl?.sceneType ?? args.stagePlan?.sceneType ?? 'friend_circle',
    conflict: {
      left: conflict.left,
      right: conflict.right,
      publicLabel: `${conflict.left} vs ${conflict.right}`,
    },
    goal: compactIntentText(args.stagePlan?.goal, '让冲突在两分钟内升级，让观众看懂谁在挑衅、谁在反击、谁在站队。'),
    requiredBeats: args.dramaSchedule.requiredBeats?.length
      ? args.dramaSchedule.requiredBeats
      : defaultRequiredBeats({
        roomId: args.roomId,
        stagePlan: args.stagePlan,
        mediaEnabled,
      }),
    antiRepeatRules: args.dramaSchedule.antiRepeatRules?.length
      ? args.dramaSchedule.antiRepeatRules
      : defaultAntiRepeatRules({
        feedbackInfluence,
        dramaSchedule: args.dramaSchedule,
      }),
    feedbackInfluence,
    originalShell: args.roomId === 'debate'
      ? {
        protagonist: '天塔英雄',
        antagonist: '猎犬',
        world: '超英公关危机朋友圈',
      }
      : undefined,
  }
}

function skillLabel(skill: SkillMomentSkillInput): string {
  return skill.name?.trim() || skill.handle?.replace(/^@/, '') || skill.id
}

function targetForSlug(slug: string, conflict?: { left: string; right: string }): string | undefined {
  if (!conflict) return undefined
  if (slug === 'homelander') return conflict.right
  if (slug === 'butcher') return conflict.left
  return conflict.left || conflict.right
}

function uniqueSlugs(slugs: Array<string | undefined>): string[] {
  return Array.from(new Set(slugs.filter((slug): slug is string => Boolean(slug))))
}

function schedulePrioritySlugs(schedule: SkillMomentDramaScheduleLike): string[] {
  const hookSlugs = scheduleHookRefs(schedule).flatMap((hook) => [hook.actorSlug, hook.targetSlug])
  return uniqueSlugs([
    ...schedule.prioritizedActorSlugs,
    ...hookSlugs,
    ...(schedule.actorActivityBoostSlugs ?? []),
  ])
}

function scheduleActivityBoosted(schedule: SkillMomentDramaScheduleLike, slug: string): boolean {
  return Boolean(schedule.actorActivityBoostSlugs?.includes(slug))
    || scheduleHookRefs(schedule).some((hook) => hook.kind === 'activity_boost' && hook.actorSlug === slug)
}

function hookIntentLine(hook: Pick<SkillMomentNextRoundHook, 'kind' | 'actorSlug' | 'targetSlug'>, slug: string): string {
  const target = hook.targetSlug && hook.targetSlug !== slug ? `，对象是 ${hook.targetSlug}` : ''
  if (hook.kind === 'stance_pressure') return `上一轮点赞已变成站队压力${target}`
  if (hook.kind === 'leak_escalation') return `上一轮仅可见/外泄需要升级处理${target}`
  if (hook.kind === 'reply_priority') return `上一轮有人点名，必须优先接招${target}`
  if (hook.kind === 'private_revenge') return `上一轮报复或证据暗线还没兑现${target}`
  if (hook.kind === 'media_retry') return '上一轮媒体动作失败，需要重试或降级'
  return '本轮被沉默加权点名'
}

function schedulePressureForSlug(args: {
  schedule: SkillMomentDramaScheduleLike
  slug: string
  feedbackInfluence?: string
}): string | undefined {
  const parts = scheduleHookRefs(args.schedule)
    .filter((hook) => hook.actorSlug === args.slug || hook.targetSlug === args.slug)
    .map((hook) => hookIntentLine(hook, args.slug))
  if (isFeedbackRegression(args.feedbackInfluence)) {
    parts.push('退化反馈要求减少套话，必须给新动作')
  }
  if (scheduleActivityBoosted(args.schedule, args.slug)) {
    parts.push('本地生活流沉默被提升：短句出场，但必须拱火或给线索')
  }
  if (parts.length === 0) return undefined
  return compactIntentText(parts.join('；'), parts[0] ?? '')
}

function actionWithPressure(baseAction: string, args: {
  schedulePressure?: string
  feedbackRegressed: boolean
  silenceBoosted: boolean
}): string {
  const extras = [
    args.schedulePressure?.includes('站队') ? '兑现点赞站队' : undefined,
    args.schedulePressure?.includes('外泄') || args.schedulePressure?.includes('仅可见') ? '处理截图/外泄后果' : undefined,
    args.feedbackRegressed ? '给新证据或动作，别复读' : undefined,
    args.silenceBoosted ? '用生活流短句进场' : undefined,
  ].filter((item): item is string => Boolean(item))
  if (extras.length === 0) return baseAction
  return compactIntentText(`${baseAction} ${extras.join('；')}。`, baseAction)
}

function memoryWithPressure(baseMemory: string, args: {
  schedulePressure?: string
  fallback?: string
}): string {
  if (!args.schedulePressure) return compactIntentText(baseMemory, args.fallback ?? baseMemory)
  return compactIntentText(`${args.schedulePressure}。${baseMemory}`, baseMemory)
}

function intentTemplate(args: {
  slug: string
  conflict?: { left: string; right: string }
  directorGoal: string
  mediaEnabled: boolean
  wasPrioritized: boolean
  feedbackInfluence?: string
  schedulePressure?: string
  silenceBoosted: boolean
}): Omit<SkillMomentActorIntentCard, 'schemaVersion' | 'skillId' | 'skillName' | 'handle' | 'slug'> {
  const target = targetForSlug(args.slug, args.conflict)
  const feedbackRegressed = isFeedbackRegression(args.feedbackInfluence)
  const priorityMemory = memoryWithPressure(
    args.wasPrioritized ? '本轮被调度器点名，需要主动推进局势。' : '观察上一轮关系和观众反馈，避免无意义跟帖。',
    { schedulePressure: args.schedulePressure },
  )
  switch (args.slug) {
    case 'homelander':
      return {
        role: '公开挑衅者',
        goal: '把危机改造成忠诚测试，逼对手在公开场合接招。',
        memory: memoryWithPressure(
          compactIntentText(args.feedbackInfluence, '记得屠夫上轮要求证据，不能再只宣布自己回来了。'),
          { schedulePressure: args.schedulePressure },
        ),
        nextAction: actionWithPressure(
          args.mediaEnabled ? '发带地点或自拍的主贴，点名对手并要求他交出证据。' : '公开点名对手，把城市和镜头都变成施压工具。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'public',
        mediaIntent: args.mediaEnabled,
        risk: '容易复读宣言，必须带新动作。',
      }
    case 'butcher':
      return {
        role: '复仇反击者',
        goal: '让对方把话说满，再用证据或威胁反打。',
        memory: memoryWithPressure('记得公开羞辱和名单威胁，优先准备报复线索。', { schedulePressure: args.schedulePressure }),
        nextAction: actionWithPressure(
          '先嘴炮反击；必要时发仅可见朋友圈，写清楚下一步找谁、查哪条证据。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'private',
        risk: '如果只骂人不埋雷，冲突会停在表面。',
      }
    case 'ashley':
      return {
        role: '危机公关',
        goal: '统一口径，替强势角色控评但暴露紧张感。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '短句发布官方话术，要求账号统一转发，不要自由发挥。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'comment',
      }
    case 'atrain':
      return {
        role: '顺风站队者',
        goal: '快速跟队，但留下一点怕事和自保。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '用很短的附和或转发语气站队，避免长篇解释。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'comment',
      }
    case 'black-noir':
      return {
        role: '沉默执行者',
        goal: '用点赞或极短反应制造压迫感。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '只做点赞或一句极短确认，让沉默也像行动。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'like',
      }
    case 'deep':
      return {
        role: '笨拙附和者',
        goal: '努力表忠心，但说出口会显得尴尬。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '发一条短促、略跑偏的附和，给场面增加喜剧尴尬。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'comment',
      }
    case 'starlight':
      return {
        role: '内部异议者',
        goal: '不正面认同，把点赞或评论变成留证。',
        memory: memoryWithPressure('记得公开发言会被截图，所以要用克制的反讽留下线索。', { schedulePressure: args.schedulePressure }),
        nextAction: actionWithPressure(
          '短评质疑或留证，不跟官方口径走。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'comment',
      }
    case 'gazi':
      return {
        role: '直播叫卖式拱火者',
        goal: '把严肃冲突讲成直播间热闹，顺手卖人情。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '用短促口播式评论拱火，不要像机器人点赞。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'comment',
      }
    case 'dongbei-yujie':
      return {
        role: '东北生活流围观者',
        goal: '用热乎、直接的生活口吻把场面拽回人间。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '短评劝、呛或围观，句子长短自然变化。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'comment',
      }
    case 'liu-haizhu':
      return {
        role: '江湖狠话执行者',
        goal: '把嘴炮变成要动手的现场感。',
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '发带地点和动作的朋友圈或评论，像真的要去现场。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: 'public',
        mediaIntent: args.mediaEnabled,
      }
    default:
      return {
        role: '围观变量',
        goal: compactIntentText(args.directorGoal, '根据角色人设选择站队、质疑、沉默或拱火。'),
        memory: priorityMemory,
        nextAction: actionWithPressure(
          '只在能推动冲突时发言，否则沉默。',
          { schedulePressure: args.schedulePressure, feedbackRegressed, silenceBoosted: args.silenceBoosted },
        ),
        target,
        visibility: args.wasPrioritized ? 'comment' : 'silent',
      }
  }
}

export function buildSkillMomentActorIntentCards(args: {
  skills: SkillMomentSkillInput[]
  stagePlan?: SkillMomentStagePlanLike
  dramaSchedule: SkillMomentDramaScheduleLike
  demoContract: SkillMomentDemoContract
  feedbackCalibration?: SkillMomentShowFeedbackCalibration
  mediaEnabled?: boolean
}): SkillMomentActorIntentCard[] {
  const priority = new Map(schedulePrioritySlugs(args.dramaSchedule).map((slug, index) => [slug, index]))
  const skills = [...args.skills].sort((left, right) => {
    const leftPriority = priority.get(normalizeSkillMomentSlug(left)) ?? Number.MAX_SAFE_INTEGER
    const rightPriority = priority.get(normalizeSkillMomentSlug(right)) ?? Number.MAX_SAFE_INTEGER
    if (leftPriority !== rightPriority) return leftPriority - rightPriority
    return skillLabel(left).localeCompare(skillLabel(right))
  })
  const feedbackInfluence = args.dramaSchedule.feedbackInfluence ?? describeFeedbackInfluence(args.feedbackCalibration)

  return skills.map((skill) => {
    const slug = normalizeSkillMomentSlug(skill)
    const schedulePressure = schedulePressureForSlug({
      schedule: args.dramaSchedule,
      slug,
      feedbackInfluence,
    })
    const template = intentTemplate({
      slug,
      conflict: args.demoContract.conflict,
      directorGoal: args.demoContract.goal,
      mediaEnabled: Boolean(args.mediaEnabled || args.stagePlan?.mediaInstruction),
      wasPrioritized: priority.has(slug),
      feedbackInfluence,
      schedulePressure,
      silenceBoosted: scheduleActivityBoosted(args.dramaSchedule, slug),
    })
    return {
      schemaVersion: 1,
      skillId: skill.id,
      skillName: skill.name,
      handle: skill.handle,
      slug,
      ...template,
    }
  })
}

function actorSlug(skill: Pick<SkillMomentSkillInput, 'id' | 'name' | 'handle'>): string {
  return normalizeSkillMomentSlug(skill)
}

function momentSlug(moment: Pick<SkillMoment, 'skillId' | 'skillName' | 'handle'>): string {
  return normalizeSkillMomentSlug({
    id: moment.skillId,
    name: moment.skillName,
    handle: moment.handle,
  })
}

function critiqueSlug(critique: Pick<SkillMomentCritique, 'criticSkillId' | 'criticSkillName' | 'criticHandle'>): string {
  return normalizeSkillMomentSlug({
    id: critique.criticSkillId,
    name: critique.criticSkillName,
    handle: critique.criticHandle,
  })
}

function reactionSlug(reaction: { skillId: string; skillName: string; handle: string }): string {
  return normalizeSkillMomentSlug({
    id: reaction.skillId,
    name: reaction.skillName,
    handle: reaction.handle,
  })
}

function compactEvidence(value: string): string {
  return compactIntentText(value, value)
}

function beatEvidence(status: SkillMomentBeatCompletion['status'], evidence: string[]): string[] {
  if (evidence.length > 0) return evidence.slice(0, 5)
  if (status === 'complete') return ['规则已完成']
  if (status === 'fallback') return ['规则由 fallback 完成']
  if (status === 'failed') return ['规则执行失败']
  return ['未找到可证明此 beat 的内容']
}

function hasTextAction(text: string, pattern: RegExp): boolean {
  return pattern.test(text.replace(/\s+/g, ' '))
}

function actorBySlug(skills: SkillMomentSkillInput[], slugs: string[]): SkillMomentSkillInput | undefined {
  return slugs
    .map((slug) => skills.find((skill) => actorSlug(skill) === slug))
    .find((skill): skill is SkillMomentSkillInput => Boolean(skill))
}

function conflictLeftSlug(args: {
  actorIntents?: SkillMomentActorIntentCard[]
  moments: SkillMoment[]
}): string {
  if (args.actorIntents?.some((intent) => intent.slug === 'homelander')) return 'homelander'
  return args.actorIntents?.find((intent) => intent.visibility === 'public')?.slug
    ?? (args.moments[0] ? momentSlug(args.moments[0]) : 'homelander')
}

function conflictRightSlug(args: {
  actorIntents?: SkillMomentActorIntentCard[]
}): string {
  if (args.actorIntents?.some((intent) => intent.slug === 'butcher')) return 'butcher'
  return args.actorIntents?.find((intent) => intent.role.includes('反击') || intent.visibility === 'private')?.slug
    ?? 'butcher'
}

export function buildSkillMomentBeatCompletion(args: {
  contract: SkillMomentDemoContract
  actorIntents?: SkillMomentActorIntentCard[]
  moments: SkillMoment[]
  mediaErrors?: string[]
}): SkillMomentBeatCompletion[] {
  const leftSlug = conflictLeftSlug({
    actorIntents: args.actorIntents,
    moments: args.moments,
  })
  const rightSlug = conflictRightSlug({
    actorIntents: args.actorIntents,
  })
  const allySlugs = new Set(['ashley', 'atrain', 'black-noir', 'deep'])
  const bystanderSlugs = new Set(['gazi', 'dongbei-yujie', 'liu-haizhu', 'starlight', 'chomsky', 'hayek'])

  const publicChallengeEvidence = args.moments
    .filter((moment) => momentSlug(moment) === leftSlug || hasTextAction(moment.body, /点名|公开|直播|名单|镜头|交出|定位|天台|城市|大屏/))
    .map((moment) => `${moment.skillName || moment.handle}: ${compactEvidence(moment.body)}`)
  const enemyReplyEvidence: string[] = []
  for (const moment of args.moments) {
    if (momentSlug(moment) === rightSlug && hasTextAction(moment.body, /仅可见|报复|证据|定位|名单|敢|查|爆/)) {
      enemyReplyEvidence.push(`${moment.skillName || moment.handle}: ${compactEvidence(moment.body)}`)
    }
    for (const critique of moment.critiques) {
      if (critiqueSlug(critique) === rightSlug || (momentSlug(moment) === leftSlug && hasTextAction(critique.body, /证据|名单|敢|怕|查|爆|定位/))) {
        enemyReplyEvidence.push(`${critique.criticSkillName || critique.criticHandle} -> ${moment.skillName || moment.handle}: ${compactEvidence(critique.body)}`)
      }
    }
  }

  const allyEvidence: string[] = []
  for (const moment of args.moments) {
    for (const reaction of moment.reactions ?? []) {
      if (allySlugs.has(reactionSlug(reaction))) {
        allyEvidence.push(`${reaction.skillName || reaction.handle} 点赞 ${moment.skillName || moment.handle}`)
      }
    }
    for (const critique of moment.critiques) {
      if (allySlugs.has(critiqueSlug(critique))) {
        allyEvidence.push(`${critique.criticSkillName || critique.criticHandle}: ${compactEvidence(critique.body)}`)
      }
      for (const reaction of critique.reactions ?? []) {
        if (allySlugs.has(reactionSlug(reaction))) {
          allyEvidence.push(`${reaction.skillName || reaction.handle} 点赞评论`)
        }
      }
    }
  }

  const bystanderEvidence: string[] = []
  for (const moment of args.moments) {
    if (bystanderSlugs.has(momentSlug(moment))) {
      bystanderEvidence.push(`${moment.skillName || moment.handle}: ${compactEvidence(moment.body)}`)
    }
    for (const critique of moment.critiques) {
      if (bystanderSlugs.has(critiqueSlug(critique))) {
        bystanderEvidence.push(`${critique.criticSkillName || critique.criticHandle}: ${compactEvidence(critique.body)}`)
      }
    }
  }

  const media = args.moments.flatMap((moment) => moment.media ?? [])
  const mediaFallback = media.filter((entry) => entry.status === 'fallback')
  const mediaReady = media.filter((entry) => entry.status !== 'fallback')
  const mediaRequired = args.contract.requiredBeats.some((beat) => /图|配图|媒体|画面|image|media/i.test(beat))
    || args.actorIntents?.some((intent) => intent.mediaIntent)
  const mediaStatus: SkillMomentBeatCompletion['status'] = mediaReady.length > 0
    ? 'complete'
    : mediaFallback.length > 0
      ? 'fallback'
      : (args.mediaErrors?.length ?? 0) > 0
        ? 'failed'
        : mediaRequired
          ? 'missing'
          : 'complete'
  const mediaEvidence = [
    ...mediaReady.map((entry) => `media ready: ${entry.path}`),
    ...mediaFallback.map((entry) => `media fallback: ${entry.path}`),
    ...(args.mediaErrors ?? []).map((error) => `media error: ${error}`),
  ]

  const completions: SkillMomentBeatCompletion[] = [
    {
      schemaVersion: 1,
      key: 'public_challenge',
      beat: args.contract.requiredBeats.find((beat) => /挑衅|要求|公开/.test(beat)) ?? '主角公开挑衅或抛出要求',
      status: publicChallengeEvidence.length > 0 ? 'complete' : 'missing',
      evidence: beatEvidence(publicChallengeEvidence.length > 0 ? 'complete' : 'missing', publicChallengeEvidence),
    },
    {
      schemaVersion: 1,
      key: 'enemy_reply',
      beat: args.contract.requiredBeats.find((beat) => /死敌|反击|仅可见|埋雷/.test(beat)) ?? '死敌回应或仅可见报复',
      status: enemyReplyEvidence.length > 0 ? 'complete' : 'missing',
      evidence: beatEvidence(enemyReplyEvidence.length > 0 ? 'complete' : 'missing', enemyReplyEvidence),
    },
    {
      schemaVersion: 1,
      key: 'ally_stance',
      beat: args.contract.requiredBeats.find((beat) => /盟友|控评|站队/.test(beat)) ?? '盟友控评或站队',
      status: allyEvidence.length > 0 ? 'complete' : 'missing',
      evidence: beatEvidence(allyEvidence.length > 0 ? 'complete' : 'missing', allyEvidence),
    },
    {
      schemaVersion: 1,
      key: 'bystander_signal',
      beat: args.contract.requiredBeats.find((beat) => /旁观|质疑|拱火|证据/.test(beat)) ?? '旁观者质疑、拱火或给出证据线索',
      status: bystanderEvidence.length > 0 ? 'complete' : 'missing',
      evidence: beatEvidence(bystanderEvidence.length > 0 ? 'complete' : 'missing', bystanderEvidence),
    },
  ]

  if (mediaRequired || mediaStatus !== 'complete') {
    completions.push({
      schemaVersion: 1,
      key: 'media_action',
      beat: args.contract.requiredBeats.find((beat) => /图|配图|媒体|画面|image|media/i.test(beat)) ?? '图片动作落地或失败可见',
      status: mediaStatus,
      evidence: beatEvidence(mediaStatus, mediaEvidence),
    })
  }

  return completions
}

function repairBodyForBeat(beatKey: SkillMomentBeatCompletion['key'], slug: string): string {
  if (beatKey === 'public_challenge') {
    return slug === 'homelander'
      ? '九点整，我把城市大屏切成直播。Butcher 要证据，就站到镜头前说清楚。'
      : '我把话放到明面上：谁有证据，今晚就拿出来。'
  }
  if (beatKey === 'enemy_reply') {
    return '你敢把名单挂出来，我就敢把第一个名字念出来。猜猜是谁签的字？'
  }
  if (beatKey === 'ally_stance') {
    if (slug === 'black-noir') return '已确认，已转发。'
    if (slug === 'atrain') return 'Big city, big screen. 我转了，但别把我放第一排。'
    return '所有账号照这一版转：先说城市安全，再说他亲自出面，不要自己加戏。'
  }
  if (slug === 'liu-haizhu') return '位置发我，我现在过去。别在朋友圈光喊。'
  if (slug === 'gazi') return '哥，这场面别光吵，开个直播间我给你控场。'
  return '哎呀妈呀，这热闹越整越大了，谁手里有真东西赶紧亮出来。'
}

function buildRepairCritique(args: {
  beatKey: SkillMomentBeatCompletion['key']
  targetMoment: SkillMoment
  actor: SkillMomentSkillInput
  createdAt: string
  runId: string
  index: number
}): SkillMomentCritique {
  return {
    id: `${args.targetMoment.id}-repair-${args.beatKey}-${args.index + 1}`,
    parentMomentId: args.targetMoment.id,
    criticSkillId: args.actor.id,
    criticSkillName: args.actor.name,
    criticHandle: args.actor.handle,
    body: repairBodyForBeat(args.beatKey, actorSlug(args.actor)),
    createdAt: args.createdAt,
    artifacts: [
      'agentos_repair_pass',
      `beat_repair:${args.beatKey}`,
      `repair_run:${args.runId}`,
    ],
  }
}

export function applySkillMomentRepairPass(args: {
  roomId: string
  runId: string
  createdAt: string
  moments: SkillMoment[]
  eligibleSkills: SkillMomentSkillInput[]
  beatCompletion: SkillMomentBeatCompletion[]
}): {
  moments: SkillMoment[]
  repairs: SkillMomentRepairRecord[]
} {
  const repairedMoments: SkillMoment[] = args.moments.map((moment) => ({
    ...moment,
    critiques: [...moment.critiques],
    artifacts: moment.artifacts ? [...moment.artifacts] : undefined,
    media: moment.media ? [...moment.media] : undefined,
  }))
  const repairs: SkillMomentRepairRecord[] = []
  const missing = args.beatCompletion.filter((beat) => (
    beat.status === 'missing'
    && beat.key !== 'media_action'
  ))
  if (missing.length === 0) {
    return { moments: repairedMoments, repairs }
  }

  const firstMoment = () => repairedMoments[0]
  for (const beat of missing) {
    if (beat.key === 'public_challenge') {
      const actor = actorBySlug(args.eligibleSkills, ['homelander']) ?? args.eligibleSkills[0]
      if (!actor) continue
      const momentId = `${args.runId}-repair-${beat.key}-${repairs.length + 1}`
      repairedMoments.unshift({
        id: momentId,
        roomId: args.roomId,
        skillId: actor.id,
        skillName: actor.name,
        handle: actor.handle,
        body: repairBodyForBeat(beat.key, actorSlug(actor)),
        confidence: 'medium',
        createdAt: args.createdAt,
        sources: [],
        critiques: [],
        artifacts: [
          'agentos_repair_pass',
          `beat_repair:${beat.key}`,
        ],
      })
      repairs.push({
        schemaVersion: 1,
        beatKey: beat.key,
        createdMomentId: momentId,
        actorSlug: actorSlug(actor),
        artifact: `beat_repair:${beat.key}`,
        reason: '关键公开挑衅 beat 缺失，补最小主贴。',
      })
      continue
    }

    const targetMoment = firstMoment()
    if (!targetMoment) continue
    const actor = beat.key === 'enemy_reply'
      ? actorBySlug(args.eligibleSkills, ['butcher'])
      : beat.key === 'ally_stance'
        ? actorBySlug(args.eligibleSkills, ['ashley', 'atrain', 'black-noir', 'deep'])
        : actorBySlug(args.eligibleSkills, ['liu-haizhu', 'gazi', 'dongbei-yujie', 'starlight'])
    if (!actor) continue
    const critique = buildRepairCritique({
      beatKey: beat.key,
      targetMoment,
      actor,
      createdAt: args.createdAt,
      runId: args.runId,
      index: repairs.length,
    })
    targetMoment.critiques.push(critique)
    repairs.push({
      schemaVersion: 1,
      beatKey: beat.key,
      targetMomentId: targetMoment.id,
      createdCritiqueId: critique.id,
      actorSlug: actorSlug(actor),
      artifact: `beat_repair:${beat.key}`,
      reason: '关键互动 beat 缺失，补最小评论。',
    })
  }

  return { moments: repairedMoments, repairs }
}

export function buildSkillMomentActorActivitySnapshot(args: {
  skills: SkillMomentSkillInput[]
  recentMoments: SkillMoment[]
  currentMoments?: SkillMoment[]
}): SkillMomentActorActivityEntry[] {
  const watchedBoostSlugs = new Set(['gazi', 'dongbei-yujie', 'liu-haizhu'])
  const moments = [...args.recentMoments, ...(args.currentMoments ?? [])]

  return args.skills.map((skill): SkillMomentActorActivityEntry => {
    const slug = actorSlug(skill)
    let lastSpokeAt: string | undefined
    let postCount = 0
    let commentCount = 0
    let reactionCount = 0

    for (const moment of moments) {
      if (momentSlug(moment) === slug) {
        postCount += 1
        if (!lastSpokeAt || moment.createdAt > lastSpokeAt) lastSpokeAt = moment.createdAt
      }
      for (const critique of moment.critiques) {
        if (critiqueSlug(critique) === slug) {
          commentCount += 1
          if (!lastSpokeAt || critique.createdAt > lastSpokeAt) lastSpokeAt = critique.createdAt
        }
        for (const reaction of critique.reactions ?? []) {
          if (reactionSlug(reaction) === slug) {
            reactionCount += 1
            if (!lastSpokeAt || reaction.createdAt > lastSpokeAt) lastSpokeAt = reaction.createdAt
          }
        }
      }
      for (const reaction of moment.reactions ?? []) {
        if (reactionSlug(reaction) === slug) {
          reactionCount += 1
          if (!lastSpokeAt || reaction.createdAt > lastSpokeAt) lastSpokeAt = reaction.createdAt
        }
      }
    }

    const totalActivity = postCount + commentCount + reactionCount
    const silenceStreak = totalActivity === 0 ? Math.min(Math.max(args.recentMoments.length, 1), 3) : 0
    const boosted = watchedBoostSlugs.has(slug) && silenceStreak > 0

    return {
      schemaVersion: 1,
      skillId: skill.id,
      skillName: skill.name,
      handle: skill.handle,
      slug,
      lastSpokeAt,
      silenceStreak,
      postCount,
      commentCount,
      reactionCount,
      boosted,
    }
  })
}

export function buildSkillMomentNextRoundHooks(args: {
  runId: string
  createdAt: string
  moments: SkillMoment[]
  beatCompletion: SkillMomentBeatCompletion[]
  actorActivitySnapshot: SkillMomentActorActivityEntry[]
  relationshipEvents?: SkillMomentRelationshipEvent[]
}): SkillMomentNextRoundHook[] {
  const hooks = new Map<string, SkillMomentNextRoundHook>()
  const addHook = (hook: Omit<SkillMomentNextRoundHook, 'schemaVersion' | 'createdAt'>) => {
    const key = [
      hook.kind,
      hook.actorSlug,
      hook.targetSlug ?? '',
      hook.sourceMomentId ?? '',
      hook.sourceCritiqueId ?? '',
    ].join(':')
    if (!hooks.has(key)) {
      hooks.set(key, {
        schemaVersion: 1,
        createdAt: args.createdAt,
        ...hook,
      })
    }
  }
  const relationshipEvents = args.relationshipEvents ?? buildSkillMomentRelationshipEvents({
    moments: args.moments,
    createdAt: args.createdAt,
  })

  for (const moment of args.moments) {
    const parentSlug = momentSlug(moment)
    if (parentSlug === 'butcher' && hasTextAction(moment.body, /仅可见|报复|证据|定位|名单|爆/)) {
      addHook({
        kind: 'private_revenge',
        actorSlug: 'butcher',
        targetSlug: 'homelander',
        sourceMomentId: moment.id,
        reason: '屠夫留下报复或证据暗线，下一轮应继续推进。',
      })
    }
    for (const critique of moment.critiques) {
      const criticSlug = critiqueSlug(critique)
      if (criticSlug === 'butcher' && parentSlug === 'homelander') {
        addHook({
          kind: 'reply_priority',
          actorSlug: 'homelander',
          targetSlug: 'butcher',
          sourceMomentId: moment.id,
          sourceCritiqueId: critique.id,
          reason: '屠夫公开回应祖国人，下一轮祖国人应优先接招。',
        })
      }
      if (criticSlug === 'homelander' && parentSlug === 'butcher') {
        addHook({
          kind: 'reply_priority',
          actorSlug: 'butcher',
          targetSlug: 'homelander',
          sourceMomentId: moment.id,
          sourceCritiqueId: critique.id,
          reason: '祖国人回应屠夫，下一轮屠夫应继续反击。',
        })
      }
      if (criticSlug === 'butcher' && hasTextAction(critique.body, /仅可见|报复|证据|定位|名单|爆/)) {
        addHook({
          kind: 'private_revenge',
          actorSlug: 'butcher',
          targetSlug: 'homelander',
          sourceMomentId: moment.id,
          sourceCritiqueId: critique.id,
          reason: '屠夫评论里出现报复或证据暗线。',
        })
      }
    }
  }

  for (const event of relationshipEvents) {
    if (event.kind === 'like' && event.targetSlug) {
      addHook({
        kind: 'stance_pressure',
        actorSlug: event.actorSlug,
        targetSlug: event.targetSlug,
        sourceMomentId: event.sourceMomentId,
        sourceCritiqueId: event.sourceCritiqueId,
        reason: '点赞已被观众读成站队，下一轮必须兑现立场、撤退或被反噬。',
      })
    }
    if (event.kind === 'private_post') {
      addHook({
        kind: 'leak_escalation',
        actorSlug: event.actorSlug,
        targetSlug: event.targetSlug,
        sourceMomentId: event.sourceMomentId,
        sourceCritiqueId: event.sourceCritiqueId,
        reason: '非公开内容留下截图或误传风险，下一轮需要升级处理。',
      })
    }
    if (event.kind === 'leak_risk') {
      addHook({
        kind: 'leak_escalation',
        actorSlug: event.actorSlug,
        targetSlug: event.targetSlug,
        sourceMomentId: event.sourceMomentId,
        sourceCritiqueId: event.sourceCritiqueId,
        reason: '内容已经出现外泄风险，下一轮必须让外泄改变局势。',
      })
    }
  }

  for (const beat of args.beatCompletion) {
    if (beat.key === 'media_action' && beat.status === 'failed') {
      addHook({
        kind: 'media_retry',
        actorSlug: 'homelander',
        reason: '本轮图片动作失败，下一轮应优先重试或使用 fallback。',
      })
    }
  }

  for (const actor of args.actorActivitySnapshot) {
    if (actor.boosted) {
      addHook({
        kind: 'activity_boost',
        actorSlug: actor.slug,
        reason: `${actor.skillName || actor.handle} 最近沉默，下一轮提高围观层出场权重。`,
      })
    }
  }

  return Array.from(hooks.values()).slice(0, 12)
}

export function inferSkillMomentVisibility(text: string, artifacts?: string[]): SkillMomentVisibility {
  const normalized = text.replace(/\s+/g, ' ')
  if (/截图|外泄|转发出去|被转发|被截/.test(normalized)) return 'leaked'
  if (artifacts?.includes('private_visibility_mock') || /仅自己可见|仅可见|私密|只给/.test(normalized)) return 'private'
  if (/仅.*可见|只让.*看见|只给.*看/.test(normalized)) return 'limited'
  return 'public'
}

export function applySkillMomentVisibility(moments: SkillMoment[]): SkillMoment[] {
  return moments.map((moment) => ({
    ...moment,
    visibility: moment.visibility ?? inferSkillMomentVisibility(moment.body, moment.artifacts),
    critiques: moment.critiques.map((critique) => ({
      ...critique,
      visibility: critique.visibility ?? inferSkillMomentVisibility(critique.body, critique.artifacts),
    })),
  }))
}

export function buildSkillMomentRelationshipEvents(args: {
  moments: SkillMoment[]
  createdAt: string
}): SkillMomentRelationshipEvent[] {
  const events: SkillMomentRelationshipEvent[] = []
  const add = (event: Omit<SkillMomentRelationshipEvent, 'schemaVersion' | 'createdAt'>) => {
    events.push({
      schemaVersion: 1,
      createdAt: args.createdAt,
      ...event,
    })
  }

  for (const moment of args.moments) {
    const parentSlug = momentSlug(moment)
    if (moment.visibility === 'private' || moment.visibility === 'limited') {
      add({
        kind: 'private_post',
        actorSlug: parentSlug,
        sourceMomentId: moment.id,
        reason: `${moment.skillName || moment.handle} 发布了非公开朋友圈。`,
      })
    }
    if (moment.visibility === 'leaked') {
      add({
        kind: 'leak_risk',
        actorSlug: parentSlug,
        sourceMomentId: moment.id,
        reason: `${moment.skillName || moment.handle} 的内容出现截图或外泄风险。`,
      })
    }
    for (const reaction of moment.reactions ?? []) {
      add({
        kind: 'like',
        actorSlug: reactionSlug(reaction),
        targetSlug: parentSlug,
        sourceMomentId: moment.id,
        reason: `${reaction.skillName || reaction.handle} 点赞 ${moment.skillName || moment.handle}。`,
      })
    }
    for (const critique of moment.critiques) {
      const criticSlug = critiqueSlug(critique)
      add({
        kind: 'reply',
        actorSlug: criticSlug,
        targetSlug: parentSlug,
        sourceMomentId: moment.id,
        sourceCritiqueId: critique.id,
        reason: `${critique.criticSkillName || critique.criticHandle} 回应 ${moment.skillName || moment.handle}。`,
      })
      if (critique.visibility === 'private' || critique.visibility === 'limited') {
        add({
          kind: 'private_post',
          actorSlug: criticSlug,
          targetSlug: parentSlug,
          sourceMomentId: moment.id,
          sourceCritiqueId: critique.id,
          reason: `${critique.criticSkillName || critique.criticHandle} 用非公开评论留下暗线。`,
        })
      }
      if (critique.visibility === 'leaked') {
        add({
          kind: 'leak_risk',
          actorSlug: criticSlug,
          targetSlug: parentSlug,
          sourceMomentId: moment.id,
          sourceCritiqueId: critique.id,
          reason: `${critique.criticSkillName || critique.criticHandle} 的评论出现截图或外泄风险。`,
        })
      }
      for (const reaction of critique.reactions ?? []) {
        add({
          kind: 'like',
          actorSlug: reactionSlug(reaction),
          targetSlug: criticSlug,
          sourceMomentId: moment.id,
          sourceCritiqueId: critique.id,
          reason: `${reaction.skillName || reaction.handle} 点赞 ${critique.criticSkillName || critique.criticHandle} 的评论。`,
        })
      }
    }
  }

  return events.slice(0, 80)
}

function stateForActor(args: {
  slug: string
  intent?: SkillMomentActorIntentCard
  hooks: SkillMomentNextRoundHook[]
  activity?: SkillMomentActorActivityEntry
  relationships: SkillMomentRelationshipEvent[]
}): Pick<SkillMomentActorStateCard, 'state' | 'label' | 'reason' | 'nextPressure'> {
  const { slug, intent, hooks, activity, relationships } = args
  if (hooks.some((hook) => hook.actorSlug === slug && hook.kind === 'leak_escalation')) {
    return {
      state: 'evidence',
      label: '外泄升级',
      reason: '上一轮非公开内容或截图风险已经变成下一轮后果。',
      nextPressure: '处理截图、误传或公开爆料的后果。',
    }
  }
  if (hooks.some((hook) => hook.actorSlug === slug && hook.kind === 'private_revenge')) {
    return {
      state: 'evidence',
      label: '准备爆料',
      reason: '下一轮钩子里有报复或证据暗线。',
      nextPressure: '继续推进证据线，不要只骂人。',
    }
  }
  if (hooks.some((hook) => hook.actorSlug === slug && hook.kind === 'reply_priority')) {
    return {
      state: 'grudge',
      label: '记仇接招',
      reason: '被安排优先回应上一轮点名。',
      nextPressure: '必须回应具体对象。',
    }
  }
  if (hooks.some((hook) => hook.actorSlug === slug && hook.kind === 'stance_pressure')) {
    return {
      state: 'clout',
      label: '站队承压',
      reason: '上一轮点赞已经被观众读成站队。',
      nextPressure: '必须把点赞兑现为立场、撤退或反噬。',
    }
  }
  if (intent?.role.includes('公关')) {
    return {
      state: 'spin',
      label: '控评',
      reason: '角色定位是危机公关，负责统一话术。',
      nextPressure: '压住舆论但暴露紧张感。',
    }
  }
  if (relationships.some((event) => event.actorSlug === slug && event.kind === 'like')) {
    return {
      state: 'clout',
      label: '蹭热度',
      reason: '点赞行为会变成下一轮社交压力。',
      nextPressure: '点赞必须带来站队后果。',
    }
  }
  if (activity?.boosted) {
    return {
      state: 'watching',
      label: '被导演推上场',
      reason: '最近沉默，调度器提高围观层出场权重。',
      nextPressure: '用生活流短句拱火。',
    }
  }
  if (intent?.risk?.includes('怕') || intent?.goal.includes('自保')) {
    return {
      state: 'fear',
      label: '自保',
      reason: intent.risk || intent.goal,
      nextPressure: '站队但不能太勇。',
    }
  }
  return {
    state: 'watching',
    label: '观察',
    reason: intent?.memory || '等待能推动冲突的时机。',
    nextPressure: intent?.nextAction,
  }
}

export function buildSkillMomentActorStateCards(args: {
  skills: SkillMomentSkillInput[]
  actorIntents: SkillMomentActorIntentCard[]
  nextRoundHooks: SkillMomentNextRoundHook[]
  actorActivitySnapshot: SkillMomentActorActivityEntry[]
  relationshipEvents: SkillMomentRelationshipEvent[]
}): SkillMomentActorStateCard[] {
  const intents = new Map(args.actorIntents.map((intent) => [intent.slug, intent]))
  const activity = new Map(args.actorActivitySnapshot.map((entry) => [entry.slug, entry]))
  return args.skills.map((skill): SkillMomentActorStateCard => {
    const slug = actorSlug(skill)
    const state = stateForActor({
      slug,
      intent: intents.get(slug),
      hooks: args.nextRoundHooks,
      activity: activity.get(slug),
      relationships: args.relationshipEvents,
    })
    return {
      schemaVersion: 1,
      skillId: skill.id,
      skillName: skill.name,
      handle: skill.handle,
      slug,
      ...state,
    }
  })
}

function textLengthBucket(text: string): number {
  const length = text.replace(/\s+/g, '').length
  return Math.round(length / 8) * 8
}

export function buildSkillMomentShowQualityIssues(args: {
  moments: SkillMoment[]
  beatCompletion: SkillMomentBeatCompletion[]
  relationshipEvents: SkillMomentRelationshipEvent[]
}): SkillMomentShowQualityIssue[] {
  const texts = args.moments.flatMap((moment) => [
    moment.body,
    ...moment.critiques.map((critique) => critique.body),
  ])
  const bannedHits = texts.filter((text) => /我回来了|我复活了|已点赞|欢迎回来|Big moment/.test(text))
  const genericHits = texts.filter((text) => /^(已点赞|欢迎回来|Big moment|收到|转发)$/i.test(text.trim()))
  const critiqueBodies = args.moments.flatMap((moment) => moment.critiques.map((critique) => critique.body))
  const buckets = new Map<number, number>()
  for (const body of critiqueBodies) {
    const bucket = textLengthBucket(body)
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1)
  }
  const flatCommentLength = critiqueBodies.length >= 4
    && Math.max(...Array.from(buckets.values())) / critiqueBodies.length > 0.75
  const visualHits = texts.filter((text) => /镜头|画面|照片|配图|天台|城市|大屏|直播|截图|定位|现场|灯|camera|image|screen/i.test(text))
  const relationshipChanged = args.relationshipEvents.some((event) => event.kind === 'reply' || event.kind === 'private_post' || event.kind === 'like')
  const missingBeats = args.beatCompletion.filter((beat) => beat.status === 'missing' || beat.status === 'failed')

  return [{
    schemaVersion: 1,
    key: 'banned_phrase',
    severity: bannedHits.length > 0 ? 'fail' : 'info',
    status: bannedHits.length > 0 ? 'failed' : 'clear',
    summary: bannedHits.length > 0 ? '出现低价值复读短语' : '未命中禁用复读短语',
    evidence: bannedHits.slice(0, 5),
  }, {
    schemaVersion: 1,
    key: 'robotic_reply',
    severity: genericHits.length > 0 ? 'warn' : 'info',
    status: genericHits.length > 0 ? 'risk' : 'clear',
    summary: genericHits.length > 0 ? '评论有机器式短回复风险' : '未发现纯机器式短回复',
    evidence: genericHits.slice(0, 5),
  }, {
    schemaVersion: 1,
    key: 'flat_comment_length',
    severity: flatCommentLength ? 'warn' : 'info',
    status: flatCommentLength ? 'risk' : 'clear',
    summary: flatCommentLength ? '评论长度过于一致' : '评论长度没有明显机械一致',
    evidence: Array.from(buckets.entries()).map(([bucket, count]) => `${bucket} chars: ${count}`).slice(0, 5),
  }, {
    schemaVersion: 1,
    key: 'weak_visuality',
    severity: visualHits.length === 0 ? 'warn' : 'info',
    status: visualHits.length === 0 ? 'risk' : 'clear',
    summary: visualHits.length === 0 ? '缺少具体画面词' : '已有具体画面线索',
    evidence: visualHits.slice(0, 5),
  }, {
    schemaVersion: 1,
    key: 'no_relationship_change',
    severity: !relationshipChanged || missingBeats.length > 0 ? 'warn' : 'info',
    status: !relationshipChanged || missingBeats.length > 0 ? 'risk' : 'clear',
    summary: !relationshipChanged
      ? '没有形成关系事件'
      : missingBeats.length > 0
        ? '有未完成 beat，关系变化可能不足'
        : '已有关系事件和完整 beat',
    evidence: [
      ...args.relationshipEvents.slice(0, 5).map((event) => `${event.kind}: ${event.actorSlug}${event.targetSlug ? ` -> ${event.targetSlug}` : ''}`),
      ...missingBeats.map((beat) => `missing: ${beat.key}`),
    ].slice(0, 8),
  }]
}

export function buildSkillMomentBrowserQueueSnapshot(args: {
  moments: SkillMoment[]
  mediaErrors: string[]
  mediaFallbacks: string[]
}): SkillMomentBrowserQueueSnapshot {
  const media = args.moments.flatMap((moment) => moment.media ?? [])
  const fallback = media.filter((entry) => entry.status === 'fallback').length + args.mediaFallbacks.length
  const captured = media.filter((entry) => entry.status !== 'fallback').length
  const failed = args.mediaErrors.length
  const requested = captured + failed + fallback
  return {
    schemaVersion: 1,
    requested,
    captured,
    failed,
    fallback,
    state: captured > 0
      ? 'captured'
      : fallback > 0
        ? 'fallback'
        : failed > 0
          ? 'failed'
          : 'idle',
    latestEvidence: args.mediaFallbacks[0] ?? args.mediaErrors[0] ?? media[0]?.path,
  }
}

export function buildSkillMomentJudgeRequest(args: {
  roomId: string
  moments: SkillMoment[]
  actorStateCards: SkillMomentActorStateCard[]
  showQualityIssues: SkillMomentShowQualityIssue[]
}): SkillMomentJudgeRequest {
  const sample = args.moments.slice(0, 3).map((moment) => [
    `${moment.skillName} ${moment.handle}: ${moment.body}`,
    ...moment.critiques.slice(0, 4).map((critique) => `  ${critique.criticSkillName} ${critique.criticHandle}: ${critique.body}`),
  ].join('\n')).join('\n\n')
  return {
    schemaVersion: 1,
    mode: 'optional_llm_judge',
    criteria: [
      '角色是否像自己，而不是通用机器人',
      '冲突是否升级',
      '是否有具体画面',
      '评论长短是否自然',
      '下一轮是否有可继续的钩子',
    ],
    prompt: [
      `你是 AgentOS Theater 的可选节目效果评委。请评估 #${args.roomId} 最近一轮朋友圈。`,
      '',
      '角色状态:',
      args.actorStateCards.slice(0, 8).map((card) => `- ${card.skillName}: ${card.label} (${card.reason})`).join('\n'),
      '',
      '自动质检:',
      args.showQualityIssues.map((issue) => `- ${issue.key}: ${issue.status} ${issue.summary}`).join('\n'),
      '',
      '朋友圈样本:',
      sample,
      '',
      '输出 JSON: {"score":0-100,"verdict":"进化|不变|退化","reason":"...","next_director_note":"..."}',
    ].join('\n'),
  }
}
