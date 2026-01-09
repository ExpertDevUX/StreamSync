"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface PasswordDialogProps {
  open: boolean
  onPasswordSubmit: (password: string) => void
  onCancel: () => void
  roomId: string
}

export function PasswordDialog({ open, onPasswordSubmit, onCancel, roomId }: PasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onPasswordSubmit(password)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password Required
          </DialogTitle>
          <DialogDescription>This room is password protected. Enter the password to join.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter room password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(false)
              }}
              className="h-11"
              required
              autoFocus
            />
            {error && <p className="text-sm text-destructive">Incorrect password</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Join Room</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
