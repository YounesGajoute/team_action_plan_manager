// app/api/telegram/reject-user/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("? Reject user API called")
    
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      console.log("? Auth failed or not manager in reject route")
      return NextResponse.json({ 
        message: "Unauthorized. Manager role required.",
        userRole: user?.role || 'unknown'
      }, { status: 401 })
    }

    const { userId, reason = 'No reason provided' } = await request.json()
    console.log("?? Reject request:", { userId, reason, by: user.username })

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    try {
      // Get user details before rejection
      const userToReject = await db.get(
        'SELECT id, username, full_name, telegram_id, email, status FROM users WHERE id = ?',
        [userId]
      )

      if (!userToReject) {
        console.log("? User not found:", userId)
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        )
      }

      if (userToReject.status !== 'pending') {
        console.log("? User not pending:", userToReject.status)
        return NextResponse.json(
          { 
            message: `User is not pending approval. Current status: ${userToReject.status}`,
            currentStatus: userToReject.status
          },
          { status: 400 }
        )
      }

      console.log("?? Rejecting user:", userToReject.full_name)

      // Update user status to inactive (since schema doesn't have 'rejected')
      const result = await db.run(
        'UPDATE users SET status = ? WHERE id = ? AND status = ?',
        ['inactive', userId, 'pending']
      )

      if (result.changes === 0) {
        console.log("? No rows updated")
        return NextResponse.json(
          { message: "Failed to update user - no changes made" },
          { status: 500 }
        )
      }

      // Log the rejection action
      await db.run(`
        INSERT INTO activity_logs (
          user_id, activity_type, description, start_time, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        user.id,
        'user_management',
        `Rejected user ${userToReject.full_name} (${userToReject.username}). Reason: ${reason}`,
        new Date().toISOString(),
        new Date().toISOString()
      ])

      console.log("? User rejected successfully")

      return NextResponse.json({
        message: `User ${userToReject.full_name} rejected`,
        success: true,
        user: {
          id: userToReject.id,
          username: userToReject.username,
          full_name: userToReject.full_name,
          status: 'inactive',
          reason: reason,
          rejected_by: user.full_name,
          rejected_at: new Date().toISOString()
        }
      })

    } catch (dbError) {
      console.error("?? Database error in reject user:", dbError)
      return NextResponse.json(
        { 
          message: "Database error",
          error: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("? Reject user error:", error)
    return NextResponse.json(
      { 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}