import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { id, name, password, userId } = await request.json()

    let passwordHash = null
    if (password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    await sql`
      INSERT INTO rooms (id, name, password_hash, created_by)
      VALUES (${id}, ${name}, ${passwordHash}, ${userId})
    `

    return NextResponse.json({ success: true, roomId: id })
  } catch (error) {
    console.error("[v0] Error creating room:", error)
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 })
    }

    const result = await sql`
      SELECT id, name, password_hash, created_at, is_active, expires_at, created_by
      FROM rooms
      WHERE id = ${roomId} AND is_active = true
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Room not found or expired" }, { status: 404 })
    }

    const room = result[0]
    return NextResponse.json({
      id: room.id,
      name: room.name,
      hasPassword: !!room.password_hash,
      createdAt: room.created_at,
      expiresAt: room.expires_at,
      createdBy: room.created_by,
    })
  } catch (error) {
    console.error("[v0] Error fetching room:", error)
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, userId } = await request.json()

    // Check if room exists
    const existing = await sql`
      SELECT id FROM rooms WHERE id = ${id}
    `

    if (existing.length === 0) {
      // Create room automatically
      await sql`
        INSERT INTO rooms (id, name, password_hash, created_by)
        VALUES (${id}, ${name || id}, NULL, ${userId})
        ON CONFLICT (id) DO NOTHING
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error ensuring room exists:", error)
    return NextResponse.json({ error: "Failed to ensure room exists" }, { status: 500 })
  }
}
