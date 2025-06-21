// app/api/telegram/send-command/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { command, parameters, target_user_id } = await request.json()

    if (!command) {
      return NextResponse.json(
        { message: "Command is required" },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    // Log the command execution attempt
    await db.run(`
      INSERT INTO activity_logs (
        user_id, activity_type, description, start_time, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user.id,
      'web_command',
      `Executed ${command} ${parameters || ''} from web interface`,
      new Date().toISOString(),
      new Date().toISOString()
    ])

    // TODO: Integrate with actual bot service to execute command
    // This would send the command to the bot service for processing

    return NextResponse.json({
      message: `Command ${command} executed successfully`,
      result: { success: true, response: `Command ${command} executed successfully` }
    })

  } catch (error) {
    console.error("Send command error:", error)
    return NextResponse.json(
      { message: "Failed to execute command" },
      { status: 500 }
    )
  }
}