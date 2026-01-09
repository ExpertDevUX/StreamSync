"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Copy,
  Users,
  Monitor,
  Settings,
  MonitorOff,
  MessageSquare,
  Sun,
  Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { PasswordDialog } from "@/components/password-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { CaptionsOverlay } from "@/components/captions-overlay"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useTheme } from "next-themes"

interface VideoRoomProps {
  roomId: string
}

interface PeerConnection {
  id: string
  name: string
  connection: RTCPeerConnection
  stream: MediaStream | null
}

export function VideoRoom({ roomId }: VideoRoomProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isCheckingPassword, setIsCheckingPassword] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [captionLanguage, setCaptionLanguage] = useState("en-US")
  const [userName, setUserName] = useState("")
  const [participantCount, setParticipantCount] = useState(1)
  const [isOwner, setIsOwner] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const userIdRef = useRef<string>("")
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const peersRef = useRef<Map<string, PeerConnection>>(new Map())

  useEffect(() => {
    setMounted(true)
    userIdRef.current = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const storedName = localStorage.getItem("userName") || `User-${Math.floor(Math.random() * 1000)}`
    setUserName(storedName)
    localStorage.setItem("userName", storedName)
  }, [])

  useEffect(() => {
    const roomPasswords = JSON.parse(localStorage.getItem("roomPasswords") || "{}")
    if (roomPasswords[roomId]) {
      setShowPasswordDialog(true)
      setIsCheckingPassword(false)
    } else {
      setIsAuthenticated(true)
      setIsCheckingPassword(false)
    }
  }, [roomId])

  useEffect(() => {
    if (!isAuthenticated || !userName || !mounted) return

    let isActive = true

    const initializeRoom = async () => {
      try {
        // Create room if needed
        await fetch("/api/rooms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: roomId, name: roomId, userId: userIdRef.current }),
        })

        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // Join room
        const joinRes = await fetch("/api/signaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "join",
            roomId,
            userId: userIdRef.current,
            data: { userName },
          }),
        })

        if (!joinRes.ok) throw new Error("Failed to join room")

        const joinData = await joinRes.json()

        // Start polling for signals
        startPolling()

        // Log call history
        await fetch("/api/call-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            userId: userIdRef.current,
            userName,
            action: "join",
          }),
        })
      } catch (error) {
        console.error("Error initializing room:", error)
        toast({
          title: "Connection Error",
          description: "Failed to join the room. Please check your permissions.",
          variant: "destructive",
        })
      }
    }

    initializeRoom()

    return () => {
      isActive = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      peersRef.current.forEach((peer) => peer.connection.close())
      peersRef.current.clear()
      localStreamRef.current?.getTracks().forEach((track) => track.stop())

      // Leave room
      fetch("/api/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "leave", roomId, userId: userIdRef.current }),
      })
    }
  }, [isAuthenticated, userName, mounted, roomId, toast])

  useEffect(() => {
    const checkRoomOwnership = async () => {
      try {
        const res = await fetch(`/api/rooms?roomId=${roomId}`)
        if (res.ok) {
          const roomData = await res.json()
          const isRoomOwner = roomData.createdBy === userIdRef.current
          setIsOwner(isRoomOwner)
          console.log("[v0] User is owner:", isRoomOwner)
        }
      } catch (error) {
        console.error("[v0] Error checking room ownership:", error)
      }
    }

    if (userIdRef.current) {
      checkRoomOwnership()
    }
  }, [roomId])

  const startPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)

    const poll = async () => {
      try {
        const res = await fetch("/api/signaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "heartbeat",
            roomId,
            userId: userIdRef.current,
          }),
        })

        if (!res.ok) return

        const data = await res.json()

        if (data.kicked) {
          toast({
            title: "Meeting Ended",
            description: "The host has ended the meeting for all participants",
            variant: "destructive",
          })
          router.push("/")
          return
        }

        // Handle participants
        if (data.participants) {
          setParticipantCount(data.participants.length + 1)

          // Connect to new participants
          for (const participant of data.participants) {
            if (!peersRef.current.has(participant.userId)) {
              console.log("[v0] 🆕 New participant detected:", participant.userId, participant.userName)
              await createPeerConnection(participant.userId, participant.userName, true)
            }
          }

          // Remove disconnected participants
          const activeIds = new Set(data.participants.map((p: any) => p.userId))
          for (const [peerId, peer] of peersRef.current) {
            if (!activeIds.has(peerId)) {
              console.log("[v0] ❌ Participant disconnected:", peerId)
              peer.connection.close()
              peersRef.current.delete(peerId)
              setPeers(new Map(peersRef.current))
            }
          }
        }

        // Handle signals
        if (data.signals) {
          for (const signal of data.signals) {
            await handleSignal(signal.from, signal.signal)
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }

    poll()
    pollingIntervalRef.current = setInterval(poll, 2000)
  }

  const createPeerConnection = async (peerId: string, peerName: string, initiator: boolean) => {
    console.log("[v0] 🔧 Creating peer connection with", peerId, "initiator:", initiator)

    if (!localStreamRef.current) {
      console.error("[v0] ❌ Local stream not ready when creating peer connection")
      setTimeout(() => createPeerConnection(peerId, peerName, initiator), 500)
      return
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    })

    console.log("[v0] 📹 Adding local tracks to peer connection for", peerId)
    const localTracks = localStreamRef.current.getTracks()
    console.log("[v0] Local tracks available:", localTracks.length)

    localTracks.forEach((track) => {
      console.log("[v0] ➕ Adding track:", track.kind, "enabled:", track.enabled, "readyState:", track.readyState)
      pc.addTrack(track, localStreamRef.current!)
    })

    // Verify tracks were added
    const senders = pc.getSenders()
    console.log("[v0] ✓ Peer connection has", senders.length, "senders")

    const remoteStream = new MediaStream()

    pc.ontrack = (event) => {
      console.log("[v0] 🎥 *** RECEIVED TRACK from", peerId, "***")
      console.log("[v0] Track kind:", event.track.kind)
      console.log("[v0] Track enabled:", event.track.enabled)
      console.log("[v0] Track readyState:", event.track.readyState)
      console.log("[v0] Streams:", event.streams.length)

      remoteStream.addTrack(event.track)
      console.log("[v0] Remote stream now has", remoteStream.getTracks().length, "tracks")

      const peer = peersRef.current.get(peerId)
      if (peer) {
        peer.stream = remoteStream
        peersRef.current.set(peerId, peer)
        // Force re-render by creating new Map
        setPeers(new Map(peersRef.current))
        console.log("[v0] ✅ Updated peer", peerId, "with remote stream")
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[v0] 🧊 Sending ICE candidate to", peerId)
        sendSignal(peerId, { type: "candidate", candidate: event.candidate })
      } else {
        console.log("[v0] 🧊 ICE gathering complete for", peerId)
      }
    }

    pc.onconnectionstatechange = () => {
      console.log("[v0] 🔄 Connection state changed for", peerId, ":", pc.connectionState)
      if (pc.connectionState === "connected") {
        console.log("[v0] ✅ Peer connection established with", peerId)
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        console.log("[v0] ❌ Peer connection failed/closed for", peerId)
        peersRef.current.delete(peerId)
        setPeers(new Map(peersRef.current))
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] 🧊 ICE connection state for", peerId, ":", pc.iceConnectionState)
    }

    const peerConnection: PeerConnection = {
      id: peerId,
      name: peerName,
      connection: pc,
      stream: remoteStream,
    }

    peersRef.current.set(peerId, peerConnection)
    setPeers(new Map(peersRef.current))

    // If initiator, create and send offer
    if (initiator) {
      console.log("[v0] 📤 Creating offer for", peerId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log("[v0] 📤 Sending offer to", peerId)
      await sendSignal(peerId, { type: "offer", offer })
    }
  }

  const handleSignal = async (fromId: string, signal: any) => {
    console.log("[v0] Handling signal from", fromId, "type:", signal.type)

    let peer = peersRef.current.get(fromId)

    // Create peer if it doesn't exist (receiving offer from new peer)
    if (!peer && signal.type === "offer") {
      console.log("[v0] Creating peer in response to offer from", fromId)
      await createPeerConnection(fromId, `User-${fromId.slice(5, 8)}`, false)
      peer = peersRef.current.get(fromId)
    }

    if (!peer) {
      console.log("[v0] No peer found for", fromId)
      return
    }

    const pc = peer.connection

    try {
      if (signal.type === "offer") {
        console.log("[v0] Setting remote description (offer) from", fromId)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer))
        console.log("[v0] Creating answer for", fromId)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log("[v0] Sending answer to", fromId)
        await sendSignal(fromId, { type: "answer", answer })
      } else if (signal.type === "answer") {
        console.log("[v0] Setting remote description (answer) from", fromId)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === "candidate") {
        console.log("[v0] Adding ICE candidate from", fromId)
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    } catch (error) {
      console.error("[v0] Error handling signal from", fromId, error)
    }
  }

  const sendSignal = async (targetId: string, signal: any) => {
    try {
      await fetch("/api/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "signal",
          roomId,
          userId: userIdRef.current,
          targetId,
          data: { signal },
        }),
      })
    } catch (error) {
      console.error("Error sending signal:", error)
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    // Verify password logic
    const roomPasswords = JSON.parse(localStorage.getItem("roomPasswords") || "{}")
    if (roomPasswords[roomId] === password) {
      setIsAuthenticated(true)
      setShowPasswordDialog(false)
    } else {
      toast({
        title: "Incorrect Password",
        description: "The password you entered is incorrect.",
        variant: "destructive",
      })
    }
  }

  const handleEndCall = async () => {
    if (isOwner) {
      const endForAll = localStorage.getItem(`room_${roomId}_endForAll`) === "true"

      if (endForAll) {
        // Signal to kick all users
        await fetch("/api/signaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "kick_all",
            roomId,
            userId: userIdRef.current,
          }),
        })
      }
    }

    await fetch("/api/call-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        userId: userIdRef.current,
        userName,
        action: "leave",
      }),
    })

    router.push("/")
  }

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(link)
    toast({ title: "Link Copied", description: "Room link copied to clipboard" })
  }

  const handleCaptionsChange = (enabled: boolean, language: string) => {
    setCaptionsEnabled(enabled)
    setCaptionLanguage(language)
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        toast({
          title: videoTrack.enabled ? "Camera On" : "Camera Off",
          description: videoTrack.enabled ? "Your camera is now on." : "Your camera is now off.",
        })
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        toast({
          title: audioTrack.enabled ? "Microphone Unmuted" : "Microphone Muted",
          description: audioTrack.enabled ? "Your microphone is now unmuted." : "Your microphone is now muted.",
        })
      }
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing and restore camera
      const videoTrack = localStreamRef.current?.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = true
        setIsVideoEnabled(true)
      }
      setIsScreenSharing(false)
      toast({ title: "Screen Sharing Stopped" })
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]

        // Replace video track in all peer connections
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video")
          if (sender) {
            sender.replaceTrack(screenTrack)
          }
        })

        // Handle screen share stop
        screenTrack.onended = () => {
          const videoTrack = localStreamRef.current?.getVideoTracks()[0]
          if (videoTrack) {
            peersRef.current.forEach((peer) => {
              const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video")
              if (sender) sender.replaceTrack(videoTrack)
            })
          }
          setIsScreenSharing(false)
        }

        setIsScreenSharing(true)
        toast({ title: "Screen Sharing Started" })
      } catch (error) {
        toast({ title: "Screen Share Error", variant: "destructive" })
      }
    }
  }

  const getGridLayout = (count: number) => {
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 min-[480px]:grid-cols-2"
    if (count === 3 || count === 4) return "grid-cols-2"
    if (count <= 6) return "grid-cols-2 lg:grid-cols-3"
    if (count <= 9) return "grid-cols-2 md:grid-cols-3"
    return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
  }

  if (isCheckingPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <PasswordDialog
        open={showPasswordDialog}
        onPasswordSubmit={handlePasswordSubmit}
        onCancel={() => router.push("/")}
        roomId={roomId}
      />
    )
  }

  if (!mounted) return null

  const totalParticipants = peers.size + 1

  return (
    <div className="min-h-screen bg-background flex flex-col touch-manipulation overscroll-none">
      <header className="border-b border-border px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm md:text-lg font-semibold truncate">{roomId}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={copyRoomLink}
              className="gap-1 sm:gap-2 bg-transparent hidden md:flex h-8"
            >
              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline">Copy Link</span>
            </Button>
            <Button variant="outline" size="icon" onClick={copyRoomLink} className="md:hidden h-7 w-7 bg-transparent">
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">{participantCount}</span>
            </div>

            {mounted && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme("system")}
                  className={cn(
                    "rounded-full h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex",
                    theme === "system" && "bg-primary/10 text-primary",
                  )}
                  title="System Theme"
                >
                  <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-full h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex"
                >
                  {theme === "dark" ? (
                    <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex relative overflow-hidden min-h-0">
        {/* Video grid container */}
        <div className="flex-1 p-1 sm:p-2 md:p-4 lg:p-6 overflow-y-auto overscroll-contain">
          <div
            className={cn(
              "h-full grid gap-1 sm:gap-2 md:gap-4 auto-rows-fr content-start",
              getGridLayout(totalParticipants),
            )}
          >
            {/* Local video */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-lg min-h-[180px] sm:min-h-[240px] md:min-h-0">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  !isVideoEnabled && "opacity-0",
                )}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-primary">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium">
                You {isScreenSharing && "(Sharing)"}
              </div>
            </Card>

            {/* Remote videos */}
            {Array.from(peers.values()).map((peer) => (
              <Card
                key={peer.id}
                className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-lg min-h-[180px] sm:min-h-[240px] md:min-h-0"
              >
                {peer.stream && peer.stream.getTracks().length > 0 ? (
                  <video
                    autoPlay
                    playsInline
                    ref={(video) => {
                      if (video && peer.stream) {
                        if (video.srcObject !== peer.stream) {
                          console.log(
                            "[v0] Setting srcObject for peer",
                            peer.id,
                            "tracks:",
                            peer.stream.getTracks().length,
                          )
                          video.srcObject = peer.stream
                        }
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-primary">
                      {peer.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium">
                  {peer.name}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {showChat && (
          <div className="hidden md:block w-[350px] lg:w-[400px] flex-shrink-0 border-l border-border">
            <ChatPanel roomId={roomId} userId={userIdRef.current} userName={userName} />
          </div>
        )}

        {/* Mobile Chat Sheet */}
        <Sheet open={showChat && typeof window !== "undefined" && window.innerWidth < 768} onOpenChange={setShowChat}>
          <SheetContent side="bottom" className="h-[80vh] max-h-[600px] p-0 rounded-t-2xl">
            <ChatPanel roomId={roomId} userId={userIdRef.current} userName={userName} />
          </SheetContent>
        </Sheet>

        {/* Settings Sheet */}
        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent
            side="bottom"
            className="h-[80vh] max-h-[600px] md:h-auto md:max-h-none md:side-right p-0 rounded-t-2xl md:rounded-none"
          >
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              onCaptionsChange={handleCaptionsChange}
              captionsEnabled={captionsEnabled}
              captionLanguage={captionLanguage}
              isOwner={isOwner}
              roomId={roomId}
            />
          </SheetContent>
        </Sheet>

        {/* Captions Overlay */}
        {captionsEnabled && (
          <CaptionsOverlay isActive={captionsEnabled} language={captionLanguage} localStream={localStreamRef.current} />
        )}
      </main>

      {/* Controls Footer */}
      <footer className="border-t border-border px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex-shrink-0 safe-area-bottom">
        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="icon"
            onClick={toggleAudio}
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
          </Button>
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="icon"
            onClick={toggleVideo}
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </Button>
          <Button
            variant={isScreenSharing ? "secondary" : "outline"}
            size="icon"
            onClick={toggleScreenShare}
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full hidden sm:flex active:scale-95 transition-transform"
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full active:scale-95 transition-transform"
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full active:scale-95 transition-transform"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleEndCall}
            className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
