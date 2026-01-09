import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { roomId, password } = await request.json()

    const result = await sql`
      SELECT password_hash FROM rooms WHERE id = ${roomId} AND is_active = true
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const room = result[0]

    if (!room.password_hash) {
      return NextResponse.json({ verified: true })
    }

    const isValid = await bcrypt.compare(password, room.password_hash)

    return NextResponse.json({ verified: isValid })
  } catch (error) {
    console.error("[v0] Error verifying password:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
