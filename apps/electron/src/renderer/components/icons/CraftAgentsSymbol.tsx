import { DramaSymbol } from "./DramaSymbol"

interface CraftAgentsSymbolProps {
  className?: string
}

export function CraftAgentsSymbol({ className }: CraftAgentsSymbolProps) {
  return <DramaSymbol className={className} />
}
