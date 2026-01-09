import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 })
    }

    const messages = await sql`
      SELECT 
        cm.id,
        cm.user_name,
        cm.message,
        cm.created_at,
        cm.edited_at,
        uf.id as file_id,
        uf.file_name,
        uf.file_type,
        uf.file_size,
        uf.file_url,
        uf.virus_scan_status
      FROM chat_messages cm
      LEFT JOIN uploaded_files uf ON cm.file_id = uf.id
      WHERE cm.room_id = ${roomId}
      ORDER BY cm.created_at ASC
      LIMIT 100
    `

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[v0] Error fetching messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { roomId, userId, userName, message, fileId } = await request.json()

    if (!roomId || !userName || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO chat_messages (room_id, user_id, user_name, message, file_id)
      VALUES (${roomId}, ${userId}, ${userName}, ${message}, ${fileId || null})
      RETURNING id, created_at
    `

    // Update room last activity
    await sql`
      UPDATE rooms SET last_activity = NOW() WHERE id = ${roomId}
    `

    return NextResponse.json({ success: true, messageId: result[0].id, createdAt: result[0].created_at })
  } catch (error) {
    console.error("[v0] Error sending message:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to send message", details: errorMessage }, { status: 500 })
  }
}
