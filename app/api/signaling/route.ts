import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, roomId, userId, targetId, data } = body

    console.log("[v0] Signaling POST:", { type, roomId, userId, targetId })

    if (!roomId || !userId) {
      return NextResponse.json({ error: "Missing roomId or userId" }, { status: 400 })
    }

    switch (type) {
      case "join": {
        await sql`
          INSERT INTO room_participants (room_id, user_id, user_name, last_seen)
          VALUES (${roomId}, ${userId}, ${data.userName}, NOW())
          ON CONFLICT (room_id, user_id) 
          DO UPDATE SET last_seen = NOW(), user_name = ${data.userName}
        `

        const participants = await sql`
          SELECT user_id, user_name 
          FROM room_participants 
          WHERE room_id = ${roomId} 
            AND user_id != ${userId}
            AND last_seen > NOW() - INTERVAL '20 seconds'
          ORDER BY user_id
        `

        console.log("[v0] Join response - Found participants:", participants.length)

        return NextResponse.json({
          participants: participants.map((p: any) => ({
            userId: p.user_id,
            userName: p.user_name,
          })),
        })
      }

      case "signal": {
        if (!targetId) {
          return NextResponse.json({ error: "Missing targetId for signal" }, { status: 400 })
        }

        const signalData = {
          type: data.signal.type,
          offer: data.signal.offer || null,
          answer: data.signal.answer || null,
          candidate: data.signal.candidate || null,
        }

        await sql`
          INSERT INTO signaling_messages (
            room_id, from_user_id, to_user_id, message_type, message_data, created_at
          )
          VALUES (
            ${roomId}, ${userId}, ${targetId}, 'signal', ${JSON.stringify(signalData)}, NOW()
          )
        `

        console.log("[v0] ✅ Signal STORED from", userId, "TO", targetId, "type:", data.signal.type)

        return NextResponse.json({ success: true })
      }

      case "heartbeat": {
        await sql`
          UPDATE room_participants 
          SET last_seen = NOW() 
          WHERE room_id = ${roomId} AND user_id = ${userId}
        `

        // Check for kick signal
        const kickSignal = await sql`
          SELECT id FROM signaling_messages
          WHERE room_id = ${roomId}
            AND message_type = 'kick_all'
            AND consumed = false
            AND created_at > NOW() - INTERVAL '10 seconds'
          LIMIT 1
        `

        if (kickSignal.length > 0) {
          await sql`UPDATE signaling_messages SET consumed = true WHERE id = ${kickSignal[0].id}`
          return NextResponse.json({ kicked: true })
        }

        const signals = await sql`
          SELECT id, from_user_id, message_data, created_at
          FROM signaling_messages
          WHERE room_id = ${roomId} 
            AND to_user_id = ${userId}
            AND consumed = false
            AND message_type = 'signal'
            AND created_at > NOW() - INTERVAL '30 seconds'
          ORDER BY created_at ASC
        `

        // Mark signals as consumed only after retrieving them
        if (signals.length > 0) {
          const ids = signals.map((s: any) => s.id)
          await sql`UPDATE signaling_messages SET consumed = true WHERE id = ANY(${ids})`
          console.log("[v0] ✅ Delivered", signals.length, "signals to", userId)
        }

        // Get active participants
        const participants = await sql`
          SELECT user_id, user_name 
          FROM room_participants 
          WHERE room_id = ${roomId} 
            AND user_id != ${userId}
            AND last_seen > NOW() - INTERVAL '20 seconds'
          ORDER BY user_id
        `

        console.log(
          "[v0] Heartbeat - Signals for",
          userId,
          ":",
          signals.length,
          "Active participants:",
          participants.length,
        )

        return NextResponse.json({
          signals: signals.map((s: any) => ({
            from: s.from_user_id,
            signal: JSON.parse(s.message_data),
          })),
          participants: participants.map((p: any) => ({
            userId: p.user_id,
            userName: p.user_name,
          })),
        })
      }

      case "kick_all": {
        await sql`
          INSERT INTO signaling_messages (
            room_id, from_user_id, to_user_id, message_type, message_data, created_at
          )
          VALUES (
            ${roomId}, ${userId}, 'all', 'kick_all', '{}', NOW()
          )
        `

        console.log("[v0] Kick all users signal sent by", userId)
        return NextResponse.json({ success: true })
      }

      case "leave": {
        await sql`DELETE FROM room_participants WHERE room_id = ${roomId} AND user_id = ${userId}`
        console.log("[v0] User left:", userId)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Signaling error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
    }

    const participants = await sql`
      SELECT user_id, user_name, last_seen
      FROM room_participants 
      WHERE room_id = ${roomId}
        AND last_seen > NOW() - INTERVAL '20 seconds'
      ORDER BY last_seen DESC
    `

    return NextResponse.json({
      participants: participants.map((p: any) => ({
        userId: p.user_id,
        userName: p.user_name,
      })),
    })
  } catch (error) {
    console.error("Error fetching participants:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
