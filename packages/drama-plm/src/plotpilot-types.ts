export interface GenerationPrefsDTO {
  phase_display_mode?: boolean
  smart_truncate_enabled?: boolean
  beat_hard_cap_enabled?: boolean
  inline_prose_aggregation_enabled?: boolean
  conductor_converge_threshold?: number | null
  conductor_land_threshold?: number | null
  pause_after_each_chapter_audit?: boolean
  audit_pause_on_hard_fail?: boolean
  audit_pause_on_anti_ai_severe?: boolean
  target_chapter_words?: number
  [key: string]: unknown
}

export interface ChapterDTO {
  id: string
  number: number
  title: string
  content: string
  word_count: number
  novel_id?: string
  status?: string
  generation_hint?: string
}

export interface NovelDTO {
  id: string
  title: string
  author: string
  target_chapters: number
  stage: string
  premise?: string
  chapters: ChapterDTO[]
  total_word_count: number
  slug?: string
  has_bible?: boolean
  has_outline?: boolean
  autopilot_status?: string
  auto_approve_mode?: boolean
  locked_genre?: string
  locked_world_preset?: string
  locked_story_structure?: string
  locked_pacing_control?: string
  locked_writing_style?: string
  locked_special_requirements?: string
  target_words_per_chapter?: number
  generation_prefs?: GenerationPrefsDTO
}

export interface CreateNovelRequest {
  novel_id: string
  title: string
  author: string
  target_chapters: number
  premise?: string
  genre?: string
  world_preset?: string
  story_structure?: string
  pacing_control?: string
  writing_style?: string
  special_requirements?: string
  length_tier?: 'short' | 'standard' | 'epic' | null
  target_words_per_chapter?: number | null
}

export interface UpdateNovelRequest {
  title?: string | null
  author?: string | null
  target_chapters?: number | null
  premise?: string | null
  target_words_per_chapter?: number | null
  generation_prefs?: GenerationPrefsDTO | null
}

export interface BibleStatusDTO {
  exists: boolean
  ready: boolean
  novel_id: string
}

export interface EnsureChapterRequest {
  title?: string
}

export interface ChapterMicroBeatPayload {
  description: string
  target_words?: number
  focus?: string
  location_id?: string
  active_action?: string
  emotion_gap?: string
  forbidden_drift?: string
}

export interface ChapterMicroBeatsRequest {
  micro_beats: ChapterMicroBeatPayload[]
}

export interface ChapterMicroBeatsResponse {
  ok: boolean
  chapter_number: number
  count: number
}

export interface UpdateChapterContentRequest {
  content: string
  writing_spec_id?: string | null
  micro_beats?: ChapterMicroBeatPayload[] | null
}

export interface GenerateChapterRequest {
  chapter_number: number
  outline: string
  scene_director_result?: Record<string, unknown>
  invocation_policy?:
    | 'DIRECT'
    | 'REVIEW_BEFORE_CALL'
    | 'REVIEW_AFTER_CALL'
    | 'FULL_INTERACTIVE'
    | 'INTERACTIVE_WHEN_AVAILABLE'
    | 'AUTOPILOT_PAUSE'
  regeneration_guidance?: string
  allow_evolution_gate_bypass?: boolean
  profile_id?: string
  script_prompt_template?: string
  prose_prompt_template?: string
  prompt_variables?: Record<string, string>
}

export interface PlotPilotHostedWriteRequest {
  from_chapter: number
  to_chapter: number
  auto_save?: boolean
  auto_outline?: boolean
}

