"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ParticipantInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participantName: string
  participantLocation: string
  participantLocationFlag: string
  participantId: string
}

export function ParticipantInfoModal({
  open,
  onOpenChange,
  participantName,
  participantLocation,
  participantLocationFlag,
  participantId,
}: ParticipantInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[300px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{participantLocationFlag}</span>
            Participant Info
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Name</p>
            <p className="text-lg font-semibold">{participantName}</p>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Location</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{participantLocationFlag}</span>
              <p className="text-lg font-semibold">{participantLocation}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Connection Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm font-medium">Connected</p>
            </div>
          </div>

          <Button variant="outline" className="w-full bg-transparent" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
