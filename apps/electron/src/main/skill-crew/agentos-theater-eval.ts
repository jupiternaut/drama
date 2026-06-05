import type {
  SkillMoment,
  SkillMomentActorActivityEntry,
  SkillMomentActorIntentCard,
  SkillMomentActorStateCard,
  SkillMomentBeatCompletion,
  SkillMomentBrowserQueueSnapshot,
  SkillMomentDemoContract,
  SkillMomentNextRoundHook,
  SkillMomentRelationshipEvent,
  SkillMomentRepairRecord,
  SkillMomentShowQualityIssue,
} from '../../shared/types'
import { normalizeSkillMomentSlug } from './room-policies'

export type AgentOSTheaterRelationshipEventExpectation = {
  kind: SkillMomentRelationshipEvent['kind']
  actorSlug?: string
  targetSlug?: string
}

export type AgentOSTheaterActorStateCardExpectation = {
  slug?: string
  state?: SkillMomentActorStateCard['state']
  label?: string
}

export type AgentOSTheaterShowQualityIssueExpectation = {
  key: SkillMomentShowQualityIssue['key']
  status?: SkillMomentShowQualityIssue['status']
  maxSeverity?: SkillMomentShowQualityIssue['severity']
}

export type AgentOSTheaterBrowserQueueSnapshotExpectation = {
  state?: SkillMomentBrowserQueueSnapshot['state']
  minRequested?: number
  minCaptured?: number
  minFailed?: number
  maxFailed?: number
  minFallback?: number
}

export type AgentOSTheaterEvalNextRoundHook = Omit<SkillMomentNextRoundHook, 'kind'> & {
  kind: string
}

export type AgentOSTheaterRunSummaryExpectation = {
  runId?: string
  roleGoal?: string
  action?: string
  relationshipChange?: string
  nextRoundHook?: string
  requiredBeats?: string[]
  requiredHooks?: string[]
  requiredRelationshipEvents?: AgentOSTheaterRelationshipEventExpectation[]
  requiredActorStateCards?: AgentOSTheaterActorStateCardExpectation[]
  requiredBrowserQueueSnapshot?: AgentOSTheaterBrowserQueueSnapshotExpectation
}

export type AgentOSTheaterEvalCase = {
  schemaVersion: 1
  id: string
  roomId: string
  description?: string
  artifactDir?: string
  runs?: number
  expect: {
    noBannedPhrases?: string[]
    requiredBeats?: string[]
    requiredHooks?: string[]
    requiredRunSummaries?: AgentOSTheaterRunSummaryExpectation[]
    minActiveLocalActors?: number
    mediaMayFallback?: boolean
    requireMediaFallback?: boolean
    requireRepair?: boolean
    requiredRelationshipEvents?: AgentOSTheaterRelationshipEventExpectation[]
    requiredActorStateCards?: AgentOSTheaterActorStateCardExpectation[]
    requiredShowQualityIssues?: AgentOSTheaterShowQualityIssueExpectation[]
    requiredBrowserQueueSnapshot?: AgentOSTheaterBrowserQueueSnapshotExpectation
  }
}

export type AgentOSTheaterEvalRunRecord = {
  runId?: string
  roomId?: string
  demoContract?: SkillMomentDemoContract
  actorIntents?: SkillMomentActorIntentCard[]
  beatCompletion?: SkillMomentBeatCompletion[]
  repairs?: SkillMomentRepairRecord[]
  nextRoundHooks?: AgentOSTheaterEvalNextRoundHook[]
  actorActivitySnapshot?: SkillMomentActorActivityEntry[]
  relationshipEvents?: SkillMomentRelationshipEvent[]
  actorStateCards?: SkillMomentActorStateCard[]
  showQualityIssues?: SkillMomentShowQualityIssue[]
  browserQueueSnapshot?: SkillMomentBrowserQueueSnapshot
  mediaErrorCount?: number
  mediaFallbackCount?: number
  mediaFallbackReasons?: string[]
  momentCount?: number
  criticCount?: number
  status?: string
}