export type PlotPilotHostedWriteStreamEvent =
  | {
      type: 'session'
      from_chapter?: number
      to_chapter?: number
      auto_save?: boolean
      auto_outline?: boolean
      [key: string]: unknown
    }
  | {
      type: 'chapter_start'
      chapter?: number
      chapter_number?: number
      title?: string
      [key: string]: unknown
    }
  | {
      type: 'outline'
      chapter?: number
      chapter_number?: number
      outline?: string
      text?: string
      [key: string]: unknown
    }
  | {
      type: 'chunk'
      chapter?: number
      chapter_number?: number
      text?: string
      stats?: ChapterChunkStats
      [key: string]: unknown
    }
  | {
      type: 'saved'
      chapter?: number
      chapter_number?: number
      chapter_id?: string
      word_count?: number
      [key: string]: unknown
    }
  | {
      type: 'session_done'
      chapters?: number[]
      saved?: number
      [key: string]: unknown
    }
  | {
      type: 'approval_required'
      session_id: string
      status?: string
      next_action?: string
      [key: string]: unknown
    }
  | {
      type: 'error'
      message: string
      [key: string]: unknown
    }
  | {
      type: 'unknown'
      event?: string
      raw: unknown
    }

export interface PlotPilotAutopilotStartRequest {
  max_auto_chapters?: number
  target_chapters?: number
  target_words_per_chapter?: number
}

export interface PlotPilotAutopilotControlResponse {
  success?: boolean
  message?: string
  autopilot_status?: string
  current_stage?: string
  target_chapters?: number
  target_words_per_chapter?: number
  autopilot_run_epoch?: number | null
  recovery_reason?: string | null
  [key: string]: unknown
}

