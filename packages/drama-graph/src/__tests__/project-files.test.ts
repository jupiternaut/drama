import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, readdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

import { recordDramaProjectFile } from '../project-files.ts'

const tempRoots: string[] = []

async function tempWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drama-project-files-'))
  tempRoots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('recordDramaProjectFile', () => {
  it('creates a root project directory and appends a new source file per record', async () => {
    const workspaceRoot = await tempWorkspace()

    const first = await recordDramaProjectFile({
      workspaceRoot,
      now: () => 1200,
      request: {
        projectId: 'Novel One',
        source: 'plm',
        type: 'plm.novel.created',
        title: 'Novel One',
        summary: { chapterCount: 0 },
        payload: { id: 'novel-1' },
      },
    })
    const second = await recordDramaProjectFile({
      workspaceRoot,
      now: () => 1200,
      request: {
        projectId: 'Novel One',
        source: 'plm',
        type: 'plm.novel.updated',
        payload: { title: 'Novel One Updated' },
      },
    })

    expect(first.projectDir).toBe(join(workspaceRoot, 'drama-projects', 'Novel-One'))
    expect(second.projectDir).toBe(first.projectDir)
    expect(first.filePath).not.toBe(second.filePath)

    const entries = await readdir(join(workspaceRoot, 'drama-projects', 'Novel-One', 'plm'))
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('plm.novel.')

    const record = JSON.parse(await readFile(first.filePath, 'utf8')) as Record<string, unknown>
    expect(record).toMatchObject({
      schema: 'drama.project_file_event.v1',
      projectId: 'Novel One',
      source: 'plm',
      type: 'plm.novel.created',
      title: 'Novel One',
      summary: { chapterCount: 0 },
      payload: { id: 'novel-1' },
    })
  })

  it('sanitizes project and source names before writing', async () => {
    const workspaceRoot = await tempWorkspace()

    const result = await recordDramaProjectFile({
      workspaceRoot,
      now: () => 1300,
      request: {
        projectId: '..\\bad/project',
        source: '../graph',
        type: 'graph.created',
      },
    })

    expect(result.projectDir).toBe(join(workspaceRoot, 'drama-projects', '..-bad-project'))
    expect(result.filePath.startsWith(join(result.projectDir, '..-graph'))).toBe(true)
  })
})
