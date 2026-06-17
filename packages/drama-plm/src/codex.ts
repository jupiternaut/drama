export interface PlotPilotCodexStatusResponse {
  available: boolean
  authenticated: boolean
  requires_openai_auth?: boolean
  account?: string | null
  email?: string | null
  plan_type?: string | null
  error?: string | null
}

export interface PlotPilotCodexLoginStartResponse {
  auth_url: string
  login_id: string
}

export interface PlotPilotCodexLogoutResponse {
  ok: boolean
  error?: string | null
}
