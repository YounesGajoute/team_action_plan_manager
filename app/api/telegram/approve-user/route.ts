// app/api/telegram/approve-user/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("? Approve user API called")
    
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      console.log("? Auth failed or not manager in approve route")
      return NextResponse.json({ 
        message: "Unauthorized. Manager role required.",
        userRole: user?.role || 'unknown'
      }, { status: 401 })
    }

    const { userId, role = 'technician' } = await request.json()
    console.log("?? Approve request:", { userId, role, by: user.username })

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    const validRoles = ['manager', 'technician', 'commercial', 'other']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { 
          message: "Invalid role specified. Must be one of: " + validRoles.join(', '),
          validRoles 
        },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    try {
      // Get user details before updating
      const userToApprove = await db.get(
        'SELECT id, username, full_name, telegram_id, email, status FROM users WHERE id = ?',
        [userId]
      )

      if (!userToApprove) {
        console.log("? User not found:", userId)
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        )
      }

      if (userToApprove.status !== 'pending') {
        console.log("? User not pending:", userToApprove.status)
        return NextResponse.json(
          { 
            message: `User is not pending approval. Current status: ${userToApprove.status}`,
            currentStatus: userToApprove.status
          },
          { status: 400 }
        )
      }

      console.log("?? Approving user:", userToApprove.full_name)

      // Update user status and role
      const result = await db.run(
        'UPDATE users SET status = ?, role = ? WHERE id = ? AND status = ?',
        ['active', role, userId, 'pending']
      )

      if (result.changes === 0) {
        console.log("? No rows updated")
        return NextResponse.json(
          { message: "Failed to update user - no changes made" },
          { status: 500 }
        )
      }

      // Log the approval action
      await db.run(`
        INSERT INTO activity_logs (
          user_id, activity_type, description, start_time, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        user.id,
        'user_management',
        `Approved user ${userToApprove.full_name} (${userToApprove.username}) as ${role}`,
        new Date().toISOString(),
        new Date().toISOString()
      ])

      console.log("? User approved successfully")

      return NextResponse.json({
        message: `User ${userToApprove.full_name} approved as ${role}`,
        success: true,
        user: {
          id: userToApprove.id,
          username: userToApprove.username,
          full_name: userToApprove.full_name,
          role: role,
          status: 'active',
          approved_by: user.full_name,
          approved_at: new Date().toISOString()
        }
      })

    } catch (dbError) {
      console.error("?? Database error in approve user:", dbError)
      return NextResponse.json(
        { 
          message: "Database error", 
          error: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("? Approve user error:", error)
    return NextResponse.json(
      { 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}