export type AgentOSTheaterEvalArtifacts = {
  moments: SkillMoment[]
  runs: AgentOSTheaterEvalRunRecord[]
}

export type AgentOSTheaterEvalCheck = {
  id: string
  label: string
  passed: boolean
  detail: string
  evidence?: string[]
}

export type AgentOSTheaterEvalResult = {
  caseId: string
  success: boolean
  summary: string
  checks: AgentOSTheaterEvalCheck[]
}

function compactEvidence(value: string, limit = 140): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized
}

function momentActorSlug(moment: Pick<SkillMoment, 'skillId' | 'skillName' | 'handle'>): string {
  return normalizeSkillMomentSlug({
    id: moment.skillId,
    name: moment.skillName,
    handle: moment.handle,
  })
}

function critiqueActorSlug(critique: SkillMoment['critiques'][number]): string {
  return normalizeSkillMomentSlug({
    id: critique.criticSkillId,
    name: critique.criticSkillName,
    handle: critique.criticHandle,
  })
}

function reactionActorSlug(reaction: { skillId: string; skillName: string; handle: string }): string {
  return normalizeSkillMomentSlug({
    id: reaction.skillId,
    name: reaction.skillName,
    handle: reaction.handle,
  })
}

function allMomentTexts(moments: SkillMoment[]): string[] {
  return moments.flatMap((moment) => [
    moment.body,
    ...moment.critiques.map((critique) => critique.body),
  ])
}

function latestRunForRoom(runs: AgentOSTheaterEvalRunRecord[], roomId: string): AgentOSTheaterEvalRunRecord | undefined {
  return [...runs].reverse().find((run) => !run.roomId || run.roomId === roomId)
}

function allBeatCompletions(runs: AgentOSTheaterEvalRunRecord[], roomId: string): SkillMomentBeatCompletion[] {
  return runs
    .filter((run) => !run.roomId || run.roomId === roomId)
    .flatMap((run) => run.beatCompletion ?? [])
}

function beatIsAccepted(beat: SkillMomentBeatCompletion, mediaMayFallback: boolean | undefined): boolean {
  if (beat.status === 'complete') return true
  if (beat.status === 'fallback') return Boolean(mediaMayFallback)
  return false
}

function activeLocalActorSlugs(moments: SkillMoment[]): string[] {
  const localActors = new Set(['gazi', 'dongbei-yujie', 'liu-haizhu'])
  const active = new Set<string>()
  for (const moment of moments) {
    const momentSlug = momentActorSlug(moment)
    if (localActors.has(momentSlug)) active.add(momentSlug)
    for (const critique of moment.critiques) {
      const critiqueSlug = critiqueActorSlug(critique)
      if (localActors.has(critiqueSlug)) active.add(critiqueSlug)
      for (const reaction of critique.reactions ?? []) {
        const reactionSlug = reactionActorSlug(reaction)
        if (localActors.has(reactionSlug)) active.add(reactionSlug)
      }
    }
    for (const reaction of moment.reactions ?? []) {
      const reactionSlug = reactionActorSlug(reaction)
      if (localActors.has(reactionSlug)) active.add(reactionSlug)
    }
  }
  return Array.from(active).sort()
}

function relationshipExpectationMatches(
  event: SkillMomentRelationshipEvent,
  expectation: AgentOSTheaterRelationshipEventExpectation,
): boolean {
  return event.kind === expectation.kind
    && (!expectation.actorSlug || event.actorSlug === expectation.actorSlug)
    && (!expectation.targetSlug || event.targetSlug === expectation.targetSlug)
}

function actorStateCardExpectationMatches(
  card: SkillMomentActorStateCard,
  expectation: AgentOSTheaterActorStateCardExpectation,
): boolean {
  return (!expectation.slug || card.slug === expectation.slug)
    && (!expectation.state || card.state === expectation.state)
    && (!expectation.label || card.label === expectation.label)
}

