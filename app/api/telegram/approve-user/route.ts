// app/api/telegram/approve-user/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { userId, role = 'technician' } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    const validRoles = ['manager', 'technician', 'commercial', 'other']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    // Update user status and role
    const result = await db.run(
      'UPDATE users SET status = ?, role = ? WHERE id = ? AND status = ?',
      ['active', role, userId, 'pending']
    )

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "User not found or already processed" },
        { status: 404 }
      )
    }

    // Get user details for notification
    const updatedUser = await db.get(
      'SELECT username, full_name, telegram_id FROM users WHERE id = ?',
      [userId]
    )

    // Log the approval action
    await db.run(`
      INSERT INTO activity_logs (
        user_id, activity_type, description, start_time, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user.id,
      'user_management',
      `Approved user ${updatedUser.full_name} as ${role}`,
      new Date().toISOString(),
      new Date().toISOString()
    ])

    // TODO: Send approval notification to user via Telegram bot
    // This would integrate with the bot service to send a notification

    return NextResponse.json({
      message: `User ${updatedUser.full_name} approved as ${role}`,
      user: updatedUser
    })

  } catch (error) {
    console.error("Approve user error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}