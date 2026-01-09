"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreateRoomModal } from "@/components/create-room-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Video, Keyboard, ArrowRight, Sun, Moon, Monitor } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  const router = useRouter()
  const [joinId, setJoinId] = useState("")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinId.trim()) {
      router.push(`/room/${joinId.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden touch-manipulation">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-display font-bold">StreamSync</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge
            variant="secondary"
            className="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary/10 text-primary border-primary/20 font-bold tracking-wider text-xs"
          >
            V2
          </Badge>

          {mounted && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme("system")}
                className={cn("rounded-full h-8 w-8 sm:h-9 sm:w-9", theme === "system" && "bg-primary/10 text-primary")}
                title="System Theme"
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 relative z-10 py-8 sm:py-12 lg:py-0">
        {/* Left Column: Hero Text & Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:w-1/2 max-w-2xl space-y-6 sm:space-y-8 w-full"
        >
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tight text-balance">
              Video calls for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/50">
                everyone.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Connect with your team, friends, or family in seconds. Crystal clear audio, HD video, and ultra-low
              latency.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 items-stretch w-full">
            <CreateRoomModal />

            <form onSubmit={handleJoin} className="w-full relative group">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Enter a code or link"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="pl-10 pr-12 h-12 sm:h-14 bg-secondary/50 border-transparent focus:bg-secondary focus:border-primary/30 rounded-xl transition-all text-base"
              />
              {joinId.trim().length > 0 && (
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 text-primary hover:text-primary hover:bg-primary/10 w-10 h-10 sm:w-12 sm:h-12 rounded-lg"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </form>
          </div>

          <div className="pt-6 sm:pt-8 border-t border-border/30 flex flex-col gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Trusted by developers worldwide</p>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                Privacy Protect
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                DMCA
              </a>
              <span className="flex flex-wrap gap-1">
                Copyright by{" "}
                <a
                  href="https://thongphamit.site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Hoang Thong Pham
                </a>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:w-1/2 relative hidden lg:block"
        >
          {/* Abstract Interface Representation */}
          <div className="relative aspect-square max-w-lg mx-auto">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-indigo-500/20 rounded-3xl blur-3xl" />

            {/* Fake Video Grid */}
            <div className="relative h-full grid grid-cols-2 gap-4 p-4 bg-card/50 backdrop-blur-xl rounded-3xl border border-border shadow-2xl">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-muted/40 rounded-2xl border border-border/50 overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60 opacity-60" />
                  <div className="absolute bottom-3 left-3 w-20 h-2 rounded-full bg-foreground/10" />
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <img
                    src={`/placeholder.svg?height=400&width=400&query=abstract%20digital%20communication`}
                    alt="Participant"
                    className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                </div>
              ))}

              {/* Floating Controls */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 p-2 rounded-2xl bg-background/80 backdrop-blur-xl border border-border shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-muted/60" />
                <div className="w-10 h-10 rounded-xl bg-muted/60" />
                <div className="w-10 h-10 rounded-xl bg-red-500/80" />
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
