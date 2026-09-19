"use client"

import type React from "react"
import type { ReactNode } from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Smile, Paperclip, Phone, Mail, MessageSquare, Bot } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset"
import { readSavedAddress } from "@/lib/waste-schedule"

interface Message {
  id: string
  content: string
  role: "user" | "assistant" | "system"
  timestamp?: Date
  isError?: boolean
  isNew?: boolean
  isStreaming?: boolean
  displayedContent?: string
}

// Markdown (basic): pogrubienia, kursywa oraz linki [tekst](url).
function parseMarkdown(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\((?:https?:\/\/)[^)]+\)|\*\*.*?\*\*|\*.*?\*|_.*?_)/g)
  return parts.map((part, index) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (linkMatch) {
      const [, label, href] = linkMatch
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline underline-offset-2 hover:text-blue-700 break-words"
        >
          {label}
        </a>
      )
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      const content = part.slice(2, -2)
      return (
        <strong key={index} className="font-semibold">
          {content}
        </strong>
      )
    }
    if (
      (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      const content = part.slice(1, -1)
      return (
        <em key={index} className="italic">
          {content}
        </em>
      )
    }
    return part
  })
}

// Tokens → buttons
function parseContactInfo(text: string): ReactNode {
  const parts = text.split(/(\[(?:PHONE|EMAIL|WHATSAPP|LINK):[^\]]+\])/g)

  return parts.map((part, index) => {
    const phoneMatch = part.match(/\[PHONE:(\+?\d+)\]/)
    const emailMatch = part.match(/\[EMAIL:([^\]]+)\]/)
    const whatsappMatch = part.match(/\[WHATSAPP:(\+?\d+)\]/)
    const linkMatch = part.match(/\[LINK:([^\]]+)\]/)

    if (phoneMatch) {
      const phoneNumber = phoneMatch[1]
      return (
        <button
          key={index}
          onClick={() => window.open(`tel:${phoneNumber}`, "_blank")}
          className="inline-flex items-center gap-1 px-2 py-1 mx-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
        >
          <Phone size={12} />
          {phoneNumber}
        </button>
      )
    }

    if (emailMatch) {
      const email = emailMatch[1]
      return (
        <button
          key={index}
          onClick={() => window.open(`mailto:${email}`, "_blank")}
          className="inline-flex items-center gap-1 px-2 py-1 mx-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors break-all"
        >
          <Mail size={12} />
          {email}
        </button>
      )
    }

    if (whatsappMatch) {
      const whatsappNumber = whatsappMatch[1]
      return (
        <button
          key={index}
          onClick={() => window.open(`https://wa.me/${whatsappNumber.replace("+", "")}`, "_blank")}
          className="inline-flex items-center gap-1 px-2 py-1 mx-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
        >
          <MessageSquare size={12} />
          WhatsApp
        </button>
      )
    }

    if (linkMatch) {
      const target = linkMatch[1].toLowerCase().trim()
      const routes: Record<string, { href: string; label: string }> = {
        aktualnosci: { href: "/aktualnosci", label: "Aktualności" },
        wydarzenia: { href: "/wydarzenia", label: "Wydarzenia" },
        "wywoz-smieci": { href: "/wywoz-smieci", label: "Wywóz śmieci" },
        smieci: { href: "/wywoz-smieci", label: "Wywóz śmieci" },
        "zglos-sprawe": { href: "/zglos-sprawe", label: "Zgłoś sprawę" },
        ankiety: { href: "/ankiety", label: "Ankiety" },
        galeria: { href: "/galeria", label: "Galeria" },
        pomysly: { href: "/pomysly", label: "Pomysły dla Jejkowic" },
        "poznaj-jejkowice": { href: "/poznaj-jejkowice", label: "Poznaj Jejkowice" },
        "o-gminie": { href: "/poznaj-jejkowice", label: "Poznaj Jejkowice" },
      }
      const matched = routes[target] ?? { href: "/", label: "Strona główna" }
      const href = matched.href
      const label = matched.label
      return (
        <button
          key={index}
          onClick={() => (window.location.href = href)}
          className="inline-flex items-center gap-1 px-2 py-1 mx-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          aria-label={label}
        >
          {label}
        </button>
      )
    }

    return <span key={index}>{parseMarkdown(part)}</span>
  })
}

