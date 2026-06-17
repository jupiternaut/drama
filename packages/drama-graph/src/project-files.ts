import { mkdir, writeFile } from 'fs/promises'
import { join, resolve, sep } from 'path'

import type {
  DramaProjectFileRecordRequest,
  DramaProjectFileRecordResult,
  DramaProjectFileSource,
} from './ipc-contract.ts'

export interface RecordDramaProjectFileOptions {
  workspaceRoot: string
  request: DramaProjectFileRecordRequest
  now?: () => number
}

export const DRAMA_PROJECTS_DIR_NAME = 'drama-projects'

export async function recordDramaProjectFile(
  options: RecordDramaProjectFileOptions,
): Promise<DramaProjectFileRecordResult> {
  const now = options.now ?? Date.now
  const workspaceRoot = resolve(options.workspaceRoot)
  const projectsDir = resolve(workspaceRoot, DRAMA_PROJECTS_DIR_NAME)
  assertInside(workspaceRoot, projectsDir)

  const projectId = safeDramaProjectFileStem(options.request.projectId)
  const source = safeDramaProjectFileStem(options.request.source || 'manual') as DramaProjectFileSource
  const type = safeDramaProjectFileStem(options.request.type || 'event')
  const projectDir = resolve(projectsDir, projectId)
  const sourceDir = resolve(projectDir, source)
  assertInside(projectsDir, projectDir)
  assertInside(projectDir, sourceDir)

  await mkdir(sourceDir, { recursive: true })

  const createdAt = now()
  const filePath = resolve(sourceDir, `${timestampFilePart(createdAt)}-${type}-${uniqueFilePart()}.json`)
  assertInside(sourceDir, filePath)

  const record = {
    schema: 'drama.project_file_event.v1',
    projectId: options.request.projectId,
    source: options.request.source,
    type: options.request.type,
    title: options.request.title,
    createdAt,
    summary: options.request.summary ?? {},
    payload: options.request.payload ?? null,
  }

  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')

  return {
    projectDir,
    filePath,
  }
}

export function safeDramaProjectFileStem(value: string): string {
  const stem = String(value)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^\.+$/g, '')
    .replace(/^-+|-+$/g, '')

  return stem || 'project'
}

function timestampFilePart(value: number): string {
  if (!Number.isFinite(value)) return String(Date.now())
  return String(Math.max(0, Math.floor(value))).padStart(13, '0')
}

function uniqueFilePart(): string {
  return `${process.pid}-${Math.random().toString(36).slice(2, 8)}`
}

function assertInside(parent: string, child: string): void {
  const resolvedParent = resolve(parent)
  const resolvedChild = resolve(child)
  if (resolvedChild === resolvedParent) return
  if (!resolvedChild.startsWith(`${resolvedParent}${sep}`)) {
    throw new Error(`Drama project path escaped workspace: ${resolvedChild}`)
  }
}
