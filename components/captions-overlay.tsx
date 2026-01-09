"use client"

import { useEffect, useState, useRef } from "react"

interface CaptionsOverlayProps {
  enabled: boolean
  language: string
  stream?: MediaStream
}

export function CaptionsOverlay({ enabled, language, stream }: CaptionsOverlayProps) {
  const [caption, setCaption] = useState("")
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (!enabled || !stream) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setCaption("")
      return
    }

    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setCaption("Speech recognition not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        } else {
          interimTranscript += transcript
        }
      }

      setCaption(finalTranscript || interimTranscript)

      // Clear caption after 3 seconds of final result
      if (finalTranscript) {
        setTimeout(() => setCaption(""), 3000)
      }
    }

    recognition.onerror = (event: any) => {
      console.error("[v0] Speech recognition error:", event.error)
    }

    recognition.onend = () => {
      if (enabled) {
        recognition.start() // Restart if still enabled
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch (error) {
      console.error("[v0] Failed to start speech recognition:", error)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [enabled, language, stream])

  if (!enabled || !caption) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-center backdrop-blur-sm">
        <p className="text-lg">{caption}</p>
      </div>
    </div>
  )
}
