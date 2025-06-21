import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const db = await openDb()
    
    // Get all active users
    const users = await db.all(
      "SELECT id, username, full_name, role, email, phone, status, last_login FROM users WHERE status = 'active' ORDER BY full_name"
    )

    return NextResponse.json({ users })

  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}