import { atom } from 'jotai'
import type { LoadedSkill } from '../../shared/types'
import {
  DEFAULT_SKILL_CREW_ROOMS,
  GLOBAL_SKILL_CREW_ROOM,
  inferSkillCrewRoomId as inferDramaSkillCrewRoomId,
  inferSkillPhysicalFolderId as inferDramaSkillPhysicalFolderId,
  isGlobalSkillCrewSkill as isDramaGlobalSkillCrewSkill,
  type SkillCrewChannelId,
  type SkillCrewPlacement,
} from '@drama/crew'

export type { SkillCrewChannelId, SkillCrewPlacement }
export { DEFAULT_SKILL_CREW_ROOMS, GLOBAL_SKILL_CREW_ROOM }

export const skillCrewChannelAtom = atom<SkillCrewChannelId>('debate')
export const skillCrewPlacementAtom = atom<SkillCrewPlacement>({})

export function inferSkillCrewRoomId(skill: LoadedSkill): SkillCrewChannelId {
  return inferDramaSkillCrewRoomId(skill)
}

export function inferSkillPhysicalFolderId(skill: LoadedSkill, folderIds: string[]): string | null {
  return inferDramaSkillPhysicalFolderId(skill, folderIds)
}

export function isGlobalSkillCrewSkill(skill: LoadedSkill): boolean {
  return isDramaGlobalSkillCrewSkill(skill)
}
