import { DramaSymbol } from "./DramaSymbol"

interface CraftAppIconProps {
  className?: string
  size?: number
}

export function CraftAppIcon({ className, size = 64 }: CraftAppIconProps) {
  return (
    <DramaSymbol className={className} style={{ width: size, height: size }} />
  )
}
