#!/usr/bin/env bun

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import type { SkillMoment, SkillMomentCritique } from '../apps/electron/src/shared/types'
import type {
  AgentOSTheaterEvalArtifacts,
  AgentOSTheaterEvalCase,
  AgentOSTheaterEvalRunRecord,
} from '../apps/electron/src/main/skill-crew/agentos-theater-eval'
import { evaluateAgentOSTheaterCase } from '../apps/electron/src/main/skill-crew/agentos-theater-eval'

type StoredSkillMoment = Omit<SkillMoment, 'critiques' | 'feedbackVerdict' | 'feedbackSavedPath'>

const repoRoot = resolve(import.meta.dir, '..')
const caseRoot = join(repoRoot, 'eval', 'agentos-theater', 'cases')

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`
  const direct = process.argv.find((arg) => arg.startsWith(prefix))
  if (direct) return direct.slice(prefix.length)

  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  return undefined
}

function resolveCasePath(value: string | undefined): string {
  const raw = value || 'homelander-butcher-3run'
  if (raw.includes('/') || raw.includes('\\') || raw.endsWith('.json')) {
    return isAbsolute(raw) ? raw : join(repoRoot, raw)
  }
  return join(caseRoot, `${raw}.json`)
}

function resolveRepoPath(path: string, relativeTo?: string): string {
  if (isAbsolute(path)) return path
  if (relativeTo) return resolve(relativeTo, path)
  return join(repoRoot, path)
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

async function readJsonl<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) return []
  const content = await readFile(path, 'utf-8')
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

function attachCritiques(moments: StoredSkillMoment[], critiques: SkillMomentCritique[]): SkillMoment[] {
  const critiquesByMoment = new Map<string, SkillMomentCritique[]>()
  for (const critique of critiques) {
    const entries = critiquesByMoment.get(critique.parentMomentId) ?? []
    entries.push(critique)
    critiquesByMoment.set(critique.parentMomentId, entries)
  }
  return moments.map((moment): SkillMoment => ({
    ...moment,
    critiques: (critiquesByMoment.get(moment.id) ?? []).sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
  }))
}

async function readArtifacts(artifactDir: string): Promise<AgentOSTheaterEvalArtifacts> {
  const moments = await readJsonl<StoredSkillMoment>(join(artifactDir, 'moments.jsonl'))
  const critiques = await readJsonl<SkillMomentCritique>(join(artifactDir, 'critics.jsonl'))
  const runs = await readJsonl<AgentOSTheaterEvalRunRecord>(join(artifactDir, 'runs.jsonl'))
  return {
    moments: attachCritiques(moments, critiques),
    runs,
  }
}

function printHelp(): void {
  console.log([
    'Usage: bun scripts/agentos-theater-eval.ts [--case homelander-butcher-3run] [--artifacts path/to/skill-moments]',
    '',
    'Runs deterministic AgentOS Theater acceptance checks against Skill Moments JSONL artifacts.',
    'Cases may also require per-run replay summaries: role goal -> action -> relationship change -> next-round hook.',
    'A case may point at a fixture artifactDir; --artifacts overrides it for real local runs.',
  ].join('\n'))
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    printHelp()
    return
  }

  const casePath = resolveCasePath(readFlag('case'))
  const evalCase = await readJson<AgentOSTheaterEvalCase>(casePath)
  const caseDir = resolve(casePath, '..')
  const artifactDir = readFlag('artifacts')
    ? resolveRepoPath(readFlag('artifacts')!)
    : evalCase.artifactDir
      ? resolveRepoPath(evalCase.artifactDir, caseDir)
      : undefined

  if (!artifactDir) {
    throw new Error(`No artifactDir configured for case ${evalCase.id}; pass --artifacts`)
  }

  const result = evaluateAgentOSTheaterCase(evalCase, await readArtifacts(artifactDir))
  console.log(result.summary)
  for (const check of result.checks) {
    console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.id}: ${check.detail}`)
    for (const evidence of check.evidence ?? []) {
      console.log(`  - ${evidence}`)
    }
  }

  if (!result.success) {
    process.exit(1)
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
