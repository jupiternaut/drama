import type { IpcMain } from 'electron'
import type {
  CodexSkillRunResult,
  SkillCrewImportSkillArgs,
  SkillCrewImportSkillResult,
  SkillFeedbackRecordInput,
  SkillMoment,
  SkillMomentFeedbackRecordInput,
  SkillMomentListInput,
} from '../shared/types'

export interface SkillCrewCodexSkillRunInput {
  prompt: string
  workingDirectory?: string
  model?: string
  timeoutMs?: number
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'
}

export interface DramaCrewIpcDeps {
  ipcMain: Pick<IpcMain, 'handle'>
  runCodexSkill: (args: SkillCrewCodexSkillRunInput) => Promise<CodexSkillRunResult>
  recordSkillFeedback: (args: SkillFeedbackRecordInput) => Promise<{ success: boolean; path: string }>
  listSkillMoments: (args: SkillMomentListInput) => Promise<{ moments: SkillMoment[] }>
  recordSkillMomentFeedback: (args: SkillMomentFeedbackRecordInput) => Promise<{ success: boolean; path: string }>
  refreshSkills: (workspaceId: string, workingDirectory?: string) => Promise<unknown>
  importSkillToCrewFolder: (args: SkillCrewImportSkillArgs) => Promise<SkillCrewImportSkillResult>
}

export function registerDramaCrewIpc(deps: DramaCrewIpcDeps): void {
  deps.ipcMain.handle('skill-crew:run-codex-skill', async (_event, args: SkillCrewCodexSkillRunInput) => {
    return await deps.runCodexSkill(args)
  })

  deps.ipcMain.handle('skill-crew:record-feedback', async (_event, args: SkillFeedbackRecordInput) => {
    return await deps.recordSkillFeedback(args)
  })

  deps.ipcMain.handle('skill-moments:list', async (_event, args: SkillMomentListInput) => {
    return await deps.listSkillMoments(args)
  })

  deps.ipcMain.handle('skill-moments:record-feedback', async (_event, args: SkillMomentFeedbackRecordInput) => {
    return await deps.recordSkillMomentFeedback(args)
  })

  deps.ipcMain.handle('skill-crew:refresh-skills', async (_event, workspaceId: string, workingDirectory?: string) => {
    return await deps.refreshSkills(workspaceId, workingDirectory)
  })

  deps.ipcMain.handle('skill-crew:import-skill', async (_event, args: SkillCrewImportSkillArgs) => {
    return await deps.importSkillToCrewFolder(args)
  })
}
