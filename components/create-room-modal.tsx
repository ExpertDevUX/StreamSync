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
import { Plus, Lock } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export function CreateRoomModal() {
  const router = useRouter()
  const [roomName, setRoomName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState("")
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

    setOpen(false)
    router.push(`/room/${slug}`)
  }

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15)
  }

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new meeting</DialogTitle>
          <DialogDescription>
            Start a video call with a custom room name or generate one automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room name (optional)</Label>
            <Input
              id="room-name"
              placeholder="my-awesome-room"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="flex items-center justify-between space-x-2 py-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="private-mode" className="cursor-pointer">
                Password protect this room
              </Label>
            </div>
            <Switch id="private-mode" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {isPrivate && (
            <div className="space-y-2">
              <Label htmlFor="room-password">Password</Label>
              <Input
                id="room-password"
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required={isPrivate}
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Room</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