export interface PlotPilotAutopilotStatusResponse {
  autopilot_status?: string
  status?: string
  current_stage?: string
  current_act?: number
  current_act_title?: string
  current_act_description?: string
  current_chapter_number?: number
  current_chapter_in_act?: number
  current_auto_chapters?: number
  current_beat_index?: number
  writing_substep?: string
  writing_substep_label?: string
  accumulated_words?: number
  chapter_target_words?: number
  target_chapters?: number
  target_words_per_chapter?: number
  max_auto_chapters?: number
  completed_chapters?: number
  manuscript_chapters?: number
  progress_pct?: number
  progress_pct_manuscript?: number
  total_words?: number
  consecutive_error_count?: number
  auto_approve_mode?: boolean
  needs_review?: boolean
  requires_ai_review?: boolean
  has_active_invocation?: boolean
  active_invocation_session_id?: string
  active_invocation_operation?: string
  active_invocation_node_key?: string
  active_invocation_status?: string
  active_invocation_policy?: string
  autopilot_pause_reason?: string
  active_pipeline_step?: string
  active_pipeline_run_id?: string
  last_stable_stage?: string
  autopilot_run_epoch?: number
  autopilot_recovery_reason?: string
  planned_micro_beats?: Array<Record<string, unknown>>
  story_pipeline_events?: Array<Record<string, unknown>>
  last_chapter_audit?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface PlotPilotAutopilotCircuitBreakerResponse {
  status: 'closed' | 'open' | 'half_open' | (string & {})
  error_count: number
  max_errors: number
  last_error?: Record<string, unknown> | null
  error_history?: Array<Record<string, unknown>>
}

export type PlotPilotAutopilotStreamEvent =
  | {
      type: string
      message?: string
      timestamp?: string
      metadata?: Record<string, unknown>
      [key: string]: unknown
    }
  | {
      type: 'unknown'
      event?: string
      raw: unknown
    }

export interface PlotPilotAutopilotChapterStreamEvent {
  type:
    | 'connected'
    | 'chapter_plan_ready'
    | 'outline_planning'
    | 'beats_planned'
    | 'chapter_start'
    | 'chapter_chunk'
    | 'chapter_content'
    | 'autopilot_stopped'
    | 'paused_for_review'
    | 'heartbeat'
    | (string & {})
  message?: string
  timestamp?: string
  metadata?: {
    chapter_number?: number
    chunk?: string
    content?: string
    word_count?: number
    beat_index?: number
    beats?: Array<Record<string, unknown>>
    outline_plan_mode?: string
    total_beats?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface PlotPilotMainPlotOptionItem {
  id: string
  type?: string
  title: string
  logline?: string
  core_conflict?: string
  starting_hook?: string
  main_axis?: string
  opening_pressure?: string
  forbidden_drift?: string
  sublines?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface PlotPilotSuggestMainPlotOptionsResponse {
  plot_options: PlotPilotMainPlotOptionItem[]
  invocation_session_id?: string
  invocation_next_action?: string
  [key: string]: unknown
}

export interface PlotPilotPlotOutlineStageItem {
  phase: string
  label: string
  range_percent: string
  chapter_start?: number | null
  chapter_end?: number | null
  summary: string
  key_goals?: string[]
  [key: string]: unknown
}

export interface PlotPilotPlotOutlineItem {
  main_story_overview?: string
  stage_plan?: PlotPilotPlotOutlineStageItem[]
  expected_ending?: string
  core_conflict?: string
  [key: string]: unknown
}

export type PlotPilotSetupStreamEvent =
  | {
      type: 'phase'
      phase?: string
      message?: string
      [key: string]: unknown
    }
  | {
      type: 'approval_required'
      session_id: string
      status?: string
      next_action?: string
      [key: string]: unknown
    }
  | {
      type: 'done'
      plot_options?: PlotPilotMainPlotOptionItem[]
      plot_outline?: PlotPilotPlotOutlineItem | null
      invocation_session_id?: string
      [key: string]: unknown
    }
  | {
      type: 'error'
      message: string
      [key: string]: unknown
    }
  | {
      type: string
      [key: string]: unknown
    }

export interface PlotPilotPlanNovelRequest {
  mode?: 'initial' | 'revise' | (string & {})
  dry_run?: boolean
}

export interface PlotPilotPlanNovelResponse {
  success: boolean
  message: string
  bible_updated?: boolean
  outline_updated?: boolean
  chapters_planned?: number
  structure_created?: boolean
  nodes_created?: number
  [key: string]: unknown
}

export interface PlotPilotContinuePlanningRequest {
  current_chapter: number
}

export interface PlotPilotPlotOutlineResponse {
  plot_outline?: PlotPilotPlotOutlineItem | null
  invocation_session_id?: string
  invocation_next_action?: string
  [key: string]: unknown
}

export interface PlotPilotSavePlotOutlineRequest {
  plot_outline: PlotPilotPlotOutlineItem
}

export interface PlotPilotPlanningStructureResponse {
  success?: boolean
  data?: Record<string, unknown>
  [key: string]: unknown
}

export interface PlotPilotReviewChapterResponse {
  chapter_number: number
  suggestions: string[]
  score: number
}

export interface PlotPilotReaderSimulationResponse {
  success: boolean
  data: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface PlotPilotReaderSimulationListResponse {
  success: boolean
  data: {
    novel_id: string
    chapters: Array<Record<string, unknown>>
    total: number
  }
}

export interface PlotPilotChurnAlertsResponse {
  success: boolean
  data: {
    novel_id: string
    threshold: number
    alerts: Array<Record<string, unknown>>
    total: number
  }
}

export interface PlotPilotKnowledgeGraphResponse {
  success: boolean
  data: Record<string, unknown>
  message?: string
}

export interface PlotPilotTraceListResponse {
  traces: Array<Record<string, unknown>>
  total: number
}

export interface PlotPilotTraceStatsResponse {
  total_traces: number
  by_node_type: Record<string, number>
  by_operation: Record<string, number>
  avg_score?: number | null
  avg_duration_ms: number
}

export interface PlotPilotAiTraceListResponse {
  traces: Array<Record<string, unknown>>
  total: number
}

export interface PlotPilotAiTraceTimelineResponse {
  trace_id: string
  spans: Array<Record<string, unknown>>
  total: number
}

export interface PlotPilotPromptStatsResponse {
  [key: string]: unknown
}

export interface PlotPilotPromptListResponse {
  [key: string]: unknown
}

export type PlotPilotLlmProtocol =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'codex'
  | (string & {})

export interface PlotPilotLlmProfile {
  id?: string
  name?: string
  label?: string
  protocol?: PlotPilotLlmProtocol
  api_format?: PlotPilotLlmProtocol
  model?: string
  base_url?: string
  api_key?: string
  enabled?: boolean
  active?: boolean
  [key: string]: unknown
}

export interface PlotPilotLlmControlConfig {
  active_profile_id?: string
  profiles?: PlotPilotLlmProfile[]
  [key: string]: unknown
}

export interface PlotPilotLlmControlPanelData {
  config?: PlotPilotLlmControlConfig
  presets?: PlotPilotLlmProfile[]
  runtime?: Record<string, unknown>
  [key: string]: unknown
}

export interface PlotPilotWritingSpecBindingRequest {
  writing_spec_id: string
}

export interface PlotPilotWritingSpecBindingResponse {
  novel_id: string
  writing_spec_id: string
  spec_title: string
  spec_version: string
  context_key: string
}

export interface PlotPilotHumanizerSettingsRequest {
  enabled: boolean
  revision_note?: string
  failure_policy?: 'fallback_original' | 'fail'
  temperature?: number
  max_tokens?: number | null
}

export interface PlotPilotHumanizerSettingsResponse extends PlotPilotHumanizerSettingsRequest {
  novel_id: string
  context_key: string
  revision_note: string
  failure_policy: 'fallback_original' | 'fail'
  temperature: number
  max_tokens?: number | null
}

export interface PlotPilotWritingSpecFailure {
  code: string
  message: string
  report?: Record<string, unknown>
}

export type PlotPilotInvocationPolicy =
  | 'DIRECT'
  | 'REVIEW_BEFORE_CALL'
  | 'REVIEW_AFTER_CALL'
  | 'FULL_INTERACTIVE'
  | 'INTERACTIVE_WHEN_AVAILABLE'
  | 'AUTOPILOT_PAUSE'

export type PlotPilotInvocationSessionStatus =
  | 'requested'
  | 'spec_resolved'
  | 'context_resolved'
  | 'variables_resolved'
  | 'prompt_compiled'
  | 'awaiting_pre_call_review'
  | 'generating'
  | 'awaiting_acceptance'
  | 'awaiting_commit'
  | 'committing'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'cancelled'
  | (string & {})

export interface PlotPilotInvocationPromptSnapshot {
  prompt?: {
    system?: string
    user?: string
  }
  template_prompt?: {
    system?: string
    user?: string
  }
  draft_prompt?: {
    system?: string
    user?: string
  }
  node_key?: string
  node_version_id?: string
  asset_link_set_id?: string
  input_binding_set_id?: string
  output_binding_set_id?: string
  variable_snapshot_hash?: string
  template_hash?: string
  composition_hash?: string
  rendered_prompt_hash?: string
  missing_variables?: string[]
  diagnostics?: string[]
  asset_version_ids?: string[]
}

export interface PlotPilotInvocationVariableBinding {
  alias: string
  variable_key?: string
  required?: boolean
  default?: unknown
  source?: string
  enabled?: boolean
  value_type?: string
  scope?: string
  stage?: string
  display_name?: string
  target_display_name?: string
  source_path?: string
  projection_key?: string
  render_mode?: string
  preview_source?: string
}

export interface PlotPilotInvocationVariablePlan {
  aliases?: Record<string, unknown>
  raw_aliases?: Record<string, unknown>
  resolution_items?: Array<Record<string, unknown>>
  required_missing?: string[]
  diagnostics?: string[]
  lineage?: Record<string, string>
  snapshot_hash?: string
  snapshot_items?: Array<Record<string, unknown>>
  snapshot_groups?: Array<Record<string, unknown>>
  bindings?: PlotPilotInvocationVariableBinding[]
}

export interface PlotPilotInvocationSessionDTO {
  id: string
  operation: string
  node_key: string
  policy: PlotPilotInvocationPolicy | string
  status: PlotPilotInvocationSessionStatus
  context?: Record<string, unknown>
  metadata?: Record<string, unknown>
  attempts?: string[]
  prompt_snapshot?: PlotPilotInvocationPromptSnapshot
  variable_plan?: PlotPilotInvocationVariablePlan
  output_bindings?: PlotPilotInvocationVariableBinding[]
}

export interface PlotPilotInvocationAttemptDTO {
  id: string
  session_id: string
  status: string
  content: string
  error?: string
}

export interface PlotPilotAdoptionDecisionDTO {
  id: string
  session_id: string
  attempt_id: string
  decision: string
  accept_content: boolean
  commit_prompt_version: boolean
  commit_variable_outputs: boolean
  commit_variable_bindings: boolean
}

export interface PlotPilotAdoptionCommitStepDTO {
  name: string
  status: string
  result?: Record<string, unknown>
  error?: string
}

export interface PlotPilotAdoptionCommitDTO {
  id: string
  session_id: string
  decision_id: string
  status: string
  steps: PlotPilotAdoptionCommitStepDTO[]
  result?: Record<string, unknown>
  error?: string
}

export interface PlotPilotInvocationResponseDTO {
  session: PlotPilotInvocationSessionDTO
  attempt?: PlotPilotInvocationAttemptDTO | null
  decision?: PlotPilotAdoptionDecisionDTO | null
  commit?: PlotPilotAdoptionCommitDTO | null
  next_action?: string
}

export interface PlotPilotInvocationCreateRequest {
  operation: string
  node_key: string
  variables?: Record<string, unknown>
  context?: Record<string, unknown>
  policy?: PlotPilotInvocationPolicy
  config?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface PlotPilotInvocationAcceptRequest {
  attempt_id: string
  accepted_by?: string
  commit_prompt_version?: boolean
  commit_variable_outputs?: boolean
  commit_variable_bindings?: boolean
  metadata?: Record<string, unknown>
}

export interface PlotPilotInvocationResumeRequest {
  resumed_by?: string
  config?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface PlotPilotInvocationCommitRequest {
  decision_id: string
}

export interface PlotPilotInvocationPromptDraftRequest {
  system_template: string
  user_template?: string | null
}

export interface PlotPilotInvocationVariableUpdateRequest {
  values: Record<string, unknown>
  updated_by?: string
}

export interface PlotPilotInvocationPromptDraftResponse {
  prompt_snapshot?: PlotPilotInvocationPromptSnapshot
  variable_plan?: PlotPilotInvocationVariablePlan
}

export interface ConsistencyIssueDTO {
  type: string
  severity: string
  description: string
  location: number
}

export interface ConsistencyReportDTO {
  issues: ConsistencyIssueDTO[]
  warnings: ConsistencyIssueDTO[]
  suggestions: string[]
}

export interface ChapterStyleWarning {
  pattern: string
  text: string
  start: number
  end: number
  severity: 'info' | 'warning' | (string & {})
}

export interface ChapterChunkStats {
  chars: number
  chunks: number
  estimated_tokens: number
}

export interface StreamGeneratedBeatDTO {
  description: string
  target_words: number
  focus: string
  location_id?: string
  function?: string
  pov?: string
  cast_refs?: string[]
  location_refs?: string[]
  prop_refs?: string[]
  knowledge_refs?: string[]
  visible_action?: string
  conflict?: string
  delta?: string
  handoff_to_next?: string
  must_include?: string[]
  must_not_include?: string[]
  active_action?: string
  emotion_gap?: string
  forbidden_drift?: string
}

export type GenerateChapterStreamEvent =
  | {
      type: 'phase'
      phase: string
      message?: string
    }
  | {
      type: 'llm_chunk'
      stage: string
      text: string
    }
  | {
      type: 'beats_generated'
      beats: StreamGeneratedBeatDTO[]
    }
  | {
      type: 'approval_required'
      session_id: string
      status?: string
      next_action?: string
    }
  | {
      type: 'chunk'
      text: string
      stats: ChapterChunkStats
    }
  | {
      type: 'done'
      content: string
      consistency_report: ConsistencyReportDTO
      token_count: number
      output_tokens: number
      total_tokens: number
      chars: number
      style_warnings?: ChapterStyleWarning[]
      ghost_annotations?: unknown[]
      beats?: StreamGeneratedBeatDTO[]
    }
  | {
      type: 'error'
      message: string
    }
  | {
      type: 'unknown'
      event?: string
      raw: unknown
    }

export interface BeatSceneDTO {
  title: string
  goal: string
  pov_character: string
  location?: string | null
  tone?: string | null
  estimated_words: number
  order_index: number
}

export interface BeatSheetDTO {
  id: string
  chapter_id: string
  scenes: BeatSceneDTO[]
  total_scenes: number
  total_estimated_words: number
}

export interface GenerateBeatSheetRequest {
  chapter_id: string
  outline: string
}

export type BibleRelationshipEntry =
  | string
  | {
      target?: string
      relation?: string
      description?: string
    }

export interface CharacterDTO {
  id: string
  name: string
  description: string
  relationships: BibleRelationshipEntry[]
  gender?: string
  age?: string
  appearance?: string
  personality?: string
  background?: string
  core_motivation?: string
  inner_lack?: string
  role?: string
  mental_state?: string
  verbal_tic?: string
  idle_behavior?: string
  mental_state_reason?: string
  core_belief?: string
  moral_taboos?: string[]
  voice_profile?: Record<string, unknown>
  active_wounds?: Array<Record<string, unknown>>
  public_profile?: string
  hidden_profile?: string
  reveal_chapter?: number | null
}

export interface WorldSettingDTO {
  id: string
  name: string
  description: string
  setting_type: string
}

export interface LocationDTO {
  id: string
  name: string
  description: string
  location_type: string
  parent_id?: string | null
}

export interface TimelineNoteDTO {
  id: string
  event: string
  time_point: string
  description: string
}

export interface StyleNoteDTO {
  id: string
  category: string
  content: string
}

export interface BibleDTO {
  id: string
  novel_id: string
  characters: CharacterDTO[]
  world_settings: WorldSettingDTO[]
  locations: LocationDTO[]
  timeline_notes: TimelineNoteDTO[]
  style_notes: StyleNoteDTO[]
  style?: string
}

export interface BulkUpdateBibleRequest {
  characters: CharacterDTO[]
  world_settings: WorldSettingDTO[]
  locations: LocationDTO[]
  timeline_notes: TimelineNoteDTO[]
  style_notes: StyleNoteDTO[]
}

export type GenerateBibleStage =
  | 'all'
  | 'worldbuilding'
  | 'characters'
  | 'locations'
  | (string & {})

export interface WorldbuildingDimensionData {
  dimension: string
  label: string
  content: Record<string, string>
}

export type GenerateBibleDataType =
  | 'style'
  | 'style_chunk'
  | 'worldbuilding_dimension'
  | 'worldbuilding_field'
  | 'worldbuilding_chunk'
  | 'character'
  | 'character_chunk'
  | 'location'
  | 'location_chunk'
  | (string & {})

export type GenerateBibleStreamEvent =
  | {
      type: 'phase'
      phase: string
      message?: string
    }
  | {
      type: 'data'
      data_type: GenerateBibleDataType
      content?: unknown
      chunk?: string
      dimension?: string
      label?: string
      field?: string
      value?: string
      index?: number
    }
  | {
      type: 'approval_required'
      session_id: string
      status?: string
      next_action?: string
      stage?: string
    }
  | {
      type: 'done'
      novel_id: string
      message?: string
      invocation_session_id?: string
    }
  | {
      type: 'error'
      message: string
    }
  | {
      type: 'unknown'
      event?: string
      raw: unknown
    }

export type BibleStreamEvent = GenerateBibleStreamEvent

export type PlotPilotGenerationPrefsDTO = GenerationPrefsDTO
export type PlotPilotChapterDTO = ChapterDTO
export type PlotPilotNovelDTO = NovelDTO
export type PlotPilotCreateNovelInput = CreateNovelRequest
export type PlotPilotBibleRelationshipEntry = BibleRelationshipEntry
export type PlotPilotCharacterDTO = CharacterDTO
export type PlotPilotWorldSettingDTO = WorldSettingDTO
export type PlotPilotLocationDTO = LocationDTO
export type PlotPilotTimelineNoteDTO = TimelineNoteDTO
export type PlotPilotStyleNoteDTO = StyleNoteDTO
export type PlotPilotBibleDTO = BibleDTO
export type PlotPilotStreamEvent = GenerateBibleStreamEvent
