import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { roomId, userId, userName, locationCountry, locationFlag, locationCode } = await request.json()

    if (!roomId || !userId) {
      return Response.json({ error: "Missing roomId or userId" }, { status: 400 })
    }

    // Store location in call history
    const result = await sql(
      `
      UPDATE call_history 
      SET location_country = $1, 
          location_flag = $2,
          location_code = $3
      WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
      `,
      [roomId, userId, locationCountry, locationFlag, locationCode],
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error("[v0] Location API error:", error)
    return Response.json({ error: "Failed to save location" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return Response.json({ error: "Missing roomId" }, { status: 400 })
    }

    // Get participants in room with their locations
    const participants = await sql(
      `
      SELECT DISTINCT
        user_id,
        user_name,
        location_country,
        location_flag
      FROM call_history
      WHERE room_id = $1 AND left_at IS NULL
      `,
      [roomId],
    )

    return Response.json(participants)
  } catch (error) {
    console.error("[v0] Get location error:", error)
    return Response.json({ error: "Failed to fetch participants" }, { status: 500 })
  }
}
