import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { openDb } from "./database"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface AuthUser {
  id: number
  username: string
  role: string
  full_name: string
  email: string
}

export async function verifyToken(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    
    if (!token) {
      return null
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    const db = await openDb()
    
    // Get user data
    const user = await db.get(
      "SELECT id, username, role, full_name, email FROM users WHERE id = ? AND status = 'active'",
      [decoded.userId]
    )

    return user || null
  } catch (error) {
    return null
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  )
}