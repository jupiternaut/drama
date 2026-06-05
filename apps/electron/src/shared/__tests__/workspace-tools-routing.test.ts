import { describe, it, expect } from 'bun:test'
import { buildRouteFromNavigationState, parseRoute, parseRouteToNavigationState } from '../route-parser'
import { routes } from '../routes'
import { getNavigationStateKey, parseNavigationStateKey } from '../types'

describe('workspace tool projection routes', () => {
  it('roundtrips the storylet route through navigation state', () => {
    const route = routes.view.storylet()
    const expectedState = { navigator: 'storylet', details: null } as const

    const state = parseRouteToNavigationState(route)

    expect(state).not.toBeNull()
    expect(state).toEqual(expectedState)
    expect(buildRouteFromNavigationState(state!)).toBe('storylet')
    expect(getNavigationStateKey(state!)).toBe('storylet')
    expect(parseNavigationStateKey('storylet')).toEqual(expectedState)
    expect(parseRoute('storylet')?.name).toBe('storylet')
  })

  it('roundtrips the plotPilot route through navigation state', () => {
    const route = routes.view.plotPilot()
    const expectedState = { navigator: 'plotPilot', details: null } as const

    const state = parseRouteToNavigationState(route)

    expect(state).not.toBeNull()
    expect(state).toEqual(expectedState)
    expect(buildRouteFromNavigationState(state!)).toBe('plotpilot')
    expect(getNavigationStateKey(state!)).toBe('plotpilot')
    expect(parseNavigationStateKey('plotpilot')).toEqual(expectedState)
    expect(parseRoute('plotpilot')?.name).toBe('plotpilot')
  })
})
