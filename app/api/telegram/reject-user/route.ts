// app/api/telegram/reject-user/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { userId, reason = '' } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    // Get user details before rejection
    const userToReject = await db.get(
      'SELECT username, full_name, telegram_id FROM users WHERE id = ? AND status = ?',
      [userId, 'pending']
    )

    if (!userToReject) {
      return NextResponse.json(
        { message: "User not found or already processed" },
        { status: 404 }
      )
    }

    // Update user status to rejected
    const result = await db.run(
      'UPDATE users SET status = ? WHERE id = ? AND status = ?',
      ['rejected', userId, 'pending']
    )

    // Log the rejection action
    await db.run(`
      INSERT INTO activity_logs (
        user_id, activity_type, description, start_time, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user.id,
      'user_management',
      `Rejected user ${userToReject.full_name}. Reason: ${reason}`,
      new Date().toISOString(),
      new Date().toISOString()
    ])

    // TODO: Send rejection notification to user via Telegram bot

    return NextResponse.json({
      message: `User ${userToReject.full_name} rejected`,
      user: userToReject
    })

  } catch (error) {
    console.error("Reject user error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}