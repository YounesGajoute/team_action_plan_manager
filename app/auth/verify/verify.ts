import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { openDb } from "@/lib/database"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      )
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    const db = await openDb()
    
    // Get user data
    const user = await db.get(
      "SELECT id, username, role, full_name, email, status FROM users WHERE id = ? AND status = 'active'",
      [decoded.userId]
    )

    if (!user) {
      return NextResponse.json(
        { message: "User not found or inactive" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user,
      isValid: true
    })

  } catch (error) {
    return NextResponse.json(
      { message: "Invalid token" },
      { status: 401 }
    )
  }
}