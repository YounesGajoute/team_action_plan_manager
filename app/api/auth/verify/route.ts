// app/api/auth/verify/route.ts - IMPROVED VERSION
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { openDb } from "@/lib/database"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: NextRequest) {
  try {
    console.log("?? Verify API called")
    
    // Get token from multiple sources with better error handling
    let token = request.headers.get("Authorization")?.replace("Bearer ", "")
    
    // If no Authorization header, try cookies
    if (!token) {
      token = request.cookies.get("authToken")?.value
    }

    console.log("?? Token sources:", { 
      hasAuthHeader: !!request.headers.get("Authorization"), 
      hasCookie: !!request.cookies.get("authToken")?.value,
      finalToken: !!token 
    })

    if (!token) {
      console.log("? No token found in headers or cookies")
      return NextResponse.json(
        { message: "No token provided", isValid: false },
        { status: 401 }
      )
    }

    // Verify JWT token with better error handling
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any
      console.log("? Token decoded successfully:", { 
        userId: decoded.user_id || decoded.userId, 
        username: decoded.username 
      })
    } catch (jwtError: any) {
      console.error("? JWT verification failed:", jwtError.message)
      return NextResponse.json(
        { message: "Invalid or expired token", isValid: false },
        { status: 401 }
      )
    }
    
    // Connect to database with error handling
    let db
    try {
      db = await openDb()
    } catch (dbError) {
      console.error("?? Database connection failed:", dbError)
      return NextResponse.json(
        { message: "Database error", isValid: false },
        { status: 500 }
      )
    }
    
    // Try both possible user ID field names (backwards compatibility)
    const userId = decoded.user_id || decoded.userId
    
    if (!userId) {
      console.error("? No user ID found in token")
      return NextResponse.json(
        { message: "Invalid token format", isValid: false },
        { status: 401 }
      )
    }
    
    // Get user data from database with additional checks
    const user = await db.get(
      `SELECT id, username, role, full_name, email, status, last_login 
       FROM users 
       WHERE id = ? AND status = 'active'`,
      [userId]
    )

    if (!user) {
      console.log("? User not found or inactive for ID:", userId)
      return NextResponse.json(
        { message: "User not found or account inactive", isValid: false },
        { status: 401 }
      )
    }

    console.log("? User verified successfully:", user.username)

    // Update last login timestamp
    try {
      await db.run(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        [user.id]
      )
    } catch (updateError) {
      console.warn("?? Could not update last login:", updateError)
      // Don't fail the request for this
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        status: user.status
      },
      isValid: true,
      message: "Token verified successfully"
    }, { status: 200 })

  } catch (error: any) {
    console.error("?? Verify API error:", error)
    return NextResponse.json(
      { 
        message: "Internal server error",
        isValid: false,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}