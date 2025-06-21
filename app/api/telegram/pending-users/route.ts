// app/api/telegram/pending-users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("?? Pending users API called")
    
    const user = await verifyToken(request)
    if (!user) {
      console.log("? Auth failed in pending users route")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user has manager role
    if (user.role !== 'manager') {
      console.log("? Access denied - user is not manager:", user.role)
      return NextResponse.json({ 
        message: "Access denied. Manager role required.",
        userRole: user.role 
      }, { status: 403 })
    }

    console.log("? Manager authenticated:", user.username)

    const db = await openDb()
    
    try {
      console.log("?? Fetching pending users...")
      
      const pendingUsers = await db.all(`
        SELECT 
          id, 
          username, 
          full_name, 
          email, 
          telegram_id, 
          phone,
          created_at,
          role as requested_role,
          status
        FROM users 
        WHERE status = 'pending' 
        ORDER BY created_at DESC
      `)

      console.log("?? Found pending users:", pendingUsers.length)

      // Format the response to match expected structure
      const formattedUsers = pendingUsers.map(user => ({
        id: user.id,
        username: user.username || 'N/A',
        full_name: user.full_name || 'Unknown',
        email: user.email || 'N/A',
        telegram_id: user.telegram_id || 'N/A',
        phone: user.phone || 'N/A',
        created_at: user.created_at,
        requested_role: user.requested_role || 'technician',
        status: user.status
      }))

      // Also get counts for dashboard
      const totalPending = formattedUsers.length
      const telegramPending = formattedUsers.filter(u => u.telegram_id && u.telegram_id !== 'N/A').length
      const emailPending = formattedUsers.filter(u => u.email && u.email !== 'N/A').length

      console.log("?? Pending user stats:", { totalPending, telegramPending, emailPending })

      return NextResponse.json({ 
        users: formattedUsers,
        count: totalPending,
        telegram_users: telegramPending,
        email_users: emailPending,
        message: totalPending > 0 ? `${totalPending} pending users found` : "No pending users"
      })

    } catch (dbError) {
      console.error("?? Database error in pending users:", dbError)
      return NextResponse.json(
        { 
          message: "Database error", 
          users: [],
          count: 0,
          error: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("? Pending users error:", error)
    return NextResponse.json(
      { 
        message: "Internal server error",
        users: [],
        count: 0,
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}