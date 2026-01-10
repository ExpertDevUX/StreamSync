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
  Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { PasswordDialog } from "@/components/password-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { CaptionsOverlay } from "@/components/captions-overlay"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { NicknameModal } from "@/components/nickname-modal"
import { ParticipantInfoModal } from "@/components/participant-info-modal"

interface VideoRoomProps {
  roomId: string
}

interface PeerConnection {
  id: string
  name: string
  connection: RTCPeerConnection
  stream: MediaStream | null
  location?: string
  locationFlag?: string
}

export function VideoRoom({ roomId }: VideoRoomProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [callType, setCallType] = useState<"voice" | "video" | "team" | "group">("video")
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
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<{
    name: string
    location: string
    flag: string
    id: string
  } | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const userIdRef = useRef<string>("")
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const peersRef = useRef<Map<string, PeerConnection>>(new Map())

  useEffect(() => {
    setMounted(true)
    userIdRef.current = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const storedNickname = localStorage.getItem("userNickname")
    if (storedNickname) {
      setUserName(storedNickname)
      setShowNicknameModal(false)
    } else {
      setShowNicknameModal(true)
    }

    const storedCallType = localStorage.getItem(`room_${roomId}_callType`) as
      | "voice"
      | "video"
      | "team"
      | "group"
      | null
    if (storedCallType) {
      setCallType(storedCallType)
      if (storedCallType === "voice") {
        setIsVideoEnabled(false)
      }
    }
  }, [roomId])

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
        await fetch("/api/rooms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: roomId, name: roomId, userId: userIdRef.current, callType }),
        })

        const constraints: MediaStreamConstraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        }

        if (callType !== "voice") {
          constraints.video = { width: 1280, height: 720 }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localStreamRef.current = stream
        if (localVideoRef.current && callType !== "voice") {
          localVideoRef.current.srcObject = stream
        }

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

        startPolling()

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
          description:
            callType === "voice"
              ? "Could not access your microphone. Please check permissions."
              : "Could not access your camera/microphone. Please check permissions.",
          variant: "destructive",
        })
      }
    }

    initializeRoom()

    return () => {
      isActive = false
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      peersRef.current.forEach((peer) => peer.connection.close())
      peersRef.current.clear()
    }
  }, [isAuthenticated, userName, mounted, roomId, toast, callType])

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

  useEffect(() => {
    if (!mounted || !userIdRef.current) return

    // Get user's location using IP geolocation API
    const getLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/")
        const data = await response.json()

        const locationFlag = data.country_code
          ? String.fromCodePoint(...[...data.country_code].map((x) => 0x1f1a5 + x.charCodeAt(0)))
          : "🌍"

        // Store location in localStorage for quick access
        localStorage.setItem(
          `userLocation_${userIdRef.current}`,
          JSON.stringify({
            country: data.country_name || "Unknown",
            flag: locationFlag,
            code: data.country_code || "XX",
          }),
        )

        // Save to database
        await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            userId: userIdRef.current,
            userName,
            locationCountry: data.country_name || "Unknown",
            locationFlag,
            locationCode: data.country_code || "XX",
          }),
        })
      } catch (error) {
        console.log("[v0] Location fetch failed (non-critical):", error)
      }
    }

    getLocation()
  }, [mounted, userName, roomId])

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

        if (data.participants) {
          setParticipantCount(data.participants.length + 1)

          for (const participant of data.participants) {
            if (!peersRef.current.has(participant.userId)) {
              console.log("[v0] 🆕 New participant detected:", participant.userId, participant.userName)
              await createPeerConnection(participant.userId, participant.userName, true)
            }
          }

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
        setPeers(new Map(peersRef.current))
        console.log("[v0] ✅ Updated peer", peerId, "with remote stream")
      }
    }

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

    if (initiator) {
      console.log("[v0] 📤 Creating offer for", peerId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log("[v0] 📤 Sending offer to", peerId)
      await sendSignal(peerId, { type: "offer", offer })
    }
  }

  const handleSignal = async (fromId: string, signal: any) => {
    console.log("[v0] 📨 Handling signal from", fromId, "type:", signal.type)

    let peer = peersRef.current.get(fromId)

    if (!peer && signal.type === "offer") {
      console.log("[v0] 🆕 Creating peer in response to offer from", fromId)
      await createPeerConnection(fromId, `User-${fromId.slice(5, 8)}`, false)
      peer = peersRef.current.get(fromId)
    }

    if (!peer) {
      console.log("[v0] ⚠️ No peer found for", fromId, "- will retry on next signal")
      return
    }

    const pc = peer.connection

    try {
      if (signal.type === "offer") {
        console.log("[v0] 📥 Setting remote description (offer) from", fromId)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer))
        console.log("[v0] 📝 Creating answer for", fromId)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log("[v0] 📤 Sending answer back to", fromId)
        await sendSignal(fromId, { type: "answer", answer })
      } else if (signal.type === "answer") {
        console.log("[v0] 📥 Setting remote description (answer) from", fromId)
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer))
      } else if (signal.type === "candidate") {
        console.log("[v0] 🧊 Adding ICE candidate from", fromId)
        if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
        }
      }
    } catch (error) {
      console.error("[v0] ❌ Error handling signal from", fromId, error)
    }
  }

  const sendSignal = async (targetId: string, signal: any, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`[v0] 📤 Sending ${signal.type} to ${targetId} (attempt ${attempt + 1}/${retries})`)
        const res = await fetch("/api/signaling", {
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

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const responseData = await res.json()
        console.log(`[v0] ✅ Signal ${signal.type} successfully sent to ${targetId}`)
        return responseData
      } catch (error) {
        console.error(`[v0] ❌ Signal send attempt ${attempt + 1} failed:`, error)
        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 500
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
  }

  const handlePasswordSubmit = async (password: string) => {
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
    if (callType === "voice") {
      toast({
        title: "Voice Call",
        description: "Video is not available in voice-only calls",
      })
      return
    }

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        toast({
          title: videoTrack.enabled ? "Camera On" : "Camera Off",
          description: videoTrack.enabled ? "Your camera is now visible" : "Your camera is now hidden",
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

        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video")
          if (sender) {
            sender.replaceTrack(screenTrack)
          }
        })

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

  const handleNicknameSet = (nickname: string) => {
    setUserName(nickname)
    setShowNicknameModal(false)
    localStorage.setItem("userNickname", nickname)
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
    <>
      <NicknameModal open={showNicknameModal} onNicknameSet={handleNicknameSet} />

      <div className="relative h-screen w-screen bg-gradient-to-br from-background via-background to-accent/10 overflow-hidden">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 shadow-lg">
          <div className="flex items-center justify-between p-3 md:p-4 max-w-[2000px] mx-auto">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">{roomId}</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomLink}
                className="hidden sm:flex gap-2 shrink-0 h-9 hover:bg-accent/80 transition-colors bg-transparent"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden md:inline">Copy Link</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {callType === "voice" && <Phone className="w-4 h-4" />}
                {callType === "video" && <Video className="w-4 h-4" />}
                {(callType === "team" || callType === "group") && <Users className="w-4 h-4" />}
                <span className="capitalize">{callType}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/80 text-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{participantCount}</span>
              </div>

              {mounted && (
                <div className="hidden md:flex gap-1 p-1 rounded-lg bg-accent/50">
                  <Button
                    variant={theme === "light" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="h-8 w-8 p-0"
                  >
                    <Sun className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="h-8 w-8 p-0"
                  >
                    <Moon className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex relative overflow-hidden min-h-0">
          <div className="flex-1 p-1 sm:p-2 md:p-4 lg:p-6 overflow-y-auto overscroll-contain">
            <div
              className={cn(
                "h-full grid gap-2 sm:gap-3 md:gap-4 auto-rows-fr content-start",
                getGridLayout(totalParticipants),
              )}
            >
              <Card className="group relative overflow-hidden bg-gradient-to-br from-primary/5 via-muted/50 to-primary/10 border-2 border-primary/20 shadow-xl hover:shadow-2xl transition-all duration-300 min-h-[180px] sm:min-h-[240px] md:min-h-0 rounded-2xl hover:scale-[1.02] animate-in fade-in-50">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "relative w-full h-full object-cover transition-all duration-500 rounded-2xl",
                    !isVideoEnabled && "opacity-0 scale-95",
                  )}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm">
                    <div className="relative">
                      <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-primary/20 animate-ping" />
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 shadow-2xl flex items-center justify-center text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white animate-in zoom-in-50">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                    <span>You</span>
                    {isScreenSharing && (
                      <span className="text-[10px] sm:text-xs bg-primary/80 px-2 py-0.5 rounded-full">Sharing</span>
                    )}
                  </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex gap-1 bg-black/40 backdrop-blur-md rounded-full p-1.5 border border-white/10">
                    {isVideoEnabled && (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Video className="w-3 h-3 text-green-400" />
                      </div>
                    )}
                    {isAudioEnabled && (
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Mic className="w-3 h-3 text-blue-400" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {Array.from(peers.values()).map((peer) => (
                <Card
                  key={peer.id}
                  className="group relative overflow-hidden bg-gradient-to-br from-secondary/50 via-muted/50 to-secondary/30 border-2 border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 min-h-[180px] sm:min-h-[240px] md:min-h-0 rounded-2xl hover:scale-[1.02] animate-in fade-in-50 slide-in-from-bottom-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

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
                      className="relative w-full h-full object-cover rounded-2xl transition-all duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 backdrop-blur-sm">
                      <div className="relative">
                        <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-blue-500/20 animate-ping" />
                        <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-2xl flex items-center justify-center text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white animate-in zoom-in-50">
                          {peer.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-lg shadow-blue-400/50" />
                      <span>{peer.name}</span>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-2 bg-green-400 rounded-full animate-pulse" />
                        <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse delay-75" />
                        <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse delay-150" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedParticipant({
                        name: peer.name,
                        location: peer.location || "Unknown",
                        flag: peer.locationFlag || "🌍",
                        id: peer.id,
                      })
                    }
                    className="absolute top-3 right-3 z-10 text-2xl bg-black/40 backdrop-blur-md rounded-full p-2 hover:bg-black/60 transition-all border border-white/10 cursor-pointer hover:scale-110"
                    title="View participant info"
                  >
                    {peer.locationFlag || "🌍"}
                  </button>
                </Card>
              ))}
            </div>
          </div>

          {showChat && (
            <div className="hidden md:block w-[350px] lg:w-[400px] flex-shrink-0 border-l border-border">
              <ChatPanel roomId={roomId} userId={userIdRef.current} userName={userName} />
            </div>
          )}

          <Sheet open={showChat && typeof window !== "undefined" && window.innerWidth < 768} onOpenChange={setShowChat}>
            <SheetContent side="bottom" className="h-[80vh] max-h-[600px] p-0 rounded-t-2xl">
              <ChatPanel roomId={roomId} userId={userIdRef.current} userName={userName} />
            </SheetContent>
          </Sheet>

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

          {captionsEnabled && (
            <CaptionsOverlay
              isActive={captionsEnabled}
              language={captionLanguage}
              localStream={localStreamRef.current}
            />
          )}
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border/50 shadow-lg">
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="icon"
              onClick={toggleAudio}
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-2xl hover:shadow-primary/50 active:scale-90 transition-all duration-200 hover:scale-110"
            >
              {isAudioEnabled ? (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </Button>
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="icon"
              onClick={toggleVideo}
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-2xl hover:shadow-primary/50 active:scale-90 transition-all duration-200 hover:scale-110"
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
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-lg hover:shadow-xl active:scale-90 transition-all duration-200 hover:scale-110 hidden sm:flex"
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
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-lg hover:shadow-xl active:scale-90 transition-all duration-200 hover:scale-110"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-lg hover:shadow-xl active:scale-90 transition-all duration-200 hover:scale-110"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleEndCall}
              className="h-12 w-12 sm:h-14 sm:w-14 md:h-12 md:w-12 rounded-full shadow-2xl shadow-destructive/50 hover:shadow-destructive/70 active:scale-90 transition-all duration-200 hover:scale-110 hover:rotate-12"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          </div>
        </footer>
      </div>

      <ParticipantInfoModal
        open={!!selectedParticipant}
        onOpenChange={() => setSelectedParticipant(null)}
        participantName={selectedParticipant?.name || ""}
        participantLocation={selectedParticipant?.location || ""}
        participantLocationFlag={selectedParticipant?.flag || "🌍"}
        participantId={selectedParticipant?.id || ""}
      />
    </>
  )
}
