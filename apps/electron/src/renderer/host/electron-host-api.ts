import type {
  DramaHostApi,
  DramaHostCapabilities,
  DramaHostConfirmDialogSpec,
  DramaHostOpenFileDialogSpec,
  DramaHostOpenResult,
} from '@drama/host'

import type { ElectronAPI } from '../../shared/types'

const electronHostCapabilities: DramaHostCapabilities = {
  'shell.openUrl': true,
  'shell.openFile': true,
  'shell.showInFolder': true,
  'files.readTextFile': true,
  'files.readBinaryFile': true,
  'dialogs.confirm': true,
  'dialogs.openFile': true,
  'clipboard.readText': true,
  'clipboard.writeText': true,
  'lifecycle.quit': true,
}

function toOpenResult(action: () => Promise<void>): Promise<DramaHostOpenResult> {
  return action()
    .then(() => ({ ok: true }))
    .catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }))
}

function toBrowserConfirm(spec: DramaHostConfirmDialogSpec): boolean {
  if (typeof globalThis.confirm !== 'function') return false
  return globalThis.confirm(spec.detail ? `${spec.message}\n\n${spec.detail}` : spec.message)
}

function normalizeOpenFileSpec(spec?: DramaHostOpenFileDialogSpec): DramaHostOpenFileDialogSpec | undefined {
  if (!spec) return undefined
  return {
    ...spec,
    allowFiles: spec.allowFiles ?? true,
  }
}

export function createElectronHostApi(electronAPI: ElectronAPI): DramaHostApi {
  return {
    getInfo: () => {
      const versions = electronAPI.getVersions()
      return {
        kind: 'electron',
        name: 'Drama Electron Host',
        version: versions.electron,
        platform: globalThis.navigator?.platform,
        userAgent: globalThis.navigator?.userAgent,
      }
    },
    getCapabilities: () => ({ ...electronHostCapabilities }),
    shell: {
      openUrl: (url) => toOpenResult(() => electronAPI.openUrl(url)),
      openFile: (path) => toOpenResult(() => electronAPI.openFile(path)),
      showInFolder: (path) => toOpenResult(() => electronAPI.showInFolder(path)),
    },
    files: {
      readTextFile: (path) => electronAPI.readFile(path),
      readBinaryFile: (path) => electronAPI.readFileBinary(path),
    },
    dialogs: {
      confirm: async (spec) => toBrowserConfirm(spec),
      openFile: async (spec) => {
        const normalized = normalizeOpenFileSpec(spec)
        if (normalized?.allowDirectories && !normalized.allowFiles) return null
        const paths = await electronAPI.openFileDialog()
        return paths.length > 0 ? paths : null
      },
    },
    clipboard: {
      readText: async () => globalThis.navigator?.clipboard?.readText?.() ?? '',
      writeText: async (text) => {
        await globalThis.navigator?.clipboard?.writeText?.(text)
      },
    },
    lifecycle: {
      quit: () => electronAPI.menuQuit(),
    },
  }
}

export const electronHostApi = createElectronHostApi(window.electronAPI)
