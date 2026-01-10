"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NicknameModalProps {
  open: boolean
  onNicknameSet: (nickname: string) => void
}

export function NicknameModal({ open, onNicknameSet }: NicknameModalProps) {
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nickname.trim()

    if (!trimmed) {
      setError("Please enter a nickname")
      return
    }

    if (trimmed.length > 20) {
      setError("Nickname must be 20 characters or less")
      return
    }

    localStorage.setItem("userNickname", trimmed)
    onNicknameSet(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-[90vw] sm:w-full max-w-md mx-auto px-4 sm:px-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl sm:text-2xl">Welcome to ConnectNow</DialogTitle>
          <DialogDescription className="text-sm sm:text-base mt-2">
            Choose a nickname to display in the meeting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-sm sm:text-base">
              Your Nickname
            </Label>
            <Input
              id="nickname"
              placeholder="Enter your name"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setError("")
              }}
              maxLength={20}
              className="text-sm sm:text-base h-10 sm:h-12"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSubmit(e as any)
                }
              }}
            />
            <p className="text-xs sm:text-sm text-muted-foreground">{nickname.length}/20 characters</p>
            {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold"
            disabled={!nickname.trim()}
          >
            Join Meeting
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
