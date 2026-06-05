interface CraftAgentsLogoProps {
  className?: string
}

export function CraftAgentsLogo({ className }: CraftAgentsLogoProps) {
  return (
    <svg
      viewBox="0 0 184 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Drama"
    >
      <defs>
        <linearGradient id="drama-wordmark" x1="8" y1="10" x2="175" y2="58">
          <stop stopColor="#f7b7d3" />
          <stop offset="0.5" stopColor="#87d9d2" />
          <stop offset="1" stopColor="#9a88ff" />
        </linearGradient>
      </defs>
      <path
        d="M20 12h21c14.2 0 23.2 7.6 23.2 19.9S55.2 52 41 52H20V12Zm19.7 30.4c8 0 12.9-3.8 12.9-10.5s-4.9-10.4-12.9-10.4h-8.4v20.9h8.4ZM73 23.5h10.5v4.2c2.1-3.2 5.7-4.9 10.7-4.9v9.8c-6.4-.7-10.1 2-10.1 8.2V52H73V23.5Zm27.4 14.3c0-8.8 6.6-15 15.4-15 4.4 0 7.8 1.5 9.8 4.1v-3.4h10.7V52h-10.7v-3.4c-2 2.6-5.4 4.1-9.8 4.1-8.8 0-15.4-6.2-15.4-14.9Zm25.5 0c0-4.1-3-7-7.1-7s-7.1 2.9-7.1 7 3 7 7.1 7 7.1-2.9 7.1-7Zm18.5-14.3h10.5v3.1c2-2.5 5.1-3.8 9-3.8 4.2 0 7.5 1.6 9.4 4.8 2.3-3.1 5.9-4.8 10.3-4.8 7.2 0 11.8 4.8 11.8 12.8V52h-11.1V37.1c0-3.5-1.8-5.6-4.8-5.6-3.2 0-5.3 2.3-5.3 6.2V52h-11.1V37.1c0-3.5-1.8-5.6-4.8-5.6-3.2 0-5.3 2.3-5.3 6.2V52h-11.1V23.5Z"
        fill="url(#drama-wordmark)"
      />
    </svg>
  )
}