const showQualitySeverityRank: Record<SkillMomentShowQualityIssue['severity'], number> = {
  info: 0,
  warn: 1,
  fail: 2,
}

function showQualityIssueExpectationMatches(
  issue: SkillMomentShowQualityIssue,
  expectation: AgentOSTheaterShowQualityIssueExpectation,
): boolean {
  return issue.key === expectation.key
    && (!expectation.status || issue.status === expectation.status)
    && (!expectation.maxSeverity || showQualitySeverityRank[issue.severity] <= showQualitySeverityRank[expectation.maxSeverity])
}

function browserQueueSnapshotExpectationMatches(
  snapshot: SkillMomentBrowserQueueSnapshot,
  expectation: AgentOSTheaterBrowserQueueSnapshotExpectation,
): boolean {
  return (!expectation.state || snapshot.state === expectation.state)
    && (expectation.minRequested === undefined || snapshot.requested >= expectation.minRequested)
    && (expectation.minCaptured === undefined || snapshot.captured >= expectation.minCaptured)
    && (expectation.minFailed === undefined || snapshot.failed >= expectation.minFailed)
    && (expectation.maxFailed === undefined || snapshot.failed <= expectation.maxFailed)
    && (expectation.minFallback === undefined || snapshot.fallback >= expectation.minFallback)
}

function browserQueueSnapshotEvidence(snapshot: SkillMomentBrowserQueueSnapshot): string {
  const counts = `requested=${snapshot.requested}, captured=${snapshot.captured}, failed=${snapshot.failed}, fallback=${snapshot.fallback}`
  return snapshot.latestEvidence
    ? `${snapshot.state}: ${counts}; ${compactEvidence(snapshot.latestEvidence)}`
    : `${snapshot.state}: ${counts}`
}

function runSummaryLabel(expectation: AgentOSTheaterRunSummaryExpectation, index: number): string {
  return expectation.runId ?? `round-${index + 1}`
}

function findExpectedRun(
  roomRuns: AgentOSTheaterEvalRunRecord[],
  expectation: AgentOSTheaterRunSummaryExpectation,
  index: number,
): AgentOSTheaterEvalRunRecord | undefined {
  if (expectation.runId) {
    return roomRuns.find((run) => run.runId === expectation.runId)
  }
  return roomRuns[index]
}

function beatEvidence(beat: SkillMomentBeatCompletion): string {
  const evidence = beat.evidence.length > 0
    ? beat.evidence.map(compactEvidence).join('; ')
    : 'no evidence'
  return `${beat.key}/${beat.status}: ${beat.beat} - ${evidence}`
}

function hookEvidence(hook: AgentOSTheaterEvalNextRoundHook): string {
  return `${hook.kind}: ${hook.actorSlug}${hook.targetSlug ? ` -> ${hook.targetSlug}` : ''} - ${compactEvidence(hook.reason)}`
}

function relationshipEvidence(event: SkillMomentRelationshipEvent): string {
  return `${event.kind}: ${event.actorSlug}${event.targetSlug ? ` -> ${event.targetSlug}` : ''} - ${compactEvidence(event.reason)}`
}

function actorStateEvidence(card: SkillMomentActorStateCard): string {
  return `${card.slug}: ${card.state}/${card.label} - ${compactEvidence(card.reason)}`
}

