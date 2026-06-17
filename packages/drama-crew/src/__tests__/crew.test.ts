import { describe, expect, it } from 'bun:test'

import {
  GLOBAL_SKILL_CREW_ROOM,
  createSkillCrewAgentOutputEvent,
  createSkillCrewSuggestionEvent,
  createSkillCrewTaskBindingDeleteEvent,
  createSkillCrewTaskBindingUpsertEvent,
  inferSkillCrewRoomId,
  inferSkillPhysicalFolderId,
  isGlobalSkillCrewSkill,
} from '../index.ts'

describe('Drama Skill Crew contracts', () => {
  it('infers skill crew rooms from stable skill descriptors', () => {
    expect(inferSkillCrewRoomId({
      slug: 'screenwriter',
      path: '/repo/skills/screenplay/screenwriter',
      metadata: { description: 'Writes dialogue and scene beats' },
    })).toBe('screenplay')

    expect(inferSkillCrewRoomId({
      slug: 'react-ui',
      path: '/repo/skills/design/react-ui',
      metadata: { name: 'Frontend UI' },
    })).toBe('design')
  })

  it('keeps physical folder mapping independent from renderer state', () => {
    const skill = {
      slug: 'screenwriter',
      path: `/repo/skills/screenplay/screenwriter`,
    }

    expect(inferSkillPhysicalFolderId(skill, ['build', 'screenplay'])).toBe('screenplay')
    expect(isGlobalSkillCrewSkill({
      slug: 'chairman',
      path: `/repo/skills/${GLOBAL_SKILL_CREW_ROOM}/chairman`,
    })).toBe(true)
  })

  it('writes task binding graph events with crew or agent actor identity', () => {
    expect(createSkillCrewTaskBindingUpsertEvent({
      nodeId: 'node-1',
      taskId: 'task-1',
      agentId: 'screenwriter',
      crewId: 'screenplay',
      status: 'active',
    })).toEqual({
      type: 'crew.taskBinding.upserted',
      actor: 'agent:screenwriter',
      details: {
        nodeId: 'node-1',
        taskId: 'task-1',
        agentId: 'screenwriter',
        crewId: 'screenplay',
        status: 'active',
      },
    })

    expect(createSkillCrewTaskBindingDeleteEvent({ bindingId: 'binding-1' })).toEqual({
      type: 'crew.taskBinding.deleted',
      actor: 'drama:crew',
      details: { bindingId: 'binding-1' },
    })
  })

  it('converts crew suggestions into graph events without free-floating text', () => {
    expect(createSkillCrewSuggestionEvent({
      nodeId: 'node-1',
      agentId: 'continuity',
      title: 'Fix continuity',
      body: 'The reveal contradicts chapter two.',
      patch: { field: 'synopsis' },
    })).toEqual({
      type: 'graph.node.patch.proposed',
      actor: 'agent:continuity',
      details: {
        nodeId: 'node-1',
        agentId: 'continuity',
        title: 'Fix continuity',
        body: 'The reveal contradicts chapter two.',
        patch: { field: 'synopsis' },
      },
    })
  })

  it('normalizes agent output as graph event source and target metadata', () => {
    expect(createSkillCrewAgentOutputEvent({
      nodeId: 'node-1',
      taskId: 'task-1',
      agentId: 'director',
      crewId: 'screenplay',
      roomId: 'screenplay',
      title: 'Director note',
      body: 'Tighten the reveal before the midpoint.',
      outputType: 'proposal',
      artifacts: [{ type: 'graph.patch' }],
    })).toEqual({
      type: 'crew.agent.output',
      actor: 'agent:director',
      source: 'crew',
      target: {
        nodeId: 'node-1',
        taskId: 'task-1',
        agentId: 'director',
      },
      status: 'proposal',
      severity: 'info',
      summary: 'Director note',
      details: {
        nodeId: 'node-1',
        taskId: 'task-1',
        agentId: 'director',
        crewId: 'screenplay',
        roomId: 'screenplay',
        title: 'Director note',
        body: 'Tighten the reveal before the midpoint.',
        outputType: 'proposal',
        artifacts: [{ type: 'graph.patch' }],
      },
    })
  })
})
