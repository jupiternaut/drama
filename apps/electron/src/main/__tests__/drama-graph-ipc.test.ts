import { afterEach, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { registerDramaGraphIpc } from '../drama-graph-ipc'

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown> | unknown

const tempRoots: string[] = []

async function tempWorkspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drama-graph-ipc-'))
  tempRoots.push(root)
  return root
}

function createFakeIpcMain() {
  const handlers = new Map<string, IpcHandler>()
  return {
    ipcMain: {
      handle: mock((channel: string, handler: IpcHandler) => {
        handlers.set(channel, handler)
      }),
    },
    invoke(channel: string, ...args: unknown[]) {
      const handler = handlers.get(channel)
      if (!handler) throw new Error(`No handler registered for ${channel}`)
      return handler({ sender: { id: 1 } }, ...args)
    },
    channels() {
      return [...handlers.keys()]
    },
  }
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('registerDramaGraphIpc', () => {
  it('registers Drama Graph and Storylet bridge channels behind one boundary', () => {
    const fake = createFakeIpcMain()

    registerDramaGraphIpc({
      ipcMain: fake.ipcMain,
      resolveWorkspaceRoot: () => 'workspace',
      resolveStoryletGraphPath: () => 'missing-storylet.json',
      logger: { info: () => undefined, warn: () => undefined },
    })

    expect(fake.channels()).toEqual([
      'drama:graph:load',
      'drama:graph:history',
      'drama:projectFile:record',
      'drama:graph:restoreBackup',
      'drama:graph:updateNodePositions',
      'drama:graph:updateNode',
      'drama:graph:createNode',
      'drama:graph:deleteNode',
      'drama:graph:upsertDraft',
      'drama:graph:upsertTaskBinding',
      'drama:graph:deleteTaskBinding',
      'drama:graph:updateEdge',
      'drama:graph:createEdge',
      'drama:graph:deleteEdge',
      'storylet:bridge:snapshot',
      'storylet:bridge:writeChapter',
    ])
  })

  it('loads a native fallback graph into the active workspace when Storylet is absent', async () => {
    const workspaceRoot = await tempWorkspace()
    const fake = createFakeIpcMain()

    registerDramaGraphIpc({
      ipcMain: fake.ipcMain,
      resolveWorkspaceRoot: () => workspaceRoot,
      resolveStoryletGraphPath: () => join(workspaceRoot, 'missing-storylet.json'),
      logger: { info: () => undefined, warn: () => undefined },
    })

    const result = await fake.invoke('drama:graph:load', {
      graphId: 'native-test',
      importStoryletIfMissing: true,
    }) as { graph: { id: string; title: string }; path: string; imported: boolean }

    expect(result).toMatchObject({
      graph: { id: 'native-test', title: 'Drama Graph' },
      imported: false,
    })
    expect(result.path).toBe(join(workspaceRoot, '.drama', 'graphs', 'native-test.json'))
    const savedGraph = JSON.parse(await readFile(result.path, 'utf8')) as { id: string }
    expect(savedGraph.id).toBe('native-test')
  })

  it('records PLM project files in the sender workspace', async () => {
    const workspaceRoot = await tempWorkspace()
    const fake = createFakeIpcMain()

    registerDramaGraphIpc({
      ipcMain: fake.ipcMain,
      resolveWorkspaceRoot: () => workspaceRoot,
      resolveStoryletGraphPath: () => join(workspaceRoot, 'missing-storylet.json'),
      logger: { info: () => undefined, warn: () => undefined },
    })

    const result = await fake.invoke('drama:projectFile:record', {
      projectId: 'novel-1',
      source: 'plm',
      type: 'plm.chapter.saved',
      title: '第一章',
      summary: { wordCount: 1200 },
      payload: { ok: true },
    }) as { projectDir: string; filePath: string }

    expect(result.projectDir).toBe(join(workspaceRoot, 'drama-projects', 'novel-1'))
    const record = JSON.parse(await readFile(result.filePath, 'utf8')) as Record<string, unknown>
    expect(record).toMatchObject({
      schema: 'drama.project_file_event.v1',
      projectId: 'novel-1',
      source: 'plm',
      type: 'plm.chapter.saved',
      title: '第一章',
    })
  })
})
