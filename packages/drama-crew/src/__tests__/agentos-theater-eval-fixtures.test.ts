import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { SkillMoment, SkillMomentCritique } from '@craft-agent/shared/skill-moments'
import type {
  AgentOSTheaterEvalArtifacts,
  AgentOSTheaterEvalCase,
  AgentOSTheaterEvalRunRecord,
} from '../agentos-theater-eval'
import { evaluateAgentOSTheaterCase } from '../agentos-theater-eval'

type StoredSkillMoment = Omit<SkillMoment, 'critiques' | 'feedbackVerdict' | 'feedbackSavedPath'>

const repoRoot = resolve(import.meta.dir, '../../../..')
const caseRoot = join(repoRoot, 'eval', 'agentos-theater', 'cases')

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

async function readJsonl<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) return []
  return (await readFile(path, 'utf-8'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

function attachCritiques(moments: StoredSkillMoment[], critiques: SkillMomentCritique[]): SkillMoment[] {
  const byMoment = new Map<string, SkillMomentCritique[]>()
  for (const critique of critiques) {
    const entries = byMoment.get(critique.parentMomentId) ?? []
    entries.push(critique)
    byMoment.set(critique.parentMomentId, entries)
  }
  return moments.map((moment): SkillMoment => ({
    ...moment,
    critiques: byMoment.get(moment.id) ?? [],
  }))
}

async function readCaseArtifacts(evalCase: AgentOSTheaterEvalCase, casePath: string): Promise<AgentOSTheaterEvalArtifacts> {
  if (!evalCase.artifactDir) {
    throw new Error(`Case ${evalCase.id} does not declare artifactDir`)
  }
  const artifactDir = resolve(casePath, '..', evalCase.artifactDir)
  const moments = await readJsonl<StoredSkillMoment>(join(artifactDir, 'moments.jsonl'))
  const critiques = await readJsonl<SkillMomentCritique>(join(artifactDir, 'critics.jsonl'))
  const runs = await readJsonl<AgentOSTheaterEvalRunRecord>(join(artifactDir, 'runs.jsonl'))
  return {
    moments: attachCritiques(moments, critiques),
    runs,
  }
}

describe('agentos theater eval fixtures', () => {
  const cases = [
    'homelander-butcher-3run',
    'media-failure-fallback',
  ]

  for (const caseId of cases) {
    it(`passes fixture case ${caseId}`, async () => {
      const casePath = join(caseRoot, `${caseId}.json`)
      const evalCase = await readJson<AgentOSTheaterEvalCase>(casePath)
      const artifacts = await readCaseArtifacts(evalCase, casePath)
      const result = evaluateAgentOSTheaterCase(evalCase, artifacts)

      expect(evalCase.schemaVersion).toBe(1)
      expect(evalCase.id).toBe(caseId)
      expect(artifacts.runs.length).toBeGreaterThan(0)
      expect(artifacts.moments.length).toBeGreaterThan(0)
      expect(result.checks.some((check) => check.id.startsWith('relationship:'))).toBe(true)
      expect(result.checks.some((check) => check.id.startsWith('actor-state:'))).toBe(true)
      expect(result.checks.some((check) => check.id.startsWith('show-quality:'))).toBe(true)
      expect(result.checks.some((check) => check.id === 'browser-queue-snapshot')).toBe(true)
      if (caseId === 'homelander-butcher-3run') {
        expect(result.checks.some((check) => check.id === 'run-summary:run-1:flow')).toBe(true)
        expect(result.checks.some((check) => check.id === 'run-summary:run-2:relationships')).toBe(true)
        expect(result.checks.some((check) => check.id === 'run-summary:run-3:browser')).toBe(true)
      }
      expect(result.success, result.summary).toBe(true)
    })
  }
})
