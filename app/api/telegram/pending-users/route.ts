// app/api/telegram/pending-users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const db = await openDb()
    
    const pendingUsers = await db.all(`
      SELECT 
        id, 
        username, 
        full_name, 
        email, 
        telegram_id, 
        created_at,
        role as requested_role,
        phone
      FROM users 
      WHERE status = 'pending' AND telegram_id IS NOT NULL
      ORDER BY created_at DESC
    `)

    return NextResponse.json({ users: pendingUsers })

  } catch (error) {
    console.error("Pending users error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}