// End punctuation
function isMessageComplete(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false
  const lastChar = trimmed[trimmed.length - 1]
  const properEndings = [".", "!", "?", ":", ")"]
  return properEndings.includes(lastChar)
}

// Chat hook (AI only)
/**
 * Błąd żądania do /api/chat z rozróżnieniem przyczyny. `rateLimited` mówi, że
 * to chwilowy limit AI (HTTP 429) — reagujemy inaczej niż na awarię: nie
 * bombardujemy serwera ponowieniami (każde = pełna pętla agenta), tylko raz
 * odczekujemy sugerowany czas i pokazujemy szczery komunikat.
 */
class ChatRequestError extends Error {
  rateLimited: boolean
  retryAfter: number
  constructor(message: string, rateLimited: boolean, retryAfter: number) {
    super(message)
    this.name = "ChatRequestError"
    this.rateLimited = rateLimited
    this.retryAfter = retryAfter
  }
}

function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome_message",
      role: "assistant",
      content:
        "Cześć! 👋 Jestem asystentem AI. Odpowiem na pytania o życie w gminie — aktualności, wydarzenia, wywóz śmieci czy załatwianie spraw — a w razie potrzeby sięgnę też do informacji z oficjalnej strony urzędu. Śmiało pytaj!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreamingContent, setIsStreamingContent] = useState(false)

  // Stały identyfikator tej rozmowy (jedna sesja przeglądarki). Pozwala panelowi
  // admina pogrupować logowane pary pytanie → odpowiedź w jedną rozmowę.
  const conversationIdRef = useRef<string>("")
  if (!conversationIdRef.current) {
    conversationIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  // Wysyła konkretną treść pytania do /api/chat. Wydzielone z handleSubmit, żeby
  // dało się wywołać także spoza pola tekstowego — np. z wyszukiwarki na stronie
  // głównej (zdarzenie „apogeum:ask-ai”), która przekazuje pytanie mieszkańca
  // wprost do asystenta.
  const sendMessage = useCallback(
    async (rawText: string) => {
      const currentInput = rawText.trim()
      if (!currentInput || isLoading) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: currentInput,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])

      setIsLoading(true)
      setIsStreamingContent(true)

      const payload = JSON.stringify({
        messages: [...messages, userMessage].map((msg) => ({
          role: msg.role === "system" ? "system" : msg.role,
          content: msg.content,
        })),
        // Adres zapisany w module „Wywóz śmieci" (jeśli istnieje) — dzięki temu
        // AI odpowiada o terminach z naszego harmonogramu i nie pyta o adres.
        wasteAddress: readSavedAddress(),
        // Identyfikator rozmowy — serwer zapisuje go w lekkim logu dla panelu.
        conversationId: conversationIdRef.current,
      })

      // Zabezpieczenie przed błędami żądania. Rozróżniamy DWA przypadki, bo mają
      // różne przyczyny i różną właściwą reakcję:
      //   • błąd przejściowy (sieć / 5xx / timeout) — ponawiamy szybko kilka razy,
      //   • limit AI (429) — NIE bombardujemy serwera (każde ponowienie to pełna
      //     pętla agenta = kilka zapytań do Groqa, co tylko pogłębia limit).
      //     Odczekujemy raz sugerowany czas i, jeśli dalej limit, pokazujemy
      //     szczery komunikat.
      // Odpowiedź route przychodzi w całości (nie strumieniowo), więc ponowienie
      // jest bezpieczne — wiadomość asystenta tworzymy dopiero z pełną treścią.
      // Jedno ponowienie w zupełności wystarcza: serwer sam ma już fallback modeli
      // i twardy budżet czasu, więc zwraca sensowną odpowiedź zamiast 500. Każde
      // dodatkowe ponowienie to kolejna pełna pętla agenta = zbędne obciążenie Groqa.
      const MAX_TRANSIENT_RETRIES = 1
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      // Pobiera pełną odpowiedź route dla jednej próby. Rzuca `ChatRequestError`
      // z informacją, czy to limit (429), żeby pętla dobrała właściwą strategię.
      const fetchAnswer = async (): Promise<string> => {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}) as Record<string, unknown>)
          const retryAfter =
            typeof errorData.retryAfter === "number"
              ? errorData.retryAfter
              : Number(response.headers.get("retry-after")) || 0
          throw new ChatRequestError(
            String(errorData.details || `HTTP error! status: ${response.status}`),
            response.status === 429 || errorData.error === "RATE_LIMIT",
            retryAfter,
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new ChatRequestError("No response body", false, 0)

        let text = ""
        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            if (chunk) text += chunk
          }
        } finally {
          reader.releaseLock()
        }

        if (!text.trim()) throw new ChatRequestError("Nie otrzymano odpowiedzi od AI", false, 0)
        return text
      }

      try {
        let assistantMessage = ""
        let lastError: unknown = null
        let transientRetries = 0

        while (true) {
          try {
            assistantMessage = await fetchAnswer()
            lastError = null
            break
          } catch (err) {
            lastError = err
            const isRateLimit = err instanceof ChatRequestError && err.rateLimited

            if (isRateLimit) {
              // Limit AI: serwer już raz odczekał i ponowił WEWNĘTRZNIE, zanim
              // zwrócił 429. Kolejne ponowienie z klienta to następna PEŁNA pętla
              // agenta (kilka zapytań do Groqa) = tylko pogłębia limit na darmowym
              // planie i przedłuża wiszenie. Dlatego od razu pokazujemy szczery
              // komunikat „daj mi chwilę", zamiast czekać i uderzać ponownie.
              break
            }

            // Błąd przejściowy: kilka szybkich ponowień z narastającym odstępem.
            if (transientRetries < MAX_TRANSIENT_RETRIES) {
              transientRetries++
              await delay(transientRetries === 1 ? 800 : 1800)
              continue
            }
            break
          }
        }

        if (lastError) throw lastError

        const assistantId = (Date.now() + 1).toString()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: assistantMessage,
            timestamp: new Date(),
            isNew: true,
            isStreaming: true,
            displayedContent: assistantMessage,
          },
        ])

        if (!isMessageComplete(assistantMessage)) {
          const lastChar = assistantMessage.trim().slice(-1)
          if (![".", "!", "?", ":", ")"].includes(lastChar)) {
            assistantMessage += "."
          }
        }

        const finalMessage = assistantMessage
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: finalMessage, isStreaming: false, isNew: false, displayedContent: undefined }
              : msg,
          ),
        )
      } catch (err) {
        // Szczery komunikat zależny od przyczyny: przy limicie AI mówimy wprost,
        // że to chwilowe przeciążenie (a nie awaria), i prosimy o chwilę.
        const isRateLimit = err instanceof ChatRequestError && err.rateLimited
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "system",
          content: isRateLimit
            ? "Za dużo zapytań do AI w tej chwili — daj mi chwilę i spróbuj ponownie za moment."
            : "Przerwa techniczna",
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
        setIsStreamingContent(false)
      }
    },
    [messages, isLoading],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      const text = input.trim()
      setInput("")
      void sendMessage(text)
    },
    [input, isLoading, sendMessage],
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    sendMessage,
    isLoading,
    isStreamingContent,
  }
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const keyboardOffset = useKeyboardOffset()
  const prevKeyboardOffsetRef = useRef(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    sendMessage,
    isLoading,
    isStreamingContent,
  } = useAIChat()

  // DRAG SYSTEM - START
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCornerDocked, setIsCornerDocked] = useState(true)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [hasUserMovedButton, setHasUserMovedButton] = useState(false)
  const dragStartPos = useRef<{ x: number; y: number; offsetX?: number; offsetY?: number }>({ x: 0, y: 0 })

  const buttonSize = 48

  const getNavbarHeight = () => {
    const navbar = document.querySelector("header")
    return navbar ? navbar.offsetHeight : 80
  }

  useEffect(() => {
    if (typeof window !== "undefined" && !hasUserMovedButton) {
      const margin = 16

      if (buttonRef.current) {
        buttonRef.current.style.bottom = `${margin}px`
        buttonRef.current.style.right = `${margin}px`
        buttonRef.current.style.top = "auto"
        buttonRef.current.style.left = "auto"
      }

      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const newPosition = {
        x: windowWidth - margin,
        y: windowHeight - margin,
      }

      setPosition(newPosition)
      setIsCornerDocked(true)
    }
  }, [isMobile, hasUserMovedButton])

  const velocity = useRef({ x: 0, y: 0 })
  const lastTime = useRef(0)
  const lastPosition = useRef({ x: 0, y: 0 })
  const animationFrame = useRef<number | null>(null)
  const isDragStarted = useRef(false)

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
      animationFrame.current = null
    }

    setIsAnimating(false)
    setIsDragging(true)
    isDragStarted.current = true

    if (isCornerDocked && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()

      buttonRef.current.style.top = `${rect.top}px`
      buttonRef.current.style.left = `${rect.left}px`
      buttonRef.current.style.bottom = "auto"
      buttonRef.current.style.right = "auto"

      setIsCornerDocked(false)
    }

    const buttonRect = buttonRef.current?.getBoundingClientRect()
    if (!buttonRect) return

    const currentX = buttonRect.left + buttonSize / 2
    const currentY = buttonRect.top + buttonSize / 2

    dragStartPos.current = { x: currentX, y: currentY }
    lastPosition.current = { x: clientX, y: clientY }
    lastTime.current = performance.now()
    velocity.current = { x: 0, y: 0 }

    const offsetX = clientX - currentX
    const offsetY = clientY - currentY
    dragStartPos.current.offsetX = offsetX
    dragStartPos.current.offsetY = offsetY

    if (buttonRef.current) {
      buttonRef.current.style.transition = "none"
    }
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || isAnimating || !buttonRef.current) return

    const now = performance.now()
    const deltaTime = now - lastTime.current

    if (deltaTime > 0) {
      const deltaX = clientX - lastPosition.current.x
      const deltaY = clientY - lastPosition.current.y

      const newVelX = deltaX / deltaTime
      const newVelY = deltaY / deltaTime

      velocity.current.x = velocity.current.x * 0.8 + newVelX * 0.2
      velocity.current.y = velocity.current.y * 0.8 + newVelY * 0.2
    }

    const newX = clientX - (dragStartPos.current.offsetX || 0)
    const newY = clientY - (dragStartPos.current.offsetY || 0)

    const halfSize = buttonSize / 2

    const navbarHeight = getNavbarHeight()
    const windowHeight = window.innerHeight
    const minY = navbarHeight + 8 + halfSize
    const maxY = windowHeight - 8 - halfSize

    const constrainedY = Math.max(minY, Math.min(maxY, newY))

    buttonRef.current.style.left = `${newX - halfSize}px`
    buttonRef.current.style.top = `${constrainedY - halfSize}px`

    setPosition({ x: newX, y: constrainedY })

    lastPosition.current = { x: clientX, y: clientY }
    lastTime.current = now
  }

  const handleDragEnd = () => {
    if (!isDragStarted.current || isAnimating || !buttonRef.current) {
      setIsDragging(false)
      isDragStarted.current = false
      return
    }

    setHasUserMovedButton(true)
    setIsDragging(false)
    isDragStarted.current = false
    setIsAnimating(true)

    const buttonRect = buttonRef.current?.getBoundingClientRect()
    const halfSize = buttonSize / 2
    const currentX = buttonRect.left + halfSize
    const currentY = buttonRect.top + halfSize

    startFlingAnimation(currentX, currentY, velocity.current.x, velocity.current.y)
  }

  const startFlingAnimation = (startX: number, startY: number, velX: number, velY: number) => {
    if (!buttonRef.current) return

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const halfSize = buttonSize / 2
    const margin = 8
    const navbarHeight = getNavbarHeight()

    const friction = 0.97
    const edgeFriction = 0.7
    const bounceMultiplier = 0.12
    const minVelocity = 0.1
    const timeStep = 16
    const overflowLimit = buttonSize * 0.6

    let currentX = startX
    let currentY = startY
    let currentVelX = velX * timeStep
    let currentVelY = velY * timeStep
    let hasHitEdge = false
    let hasBouncedX = false
    let hasBouncedY = false
    let bounceDelayFrames = 0

    const minX = halfSize + margin
    const maxX = windowWidth - halfSize - margin
    const minY = navbarHeight + margin + halfSize
    const maxY = windowHeight - margin - halfSize

    const animate = () => {
      currentX += currentVelX
      currentY += currentVelY

      if (!hasHitEdge) {
        currentVelX *= friction
        currentVelY *= friction
      }

      if (
        currentX < minX - overflowLimit ||
        currentX > maxX + overflowLimit ||
        currentY < minY - overflowLimit ||
        currentY > maxY + overflowLimit
      ) {
        bounceDelayFrames++
      }

      if (bounceDelayFrames > 4) {
        if (currentX < minX - overflowLimit && !hasBouncedX) {
          hasBouncedX = true
          hasHitEdge = true
          currentVelX = Math.abs(currentVelX) * bounceMultiplier
        } else if (currentX > maxX + overflowLimit && !hasBouncedX) {
          hasBouncedX = true
          hasHitEdge = true
          currentVelX = -Math.abs(currentVelX) * bounceMultiplier
        }

        if (currentY < minY - overflowLimit && !hasBouncedY) {
          hasBouncedY = true
          hasHitEdge = true
          currentVelY = Math.abs(currentVelY) * bounceMultiplier
        }

        if (currentY > maxY + overflowLimit && !hasBouncedY) {
          hasBouncedY = true
          hasHitEdge = true
          currentVelY = -Math.abs(currentVelY) * bounceMultiplier
        }
      }

      if (hasHitEdge) {
        currentVelX *= edgeFriction
        currentVelY *= edgeFriction
      }

      const isWithinBoundsX = currentX >= minX && currentX <= maxX
      const isWithinBoundsY = currentY >= minY && currentY <= maxY
      const isMovingSlowly = Math.abs(currentVelX) < 0.5 && Math.abs(currentVelY) < 0.5

      if (hasHitEdge && isMovingSlowly && isWithinBoundsX && isWithinBoundsY) {
        if (currentX < windowWidth / 2) {
          currentX = minX
        } else {
          currentX = maxX
        }

        if (currentY < minY) currentY = minY
        if (currentY > maxY) currentY = maxY

        currentVelX = 0
        currentVelY = 0
      }

      buttonRef.current!.style.left = `${currentX - halfSize}px`
      buttonRef.current!.style.top = `${currentY - halfSize}px`

      setPosition({ x: currentX, y: currentY })

      const hasVelocity = Math.abs(currentVelX) > minVelocity || Math.abs(currentVelY) > minVelocity

      if (hasVelocity) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        snapToEdge(currentX, currentY)
      }
    }

    animationFrame.current = requestAnimationFrame(animate)
  }

  const snapToEdge = (currentX: number, currentY: number) => {
    if (!buttonRef.current) return

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const halfSize = buttonSize / 2
    const cornerMargin = 16
    const edgeMargin = 8
    const navbarHeight = getNavbarHeight()

    const isInBottomZone = currentY > windowHeight - 80

    if (isInBottomZone) {
      const isCloserToLeft = currentX < windowWidth / 2

      buttonRef.current.style.transition = "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)"

      if (isCloserToLeft) {
        buttonRef.current.style.bottom = `${cornerMargin}px`
        buttonRef.current.style.left = `${cornerMargin}px`
        buttonRef.current.style.top = "auto"
        buttonRef.current.style.right = "auto"
        setPosition({ x: cornerMargin + halfSize, y: windowHeight - cornerMargin - halfSize })
      } else {
        buttonRef.current.style.bottom = `${cornerMargin}px`
        buttonRef.current.style.left = `${windowWidth - cornerMargin - buttonSize}px`
        buttonRef.current.style.top = "auto"
        buttonRef.current.style.right = "auto"
        setPosition({ x: windowWidth - cornerMargin - halfSize, y: windowHeight - cornerMargin - halfSize })
      }

      setIsCornerDocked(true)
    } else {
      const targetX = currentX < windowWidth / 2 ? edgeMargin + halfSize : windowWidth - edgeMargin - halfSize
      const minY = navbarHeight + edgeMargin + halfSize
      const maxY = windowHeight - edgeMargin - halfSize
      const targetY = Math.max(minY, Math.min(maxY, currentY))

      buttonRef.current.style.transition = "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      buttonRef.current.style.left = `${targetX - halfSize}px`
      buttonRef.current.style.top = `${targetY - halfSize}px`
      buttonRef.current.style.bottom = "auto"
      buttonRef.current.style.right = "auto"

      setIsCornerDocked(false)
      setPosition({ x: targetX, y: targetY })
    }

    setTimeout(() => {
      setIsAnimating(false)
    }, 600)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.preventDefault()
      e.stopPropagation()
      toggleChatbot()
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      handleDragMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        e.preventDefault()
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleMouseUp = () => handleDragEnd()
    const handleTouchEnd = () => handleDragEnd()

    document.addEventListener("mousemove", handleMouseMove, { passive: false })
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isDragging, isAnimating])

  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [])

  // Przywróć zablokowane style, jeśli komponent odmontuje się przy otwartym czacie
  useEffect(() => {
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      const navbar = document.querySelector("header")
      if (navbar) (navbar as HTMLElement).style.display = ""
    }
  }, [])

  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      const container = messagesContainerRef.current

      const scrollToBottom = (smooth = true) => {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: smooth ? "smooth" : "auto",
          })
        })
      }

      const scrollTimeout = setTimeout(() => {
        scrollToBottom(true)
      }, 50)

      return () => clearTimeout(scrollTimeout)
    }
  }, [messages, isOpen, isLoading])

  useEffect(() => {
    if (isOpen && messagesContainerRef.current && isMobile) {
      const container = messagesContainerRef.current
      const keyboardOpened = keyboardOffset > 0 && prevKeyboardOffsetRef.current === 0
      const keyboardClosed = keyboardOffset === 0 && prevKeyboardOffsetRef.current > 0

      if (keyboardOpened) {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "auto",
          })
        })
      }

      if (keyboardClosed) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          })
        }, 100)
      }

      prevKeyboardOffsetRef.current = keyboardOffset
    }
  }, [keyboardOffset, isOpen, isMobile])

  // Wspólna logika „otwórz okno czatu" (blokada scrolla + ukrycie nagłówka),
  // żeby dało się ją wywołać zarówno z przycisku (toggle), jak i z zewnętrznego
  // zdarzenia z wyszukiwarki na stronie głównej.
  const openChatbot = useCallback(() => {
    setIsOpen(true)
    const navbar = document.querySelector("header")
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    if (navbar) (navbar as HTMLElement).style.display = "none"
  }, [])

  const closeChatbot = useCallback(() => {
    setIsOpen(false)
    document.body.style.overflow = ""
    document.documentElement.style.overflow = ""
    const navbar = document.querySelector("header")
    if (navbar) (navbar as HTMLElement).style.display = ""
  }, [])

  const toggleChatbot = () => {
    if (isOpen) closeChatbot()
    else openChatbot()
  }

  // Wyszukiwarka w „Centrum mieszkańca” (strona główna) wysyła pytanie do asystenta
  // przez zdarzenie „apogeum:ask-ai”. Otwieramy tu okno czatu i przekazujemy pytanie
  // wprost do /api/chat, dzięki czemu mieszkaniec od razu dostaje odpowiedź AI.
  useEffect(() => {
    const onAskAI = (event: Event) => {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question?.trim()
      if (!question) return
      openChatbot()
      void sendMessage(question)
    }
    window.addEventListener("apogeum:ask-ai", onAskAI as EventListener)
    return () => window.removeEventListener("apogeum:ask-ai", onAskAI as EventListener)
  }, [openChatbot, sendMessage])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === "") return

    handleSubmit(e)

    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }, [input])

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    const next = input.slice(0, start) + snippet + input.slice(end)
    setInput(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + snippet.length
      el.selectionStart = pos
      el.selectionEnd = pos
    })
  }

  const chatbotVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } },
  } as const

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      onSubmit(e as any)
    }
  }

  return (
    <>
      {/* Floating toggle */}
      <div
        ref={buttonRef}
        className={`fixed z-50 chatbot-button ${isDragging ? "dragging" : ""} ${isAnimating ? "animating" : ""}`}
        style={{
          transform: isDragging ? "scale(1.1)" : "scale(1)",
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          visibility: isOpen ? "hidden" : "visible",
        }}
      >
        <div className="relative">
          <button
            type="button"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={handleClick}
            className="shadow-lg flex items-center justify-center relative overflow-hidden select-none"
            style={{
              touchAction: "none",
              width: `${buttonSize}px`,
              height: `${buttonSize}px`,
              borderRadius: "50%",
              background: "white",
              border: "1px solid var(--border)",
            }}
            aria-label="Przeciągnij aby przesunąć lub kliknij aby otworzyć czat z asystentem AI"
          >
            <Bot className="pointer-events-none h-7 w-7 text-blue-600 select-none" />
          </button>
        </div>
      </div>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            variants={chatbotVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed inset-0 bg-white z-40 flex flex-col font-sans modern-chat-window ${isMobile ? "fullscreen-chat" : ""}`}
          >
            {/* Header */}
            <div className="bg-white border-b border-gray-100 rounded-t-3xl">
              <div className="flex items-center justify-between p-3 sm:p-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="relative transition-all duration-300">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100 overflow-hidden">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex flex-col min-w-0 leading-none">
                    <span className="text-sm font-semibold text-gray-900 truncate">Asystent AI</span>
                    <span className="text-xs leading-none text-gray-400 mt-0.5">zawsze pod ręką</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={toggleChatbot}
                    className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                    aria-label="Zamknij czat"
                  >
                    <X className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Pinowany badge: asystent AI jest w fazie nauki i może się mylić. */}
              <div className="flex items-center justify-center gap-1.5 px-4 pb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] leading-none text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                  Asystent w fazie nauki — może popełniać błędy
                </span>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto relative bg-gray-50 pt-4 pb-6 chat-messages"
              style={{
                paddingBottom: isMobile && keyboardOffset > 0 ? `${keyboardOffset + 80}px` : "10px",
                scrollBehavior: "smooth",
              }}
            >
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4 px-4`}
                >
                  {message.role === "assistant" && !message.isError && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 mr-2 bg-blue-50 border border-blue-100 overflow-hidden">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] sm:max-w-sm lg:max-w-md ${
                      message.role === "user"
                        ? "px-4 py-2 rounded-2xl shadow-sm bg-blue-600"
                        : message.role === "system"
                          ? message.isError
                            ? "px-4 py-2 rounded-2xl shadow-md bg-white border border-gray-200"
                            : "px-3 py-1.5 rounded-full bg-gray-100/80 text-gray-500 text-center mx-auto flex items-center gap-1.5 text-xs"
                          : "px-4 py-2 rounded-2xl shadow-sm bg-white text-gray-800"
                    }`}
                    style={message.role === "user" ? { color: "white", backgroundColor: "#2563eb" } : {}}
                  >
                    {message.role === "system" && message.isError && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center overflow-hidden">
                          <Bot className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="text-xs font-semibold text-red-600">AI ma przerwę</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div
                        className={`leading-relaxed break-words [overflow-wrap:anywhere] ${
                          message.role === "user" ? "whitespace-pre-wrap" : ""
                        } ${
                          message.isError
                            ? "text-sm text-gray-600"
                            : message.role === "user"
                              ? "text-sm text-white"
                              : message.role === "system"
                                ? "text-xs text-gray-500"
                                : "text-sm text-gray-800"
                        }`}
                      >
                        <span className={message.role === "assistant" && message.isStreaming ? "streaming-text" : ""}>
                          {parseContactInfo(
                            (message.isStreaming && message.displayedContent !== undefined
                              ? message.displayedContent
                              : message.content) || "",
                          )}
                        </span>
                      </div>
                    </div>

                    {message.isError && (
                      <div className="mt-2.5 space-y-1.5">
                        <p className="text-xs text-gray-500">Spróbuj ponownie za chwilę lub skontaktuj się z nami.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start mb-4 px-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 mr-2 bg-blue-50 border border-blue-100 overflow-hidden">
                    <Bot className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl shadow-sm flex items-center">
                    <div className="modern-typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              className="bg-white border-t border-gray-100 p-3 sm:p-4"
              style={{
                position: isMobile && keyboardOffset > 0 ? "fixed" : "relative",
                bottom: isMobile && keyboardOffset > 0 ? `${keyboardOffset}px` : "auto",
                left: isMobile && keyboardOffset > 0 ? "0" : "auto",
                right: isMobile && keyboardOffset > 0 ? "0" : "auto",
                zIndex: isMobile && keyboardOffset > 0 ? 1000 : "auto",
              }}
            >
              <form onSubmit={onSubmit} className="relative">
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-300 px-3 py-1.5 sm:py-2">
                  <div className="flex items-center gap-1 relative">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((v) => !v)}
                      className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 p-0"
                    >
                      <Smile className="h-4 w-4" />
                      <span className="sr-only">Wstaw emotkę</span>
                    </button>
                    {emojiOpen && (
                      <div className="absolute bottom-9 left-0 w-60 p-2 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                        <div className="grid grid-cols-6 gap-1">
                          {["🙂", "😉", "👍", "❤️", "✨", "✅", "💬", "📅", "🗑️", "📍", "🌳", "💡"].map((e) => (
                            <button
                              key={e}
                              type="button"
                              className="text-xl p-1 rounded hover:bg-gray-100"
                              onClick={() => {
                                insertAtCursor(e)
                                setEmojiOpen(false)
                              }}
                              aria-label={`Wstaw ${e}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 p-0"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="sr-only">Załącz plik</span>
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Wyślij wiadomość..."
                    className="flex-1 resize-none bg-transparent text-sm placeholder-gray-500 focus:outline-none max-h-16 sm:max-h-20 leading-tight sm:leading-5"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors bg-gray-800 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {isLoading && isStreamingContent ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                    ) : (
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-10v18" />
                      </svg>
                    )}
                    <span className="sr-only">Wyślij wiadomość</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .modern-typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          background-color: #9ca3af;
          border-radius: 50%;
          animation: typing-bounce 1.2s ease-in-out infinite;
        }
        .typing-dot:nth-child(1) {
          animation-delay: 0s;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing-bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-6px);
          }
        }
        .streaming-text {
          display: inline;
        }
      `}</style>
    </>
  )
}
