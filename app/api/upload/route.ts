import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

// VirusTotal API integration
async function scanFileWithVirusTotal(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ status: string; result: string }> {
  // This is a placeholder - you'll need a VirusTotal API key
  // For now, we'll simulate the scan
  const fileSizeMB = fileBuffer.length / (1024 * 1024)

  if (fileSizeMB > 5) {
    return { status: "rejected", result: "File exceeds 5MB limit" }
  }

  // In production, integrate with VirusTotal API
  // const apiKey = process.env.VIRUSTOTAL_API_KEY;
  // Perform actual virus scan here

  // For now, assume files are clean
  return { status: "clean", result: "No threats detected" }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const roomId = formData.get("roomId") as string
    const userId = formData.get("userId") as string
    const userName = formData.get("userName") as string

    if (!file || !roomId || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }

    // Get file buffer for scanning
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Scan file with VirusTotal
    const scanResult = await scanFileWithVirusTotal(fileBuffer, file.name)

    if (scanResult.status === "rejected" || scanResult.status === "infected") {
      return NextResponse.json(
        {
          error: "File failed security scan",
          details: scanResult.result,
        },
        { status: 400 },
      )
    }

    // Upload to Vercel Blob
    const blob = await put(`${roomId}/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    // Save to database
    const result = await sql`
      INSERT INTO uploaded_files (
        room_id, user_id, user_name, file_name, file_size, file_type, file_url, virus_scan_status, virus_scan_result
      )
      VALUES (
        ${roomId}, ${userId}, ${userName}, ${file.name}, ${file.size}, ${file.type}, ${blob.url}, ${scanResult.status}, ${scanResult.result}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      fileId: result[0].id,
      fileUrl: blob.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
  } catch (error) {
    console.error("[v0] Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
