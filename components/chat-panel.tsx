"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Paperclip, Send, Smile, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Message {
  id: number
  user_name: string
  message: string
  created_at: string
  file_id?: number
  file_name?: string
  file_type?: string
  file_size?: number
  file_url?: string
  virus_scan_status?: string
  translated_text?: string
  translation_language?: string
}

interface ChatPanelProps {
  roomId: string
  userName: string
  userId?: string
}

const EMOJI_LIST = ["😀", "😂", "😍", "🎉", "👍", "👏", "🔥", "💯", "❤️", "✨", "🚀", "💪", "👋", "🙏", "🤔", "😎"]

const translateText = async (text: string, targetLang: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
    )
    const data = await response.json()
    return data[0][0][0] || text
  } catch (error) {
    console.error("Translation error:", error)
    return text
  }
}

export function ChatPanel({ roomId, userName, userId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null)
  const [translationEnabled, setTranslationEnabled] = useState(false)
  const [translationLanguage, setTranslationLanguage] = useState("en")
  const [translatingMessages, setTranslatingMessages] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (translationEnabled && messages.length > 0) {
      messages.forEach(async (msg) => {
        if (!msg.translated_text && !translatingMessages.has(msg.id)) {
          setTranslatingMessages((prev) => new Set(prev).add(msg.id))
          const translated = await translateText(msg.message, translationLanguage)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, translated_text: translated, translation_language: translationLanguage } : m,
            ),
          )
          setTranslatingMessages((prev) => {
            const next = new Set(prev)
            next.delete(msg.id)
            return next
          })
        }
      })
    }
  }, [translationEnabled, translationLanguage, messages])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat?roomId=${roomId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error("[v0] Failed to load messages:", error)
    }
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return

    let fileId = null

    if (selectedFile) {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("roomId", roomId)
      formData.append("userId", userId || "anonymous")
      formData.append("userName", userName)

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          toast({
            title: "Upload Failed",
            description: error.details || error.error,
            variant: "destructive",
          })
          setIsUploading(false)
          return
        }

        const data = await response.json()
        fileId = data.fileId
        toast({
          title: "File Uploaded",
          description: `${selectedFile.name} has been uploaded successfully`,
        })
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Failed to upload file",
          variant: "destructive",
        })
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId: userId || "anonymous",
          userName,
          message: newMessage || `Shared ${selectedFile?.name}`,
          fileId,
        }),
      })

      if (response.ok) {
        setNewMessage("")
        setSelectedFile(null)
        await loadMessages()
      } else {
        const error = await response.json()
        toast({
          title: "Send Failed",
          description: error.error || "Failed to send message",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      toast({
        title: "Send Failed",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      })
      return
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only images, PDFs, Word, and Excel files are allowed",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const getFileIcon = (fileType?: string) => {
    if (fileType?.startsWith("image/")) return "🖼️"
    if (fileType?.includes("pdf")) return "📄"
    if (fileType?.includes("word") || fileType?.includes("document")) return "📝"
    if (fileType?.includes("sheet") || fileType?.includes("excel")) return "📊"
    return "📎"
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold">Chat</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={translationEnabled}
              onChange={(e) => setTranslationEnabled(e.target.checked)}
              className="rounded"
            />
            <span>Auto-translate</span>
          </label>
          {translationEnabled && (
            <select
              value={translationLanguage}
              onChange={(e) => {
                setTranslationLanguage(e.target.value)
                setMessages((prev) => prev.map((m) => ({ ...m, translated_text: undefined })))
              }}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="vi">Vietnamese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh-CN">Chinese</option>
            </select>
          )}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm">{msg.user_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm">{translationEnabled && msg.translated_text ? msg.translated_text : msg.message}</p>
              {translationEnabled && msg.translated_text && (
                <p className="text-xs text-muted-foreground italic">{msg.message}</p>
              )}
              {msg.file_id && (
                <a
                  href={msg.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors w-fit"
                >
                  <span className="text-2xl">{getFileIcon(msg.file_type)}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{msg.file_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(msg.file_size || 0)}
                      {msg.virus_scan_status === "clean" && " • ✓ Scanned"}
                    </span>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-xl">{getFileIcon(selectedFile.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setSelectedFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />

          <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Paperclip className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewMessage(newMessage + emoji)}
                    className="text-2xl hover:bg-muted rounded p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            disabled={isUploading}
            className="flex-1"
          />

          <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !selectedFile) || isUploading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
