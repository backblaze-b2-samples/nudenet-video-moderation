import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  const handleChange = () => onStoreChange()

  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }

  mql.addListener(handleChange)
  return () => mql.removeListener(handleChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
