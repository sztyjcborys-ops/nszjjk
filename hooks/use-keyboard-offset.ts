"use client"

import { useState, useEffect, useRef } from "react"

export function useKeyboardOffset() {
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const rafRef = useRef<number | undefined>(undefined)
  const lastOffsetRef = useRef(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!window.visualViewport) return

    const updateKeyboardOffset = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        const viewport = window.visualViewport!
        const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop
        const offset = keyboardHeight > 0 ? keyboardHeight : 0

        if (Math.abs(offset - lastOffsetRef.current) > 1) {
          lastOffsetRef.current = offset
          setKeyboardOffset(offset)
        }
      })
    }

    updateKeyboardOffset()
    window.visualViewport.addEventListener("resize", updateKeyboardOffset)
    window.visualViewport.addEventListener("scroll", updateKeyboardOffset)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateKeyboardOffset)
        window.visualViewport.removeEventListener("scroll", updateKeyboardOffset)
      }
    }
  }, [])

  return keyboardOffset
}
