export type StoryletCardKind =
  | 'story'
  | 'world'
  | 'character'
  | 'location'
  | 'plot'
  | 'chapter'
  | 'scene'
  | 'other'

export interface StoryletFieldState {
  id?: string
  key?: string
  name?: string
  value: unknown
  text: string
}

export interface StoryletCardState {
  id: string
  title: string
  kind: StoryletCardKind
  templateId?: string
  moduleType?: string
  description?: string
  fields: StoryletFieldState[]
  position?: { x: number; y: number }
}

export interface StoryletEdgeState {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}

export interface StoryletStoryState {
  schema: 'drama.storylet_state.v1'
  source: 'storylet'
  graphId: string
  graphName: string
  cards: StoryletCardState[]
  edges: StoryletEdgeState[]
  summary: {
    cardCount: number
    edgeCount: number
    worldCount: number
    characterCount: number
    locationCount: number
    chapterCount: number
    sceneCount: number
  }
}
