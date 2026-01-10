"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Lock, Phone, Video, Users, UsersRound } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export function CreateRoomModal() {
  const router = useRouter()
  const [roomName, setRoomName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState("")
  const [callType, setCallType] = useState<"voice" | "video" | "team" | "group">("video")
  const [open, setOpen] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const slug = roomName.trim()
      ? roomName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : generateRoomId()

    if (isPrivate && password) {
      const roomPasswords = JSON.parse(localStorage.getItem("roomPasswords") || "{}")
      roomPasswords[slug] = password
      localStorage.setItem("roomPasswords", JSON.stringify(roomPasswords))
    }

    localStorage.setItem(`room_${slug}_callType`, callType)

    setOpen(false)
    router.push(`/room/${slug}`)
  }

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15)
  }

  const callTypeOptions = [
    {
      value: "voice",
      label: "Voice",
      icon: Phone,
      color: "from-blue-400 to-cyan-500",
    },
    {
      value: "video",
      label: "Video",
      icon: Video,
      color: "from-purple-400 to-pink-500",
    },
    {
      value: "team",
      label: "Team",
      icon: Users,
      color: "from-orange-400 to-red-500",
    },
    {
      value: "group",
      label: "Group",
      icon: UsersRound,
      color: "from-green-400 to-emerald-500",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="rounded-xl h-12 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-custom">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start a New Meeting</DialogTitle>
          <DialogDescription>Choose your meeting type and get started instantly</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Meeting Type</Label>
            <div className="flex gap-3 flex-wrap">
              {callTypeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCallType(option.value as any)}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                      callType === option.value
                        ? `bg-gradient-to-r ${option.color} text-white shadow-lg scale-105`
                        : "bg-secondary/80 text-foreground hover:bg-secondary border border-border/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{option.label}</span>
                    {callType === option.value && (
                      <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-name" className="text-sm font-medium">
              Room Name (optional)
            </Label>
            <Input
              id="room-name"
              placeholder="e.g., My Awesome Meeting"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="h-11 rounded-lg"
            />
            <p className="text-xs text-muted-foreground">Leave empty for auto-generated name</p>
          </div>

          <div className="space-y-3 rounded-lg bg-secondary/30 p-4 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <Label htmlFor="private-mode" className="cursor-pointer font-medium">
                  Password protect room
                </Label>
              </div>
              <Switch id="private-mode" checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            {isPrivate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Input
                  type="password"
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-lg"
                  required={isPrivate}
                />
                <p className="text-xs text-muted-foreground">Share this password with guests to grant access</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              Create Meeting
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
