import type { CSSProperties } from 'react'

const dramaIconUrl = new URL('../../assets/drama-icon.png', import.meta.url).href

interface DramaSymbolProps {
  className?: string
  style?: CSSProperties
}

export function DramaSymbol({ className, style }: DramaSymbolProps) {
  return (
    <img
      src={dramaIconUrl}
      className={className}
      style={{
        display: 'block',
        objectFit: 'contain',
        ...style,
      }}
      draggable={false}
      aria-hidden="true"
    />
  )
}
