import * as React from "react"

// Updated to align with mobile-first responsive plan
const MOBILE_BREAKPOINT = 640

export function useIsMobile(customBreakpoint?: number) {
  const breakpoint = customBreakpoint || MOBILE_BREAKPOINT;
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth <= breakpoint)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth <= breakpoint)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return !!isMobile
}