export function evaluateAgentOSTheaterCase(
  evalCase: AgentOSTheaterEvalCase,
  artifacts: AgentOSTheaterEvalArtifacts,
): AgentOSTheaterEvalResult {
  const checks: AgentOSTheaterEvalCheck[] = []
  const roomRuns = artifacts.runs.filter((run) => !run.roomId || run.roomId === evalCase.roomId)
  const latestRun = latestRunForRoom(artifacts.runs, evalCase.roomId)
  const texts = allMomentTexts(artifacts.moments)

  if (evalCase.runs !== undefined) {
    checks.push({
      id: 'run-count',
      label: 'expected run count',
      passed: roomRuns.length >= evalCase.runs,
      detail: `expected >= ${evalCase.runs}, got ${roomRuns.length}`,
    })
  }

  for (const [index, expectedRun] of (evalCase.expect.requiredRunSummaries ?? []).entries()) {
    const run = findExpectedRun(roomRuns, expectedRun, index)
    const label = runSummaryLabel(expectedRun, index)
    const missingFlowFields = [
      expectedRun.roleGoal ? undefined : 'roleGoal',
      expectedRun.action ? undefined : 'action',
      expectedRun.relationshipChange ? undefined : 'relationshipChange',
      expectedRun.nextRoundHook ? undefined : 'nextRoundHook',
    ].filter((field): field is string => Boolean(field))
    checks.push({
      id: `run-summary:${label}:flow`,
      label: 'round replay flow',
      passed: missingFlowFields.length === 0,
      detail: missingFlowFields.length === 0
        ? 'role goal -> action -> relationship change -> next-round hook documented'
        : `missing flow field(s): ${missingFlowFields.join(', ')}`,
      evidence: [
        expectedRun.roleGoal ? `role goal: ${expectedRun.roleGoal}` : undefined,
        expectedRun.action ? `action: ${expectedRun.action}` : undefined,
        expectedRun.relationshipChange ? `relationship change: ${expectedRun.relationshipChange}` : undefined,
        expectedRun.nextRoundHook ? `next-round hook: ${expectedRun.nextRoundHook}` : undefined,
      ].filter((item): item is string => Boolean(item)),
    })

    const runBeats = run?.beatCompletion ?? []
    const acceptedBeats = runBeats.filter((beat) => beatIsAccepted(beat, evalCase.expect.mediaMayFallback))
    const missingRequiredBeats = (expectedRun.requiredBeats ?? []).filter((requiredBeat) => (
      !runBeats.some((beat) => beat.key === requiredBeat && beatIsAccepted(beat, evalCase.expect.mediaMayFallback))
    ))
    const acceptedBeatsWithoutEvidence = acceptedBeats.filter((beat) => beat.evidence.length === 0)
    checks.push({
      id: `run-summary:${label}:beats`,
      label: 'round beat summary',
      passed: Boolean(run)
        && acceptedBeats.length > 0
        && missingRequiredBeats.length === 0
        && acceptedBeatsWithoutEvidence.length === 0,
      detail: !run
        ? 'missing run'
        : missingRequiredBeats.length > 0
          ? `missing accepted beat(s): ${missingRequiredBeats.join(', ')}`
          : acceptedBeatsWithoutEvidence.length > 0
            ? `accepted beat(s) missing evidence: ${acceptedBeatsWithoutEvidence.map((beat) => beat.key).join(', ')}`
            : `${acceptedBeats.length} accepted beat summary item(s)`,
      evidence: acceptedBeats.slice(0, 8).map(beatEvidence),
    })

    const runRelationships = run?.relationshipEvents ?? []
    const missingRequiredRelationships = (expectedRun.requiredRelationshipEvents ?? []).filter((expectedEvent) => (
      !runRelationships.some((event) => relationshipExpectationMatches(event, expectedEvent))
    ))
    const relationshipsWithoutEvidence = runRelationships.filter((event) => !event.actorSlug || !event.reason)
    checks.push({
      id: `run-summary:${label}:relationships`,
      label: 'round relationship summary',
      passed: Boolean(run)
        && runRelationships.length > 0
        && missingRequiredRelationships.length === 0
        && relationshipsWithoutEvidence.length === 0,
      detail: !run
        ? 'missing run'
        : missingRequiredRelationships.length > 0
          ? `missing relationship expectation(s): ${missingRequiredRelationships.map((event) => event.kind).join(', ')}`
          : relationshipsWithoutEvidence.length > 0
            ? `${relationshipsWithoutEvidence.length} relationship event(s) missing actor/reason`
            : `${runRelationships.length} relationship event(s) summarized`,
      evidence: runRelationships.slice(0, 8).map(relationshipEvidence),
    })

    const runStateCards = run?.actorStateCards ?? []
    const missingRequiredStateCards = (expectedRun.requiredActorStateCards ?? []).filter((expectedCard) => (
      !runStateCards.some((card) => actorStateCardExpectationMatches(card, expectedCard))
    ))
    const stateCardsWithoutEvidence = runStateCards.filter((card) => !card.slug || !card.state || !card.label || !card.reason)
    checks.push({
      id: `run-summary:${label}:states`,
      label: 'round actor state summary',
      passed: Boolean(run)
        && runStateCards.length > 0
        && missingRequiredStateCards.length === 0
        && stateCardsWithoutEvidence.length === 0,
      detail: !run
        ? 'missing run'
        : missingRequiredStateCards.length > 0
          ? `missing actor state expectation(s): ${missingRequiredStateCards.map((card) => `${card.slug ?? '*'}:${card.state ?? '*'}`).join(', ')}`
          : stateCardsWithoutEvidence.length > 0
            ? `${stateCardsWithoutEvidence.length} actor state card(s) missing slug/state/label/reason`
            : `${runStateCards.length} actor state card(s) summarized`,
      evidence: runStateCards.slice(0, 8).map(actorStateEvidence),
    })

    const runHooks = run?.nextRoundHooks ?? []
    const missingRequiredHooks = (expectedRun.requiredHooks ?? []).filter((requiredHook) => (
      !runHooks.some((hook) => hook.kind === requiredHook)
    ))
    const hooksWithoutEvidence = runHooks.filter((hook) => !hook.kind || !hook.actorSlug || !hook.reason)
    checks.push({
      id: `run-summary:${label}:hooks`,
      label: 'round next-hook summary',
      passed: Boolean(run)
        && runHooks.length > 0
        && missingRequiredHooks.length === 0
        && hooksWithoutEvidence.length === 0,
      detail: !run
        ? 'missing run'
        : missingRequiredHooks.length > 0
          ? `missing next-round hook kind(s): ${missingRequiredHooks.join(', ')}`
          : hooksWithoutEvidence.length > 0
            ? `${hooksWithoutEvidence.length} hook(s) missing kind/actor/reason`
            : `${runHooks.length} next-round hook(s) summarized`,
      evidence: runHooks.slice(0, 8).map(hookEvidence),
    })

    const browserExpectation = expectedRun.requiredBrowserQueueSnapshot
    const browserSnapshot = run?.browserQueueSnapshot
    const browserMatches = browserSnapshot
      ? (!browserExpectation || browserQueueSnapshotExpectationMatches(browserSnapshot, browserExpectation))
      : false
    checks.push({
      id: `run-summary:${label}:browser`,
      label: 'round browser queue summary',
      passed: Boolean(run) && browserMatches,
      detail: !run
        ? 'missing run'
        : !browserSnapshot
          ? 'missing browser queue snapshot'
          : browserMatches
            ? 'browser queue snapshot summarized'
            : 'browser queue snapshot did not match expected state/counts',
      evidence: browserSnapshot ? [browserQueueSnapshotEvidence(browserSnapshot)] : [],
    })
  }

  const bannedPhrases = evalCase.expect.noBannedPhrases ?? []
  if (bannedPhrases.length > 0) {
    const hits = texts.flatMap((text) => (
      bannedPhrases
        .filter((phrase) => text.includes(phrase))
        .map((phrase) => `${phrase}: ${compactEvidence(text)}`)
    ))
    checks.push({
      id: 'no-banned-phrases',
      label: 'no banned low-value phrases',
      passed: hits.length === 0,
      detail: hits.length === 0 ? 'no banned phrase hit' : `${hits.length} banned phrase hit(s)`,
      evidence: hits.slice(0, 8),
    })
  }

  for (const requiredBeat of evalCase.expect.requiredBeats ?? []) {
    const matching = allBeatCompletions(artifacts.runs, evalCase.roomId)
      .filter((beat) => beat.key === requiredBeat)
    const accepted = matching.find((beat) => beatIsAccepted(beat, evalCase.expect.mediaMayFallback))
    checks.push({
      id: `beat:${requiredBeat}`,
      label: `required beat ${requiredBeat}`,
      passed: Boolean(accepted),
      detail: accepted
        ? `${accepted.status}: ${accepted.beat}`
        : `missing accepted completion for ${requiredBeat}`,
      evidence: accepted?.evidence,
    })
  }

  const hooks = roomRuns.flatMap((run) => run.nextRoundHooks ?? [])
  for (const requiredHook of evalCase.expect.requiredHooks ?? []) {
    const matching = hooks.filter((hook) => hook.kind === requiredHook)
    checks.push({
      id: `hook:${requiredHook}`,
      label: `required next-round hook ${requiredHook}`,
      passed: matching.length > 0,
      detail: matching.length > 0
        ? `${matching.length} hook(s) found`
        : `missing ${requiredHook}`,
      evidence: matching.slice(0, 5).map((hook) => `${hook.actorSlug}${hook.targetSlug ? ` -> ${hook.targetSlug}` : ''}: ${hook.reason}`),
    })
  }

  const relationshipEvents = roomRuns.flatMap((run) => run.relationshipEvents ?? [])
  for (const expectedEvent of evalCase.expect.requiredRelationshipEvents ?? []) {
    const matching = relationshipEvents.filter((event) => relationshipExpectationMatches(event, expectedEvent))
    checks.push({
      id: `relationship:${expectedEvent.kind}:${expectedEvent.actorSlug ?? '*'}:${expectedEvent.targetSlug ?? '*'}`,
      label: `required relationship event ${expectedEvent.kind}`,
      passed: matching.length > 0,
      detail: matching.length > 0
        ? `${matching.length} relationship event(s) found`
        : `missing ${expectedEvent.kind} relationship event`,
      evidence: matching.slice(0, 5).map((event) => `${event.actorSlug}${event.targetSlug ? ` -> ${event.targetSlug}` : ''}: ${event.reason}`),
    })
  }

  const actorStateCards = roomRuns.flatMap((run) => run.actorStateCards ?? [])
  for (const expectedCard of evalCase.expect.requiredActorStateCards ?? []) {
    const matching = actorStateCards.filter((card) => actorStateCardExpectationMatches(card, expectedCard))
    checks.push({
      id: `actor-state:${expectedCard.slug ?? '*'}:${expectedCard.state ?? '*'}`,
      label: 'required actor state card',
      passed: matching.length > 0,
      detail: matching.length > 0
        ? `${matching.length} actor state card(s) found`
        : 'missing matching actor state card',
      evidence: matching.slice(0, 5).map((card) => `${card.slug}: ${card.state}/${card.label} - ${card.reason}`),
    })
  }

  const showQualityIssues = roomRuns.flatMap((run) => run.showQualityIssues ?? [])
  for (const expectedIssue of evalCase.expect.requiredShowQualityIssues ?? []) {
    const keyed = showQualityIssues.filter((issue) => issue.key === expectedIssue.key)
    const matching = keyed.filter((issue) => showQualityIssueExpectationMatches(issue, expectedIssue))
    checks.push({
      id: `show-quality:${expectedIssue.key}`,
      label: `required show quality issue ${expectedIssue.key}`,
      passed: matching.length > 0,
      detail: matching.length > 0
        ? `${matching.length} show quality issue(s) matched`
        : keyed.length > 0
          ? `${keyed.length} ${expectedIssue.key} issue(s) found, none matched expected status/severity`
          : `missing show quality issue ${expectedIssue.key}`,
      evidence: keyed.slice(0, 5).map((issue) => `${issue.status}/${issue.severity}: ${issue.summary}`),
    })
  }

  if (evalCase.expect.requiredBrowserQueueSnapshot) {
    const browserQueueSnapshots = roomRuns
      .map((run) => run.browserQueueSnapshot)
      .filter((snapshot): snapshot is SkillMomentBrowserQueueSnapshot => Boolean(snapshot))
    const matching = browserQueueSnapshots.filter((snapshot) => (
      browserQueueSnapshotExpectationMatches(snapshot, evalCase.expect.requiredBrowserQueueSnapshot!)
    ))
    checks.push({
      id: 'browser-queue-snapshot',
      label: 'required browser queue snapshot',
      passed: matching.length > 0,
      detail: matching.length > 0
        ? `${matching.length} browser queue snapshot(s) matched`
        : browserQueueSnapshots.length > 0
          ? `${browserQueueSnapshots.length} browser queue snapshot(s) found, none matched expected state/counts`
          : 'missing browser queue snapshot',
      evidence: browserQueueSnapshots.slice(0, 5).map(browserQueueSnapshotEvidence),
    })
  }

  if (evalCase.expect.minActiveLocalActors !== undefined) {
    const active = activeLocalActorSlugs(artifacts.moments)
    checks.push({
      id: 'active-local-actors',
      label: 'local life-flow actors participate',
      passed: active.length >= evalCase.expect.minActiveLocalActors,
      detail: `expected >= ${evalCase.expect.minActiveLocalActors}, got ${active.length}`,
      evidence: active,
    })
  }

  if (evalCase.expect.requireMediaFallback) {
    const mediaFallbackCount = roomRuns.reduce((count, run) => count + (run.mediaFallbackCount ?? 0), 0)
    const fallbackMedia = artifacts.moments.flatMap((moment) => moment.media ?? []).filter((media) => media.status === 'fallback')
    checks.push({
      id: 'media-fallback',
      label: 'media failure has fallback',
      passed: mediaFallbackCount > 0 || fallbackMedia.length > 0,
      detail: `run fallback count ${mediaFallbackCount}, fallback media ${fallbackMedia.length}`,
      evidence: [
        ...roomRuns.flatMap((run) => run.mediaFallbackReasons ?? []),
        ...fallbackMedia.map((media) => media.path),
      ].slice(0, 8),
    })
  } else if (!evalCase.expect.mediaMayFallback && latestRun?.beatCompletion?.some((beat) => beat.key === 'media_action')) {
    const failedMedia = latestRun.beatCompletion.filter((beat) => beat.key === 'media_action' && beat.status !== 'complete')
    checks.push({
      id: 'media-complete',
      label: 'media beat completes without fallback',
      passed: failedMedia.length === 0,
      detail: failedMedia.length === 0 ? 'media beat complete' : `${failedMedia.length} non-complete media beat(s)`,
      evidence: failedMedia.flatMap((beat) => beat.evidence).slice(0, 8),
    })
  }

  if (evalCase.expect.requireRepair) {
    const repairCount = roomRuns.reduce((count, run) => count + (run.repairs?.length ?? 0), 0)
    checks.push({
      id: 'repair-recorded',
      label: 'repair pass recorded',
      passed: repairCount > 0,
      detail: `${repairCount} repair(s) found`,
      evidence: roomRuns.flatMap((run) => run.repairs ?? []).map((repair) => `${repair.beatKey}: ${repair.reason}`).slice(0, 8),
    })
  }

  const failed = checks.filter((check) => !check.passed)
  return {
    caseId: evalCase.id,
    success: failed.length === 0,
    summary: failed.length === 0
      ? `${evalCase.id}: ${checks.length} checks passed`
      : `${evalCase.id}: ${failed.length}/${checks.length} checks failed`,
    checks,
  }
}
