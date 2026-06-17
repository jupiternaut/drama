import { describe, expect, it, mock } from 'bun:test'

import { registerDramaCrewIpc } from '../skill-crew-ipc'

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown> | unknown

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
      return handler({}, ...args)
    },
    channels() {
      return [...handlers.keys()]
    },
  }
}

describe('registerDramaCrewIpc', () => {
  it('registers Skill Crew handlers as injected runtime operations', async () => {
    const fake = createFakeIpcMain()
    const deps = {
      ipcMain: fake.ipcMain,
      runCodexSkill: mock(async (input: unknown) => ({ success: true, input })),
      recordSkillFeedback: mock(async (input: unknown) => ({ success: true, path: 'feedback.jsonl', kind: 'skill-feedback', input })),
      listSkillMoments: mock(async (input: unknown) => ({ moments: [], input })),
      recordSkillMomentFeedback: mock(async (input: unknown) => ({ success: true, path: 'moment-feedback.jsonl', kind: 'moment-feedback', input })),
      refreshSkills: mock(async (workspaceId: string, workingDirectory?: string) => ([{ workspaceId, workingDirectory }])),
      importSkillToCrewFolder: mock(async (input: unknown) => ({
        skill: { slug: 'demo', metadata: { name: 'Demo' } } as never,
        targetPath: 'skills/demo',
        input,
      })),
    }

    registerDramaCrewIpc(deps)

    expect(fake.channels()).toEqual([
      'skill-crew:run-codex-skill',
      'skill-crew:record-feedback',
      'skill-moments:list',
      'skill-moments:record-feedback',
      'skill-crew:refresh-skills',
      'skill-crew:import-skill',
    ])
    await expect(fake.invoke('skill-crew:run-codex-skill', { prompt: 'run' })).resolves.toMatchObject({ success: true })
    await expect(fake.invoke('skill-crew:record-feedback', { verdict: 1 })).resolves.toMatchObject({ kind: 'skill-feedback' })
    await expect(fake.invoke('skill-moments:list', { workspaceId: 'workspace-1' })).resolves.toMatchObject({ moments: [] })
    await expect(fake.invoke('skill-moments:record-feedback', { verdict: 2 })).resolves.toMatchObject({ kind: 'moment-feedback' })
    await expect(fake.invoke('skill-crew:refresh-skills', 'workspace-1', 'wd')).resolves.toEqual([
      { workspaceId: 'workspace-1', workingDirectory: 'wd' },
    ])
    await expect(fake.invoke('skill-crew:import-skill', { slug: 'demo' })).resolves.toMatchObject({ targetPath: 'skills/demo' })
  })
})
