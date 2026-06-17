import type {
  DramaGraphEventInput,
  DramaTaskBindingDeleteInput,
  DramaTaskBindingUpsertInput,
} from '@drama/core'

export type SkillCrewGraphEventType =
  | 'crew.task.created'
  | 'crew.agent.assigned'
  | 'crew.agent.output'
  | 'crew.suggestion.created'
  | 'crew.taskBinding.upserted'
  | 'crew.taskBinding.deleted'
  | 'graph.node.patch.proposed'
  | 'plm.chapter.generate.requested'

export interface SkillCrewGraphEventOptions {
  actor?: string
  details?: Record<string, unknown>
}

export interface SkillCrewSuggestionInput {
  nodeId?: string
  edgeId?: string
  agentId?: string
  crewId?: string
  title: string
  body: string
  patch?: Record<string, unknown>
}

export interface SkillCrewAgentOutputInput {
  nodeId?: string
  edgeId?: string
  taskId?: string
  agentId?: string
  crewId?: string
  roomId?: string
  title?: string
  body: string
  outputType?: 'message' | 'observation' | 'proposal' | 'error'
  artifacts?: Array<Record<string, unknown>>
}

export function createSkillCrewTaskBindingUpsertEvent(
  input: DramaTaskBindingUpsertInput,
  options: SkillCrewGraphEventOptions = {},
): DramaGraphEventInput {
  return {
    type: 'crew.taskBinding.upserted',
    actor: options.actor ?? actorFromBinding(input),
    details: compactDetails({
      ...options.details,
      bindingId: input.bindingId,
      nodeId: input.nodeId,
      edgeId: input.edgeId,
      taskId: input.taskId,
      agentId: input.agentId,
      crewId: input.crewId,
      status: input.status,
    }),
  }
}

export function createSkillCrewTaskBindingDeleteEvent(
  input: DramaTaskBindingDeleteInput,
  options: SkillCrewGraphEventOptions = {},
): DramaGraphEventInput {
  return {
    type: 'crew.taskBinding.deleted',
    actor: options.actor ?? 'drama:crew',
    details: compactDetails({
      ...options.details,
      bindingId: input.bindingId,
    }),
  }
}

export function createSkillCrewSuggestionEvent(
  input: SkillCrewSuggestionInput,
  options: SkillCrewGraphEventOptions = {},
): DramaGraphEventInput {
  return {
    type: input.patch ? 'graph.node.patch.proposed' : 'crew.suggestion.created',
    actor: options.actor ?? actorFromIds(input.agentId, input.crewId),
    details: compactDetails({
      ...options.details,
      nodeId: input.nodeId,
      edgeId: input.edgeId,
      agentId: input.agentId,
      crewId: input.crewId,
      title: input.title,
      body: input.body,
      patch: input.patch,
    }),
  }
}

export function createSkillCrewAgentOutputEvent(
  input: SkillCrewAgentOutputInput,
  options: SkillCrewGraphEventOptions = {},
): DramaGraphEventInput {
  const outputType = input.outputType ?? 'message'
  return {
    type: 'crew.agent.output',
    actor: options.actor ?? actorFromIds(input.agentId, input.crewId),
    source: 'crew',
    target: compactDetails({
      nodeId: input.nodeId,
      edgeId: input.edgeId,
      taskId: input.taskId,
      agentId: input.agentId,
    }) as DramaGraphEventInput['target'],
    status: outputType,
    severity: outputType === 'error' ? 'error' : 'info',
    summary: input.title ?? input.body.slice(0, 120),
    details: compactDetails({
      ...options.details,
      nodeId: input.nodeId,
      edgeId: input.edgeId,
      taskId: input.taskId,
      agentId: input.agentId,
      crewId: input.crewId,
      roomId: input.roomId,
      title: input.title,
      body: input.body,
      outputType,
      artifacts: input.artifacts,
    }),
  }
}

function actorFromBinding(input: DramaTaskBindingUpsertInput): string {
  return actorFromIds(input.agentId, input.crewId)
}

function actorFromIds(agentId?: string, crewId?: string): string {
  const agent = agentId?.trim()
  if (agent) return `agent:${agent}`
  const crew = crewId?.trim()
  if (crew) return `crew:${crew}`
  return 'drama:crew'
}

function compactDetails(details: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined && value !== ''),
  )
}
