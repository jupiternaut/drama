import { PlotPilotNativeContainer as DramaPlmUiContainer } from '@drama/plm-ui'

export function PlotPilotNativeContainer() {
  return <DramaPlmUiContainer api={window.electronAPI} />
}
