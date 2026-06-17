export type DramaHostKind = 'electron' | 'browser' | 'gecko' | 'test'

export type DramaHostCapability =
  | 'shell.openUrl'
  | 'shell.openFile'
  | 'shell.showInFolder'
  | 'files.readTextFile'
  | 'files.readBinaryFile'
  | 'files.writeTextFile'
  | 'dialogs.confirm'
  | 'dialogs.openFile'
  | 'dialogs.saveFile'
  | 'clipboard.readText'
  | 'clipboard.writeText'
  | 'lifecycle.focusWindow'
  | 'lifecycle.quit'
  | 'notifications.show'
  | 'rpc.request'
  | 'events.subscribe'

export type DramaHostCapabilities = Partial<Record<DramaHostCapability, boolean>>

export interface DramaHostInfo {
  kind: DramaHostKind
  name: string
  version?: string
  platform?: string
  userAgent?: string
}

export interface DramaHostOpenResult {
  ok: boolean
  error?: string
}

export interface DramaHostFileFilter {
  name: string
  extensions: string[]
}

export interface DramaHostOpenFileDialogSpec {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  allowFiles?: boolean
  allowDirectories?: boolean
  allowMultiple?: boolean
  showHiddenFiles?: boolean
  filters?: DramaHostFileFilter[]
}

export interface DramaHostSaveFileDialogSpec {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: DramaHostFileFilter[]
}

export interface DramaHostConfirmDialogSpec {
  title?: string
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export interface DramaHostNotificationSpec {
  title: string
  body?: string
  silent?: boolean
}

export interface DramaHostEventEnvelope<TPayload = unknown> {
  type: string
  payload: TPayload
  createdAt: string
}

export type DramaHostUnsubscribe = () => void

export interface DramaHostShellApi {
  openUrl(url: string): Promise<DramaHostOpenResult>
  openFile?(path: string): Promise<DramaHostOpenResult>
  showInFolder?(path: string): Promise<DramaHostOpenResult>
}

export interface DramaHostFilesApi {
  readTextFile?(path: string): Promise<string>
  readBinaryFile?(path: string): Promise<Uint8Array | ArrayBuffer>
  writeTextFile?(path: string, contents: string): Promise<void>
}

export interface DramaHostDialogsApi {
  confirm?(spec: DramaHostConfirmDialogSpec): Promise<boolean>
  openFile?(spec?: DramaHostOpenFileDialogSpec): Promise<string[] | null>
  saveFile?(spec?: DramaHostSaveFileDialogSpec): Promise<string | null>
}

export interface DramaHostClipboardApi {
  readText?(): Promise<string>
  writeText?(text: string): Promise<void>
}

export interface DramaHostLifecycleApi {
  focusWindow?(): Promise<void>
  quit?(): Promise<void>
}

export interface DramaHostNotificationsApi {
  show?(spec: DramaHostNotificationSpec): Promise<void>
}

export interface DramaHostRpcApi {
  request?<TResponse = unknown, TRequest = unknown>(channel: string, payload?: TRequest): Promise<TResponse>
}

export interface DramaHostEventsApi {
  subscribe?<TPayload = unknown>(
    type: string,
    listener: (event: DramaHostEventEnvelope<TPayload>) => void,
  ): DramaHostUnsubscribe
}

export interface DramaHostApi {
  getInfo(): DramaHostInfo
  getCapabilities(): DramaHostCapabilities
  shell: DramaHostShellApi
  files?: DramaHostFilesApi
  dialogs?: DramaHostDialogsApi
  clipboard?: DramaHostClipboardApi
  lifecycle?: DramaHostLifecycleApi
  notifications?: DramaHostNotificationsApi
  rpc?: DramaHostRpcApi
  events?: DramaHostEventsApi
}

export interface CreateBrowserHostApiOptions {
  name?: string
  version?: string
  userAgent?: string
  openUrl?: (url: string) => void | Promise<void>
  confirm?: (spec: DramaHostConfirmDialogSpec) => boolean | Promise<boolean>
  readClipboardText?: () => string | Promise<string>
  writeClipboardText?: (text: string) => void | Promise<void>
}

const browserCapabilities: DramaHostCapabilities = {
  'shell.openUrl': true,
  'dialogs.confirm': true,
  'clipboard.readText': true,
  'clipboard.writeText': true,
}

export function createBrowserHostApi(options: CreateBrowserHostApiOptions = {}): DramaHostApi {
  const userAgent = options.userAgent ?? globalThis.navigator?.userAgent
  const confirmHandler =
    options.confirm ??
    ((spec: DramaHostConfirmDialogSpec) => {
      if (typeof globalThis.confirm !== 'function') return false
      return globalThis.confirm(spec.detail ? `${spec.message}\n\n${spec.detail}` : spec.message)
    })

  const openUrl =
    options.openUrl ??
    ((url: string) => {
      globalThis.window?.open(url, '_blank', 'noopener,noreferrer')
    })

  return {
    getInfo: () => ({
      kind: 'browser',
      name: options.name ?? 'Drama Browser Host',
      version: options.version,
      userAgent,
    }),
    getCapabilities: () => ({ ...browserCapabilities }),
    shell: {
      async openUrl(url: string) {
        try {
          await openUrl(url)
          return { ok: true }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) }
        }
      },
    },
    dialogs: {
      async confirm(spec: DramaHostConfirmDialogSpec) {
        return Boolean(await confirmHandler(spec))
      },
    },
    clipboard: {
      async readText() {
        if (options.readClipboardText) return options.readClipboardText()
        return globalThis.navigator?.clipboard?.readText?.() ?? ''
      },
      async writeText(text: string) {
        if (options.writeClipboardText) {
          await options.writeClipboardText(text)
          return
        }
        await globalThis.navigator?.clipboard?.writeText?.(text)
      },
    },
  }
}

export function hasHostCapability(host: DramaHostApi, capability: DramaHostCapability): boolean {
  return host.getCapabilities()[capability] === true
}

export function assertHostCapability(host: DramaHostApi, capability: DramaHostCapability): void {
  if (hasHostCapability(host, capability)) return
  const info = host.getInfo()
  throw new Error(`Drama host "${info.name}" (${info.kind}) does not provide ${capability}.`)
}

export type {
  DramaRuntimeClient,
  DramaRuntimeClientOptions,
  DramaRuntimeRpcRequest,
  DramaRuntimeRpcResponse,
  DramaRuntimeState,
  DramaRuntimeStatus,
} from './runtime-client.ts'
export { DramaRuntimeError, createDramaRuntimeClient } from './runtime-client.ts'
