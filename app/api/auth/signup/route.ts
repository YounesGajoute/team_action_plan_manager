import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import sqlite3 from "sqlite3"
import { open } from "sqlite"
import path from "path"

const dbPath = path.join(process.cwd(), 'data', 'techmac.db')

export async function POST(request: NextRequest) {
  try {
    const { username, password, full_name, email, phone, role, telegram_id } = await request.json()

    console.log("?? Signup attempt for:", username)

    // Validate required fields
    if (!username || !password || !full_name || !email || !role) {
      console.log("? Missing required fields")
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      console.log("? Password too short")
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['manager', 'technician', 'commercial', 'other']
    if (!validRoles.includes(role)) {
      console.log("? Invalid role:", role)
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      )
    }

    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    // Check if username already exists
    const existingUser = await db.get(
      "SELECT id FROM users WHERE username = ?",
      [username]
    )

    if (existingUser) {
      console.log("? Username already exists:", username)
      await db.close()
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 409 }
      )
    }

    // Check if email already exists
    const existingEmail = await db.get(
      "SELECT id FROM users WHERE email = ?",
      [email]
    )

    if (existingEmail) {
      console.log("? Email already registered:", email)
      await db.close()
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 }
      )
    }

    // Check if telegram_id already exists (if provided)
    if (telegram_id) {
      const existingTelegram = await db.get(
        "SELECT id FROM users WHERE telegram_id = ?",
        [telegram_id]
      )

      if (existingTelegram) {
        console.log("? Telegram ID already registered:", telegram_id)
        await db.close()
        return NextResponse.json(
          { message: "Telegram ID already registered" },
          { status: 409 }
        )
      }
    }

    // Hash password
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)
    console.log("?? Password hashed successfully")

    // Insert new user (status: pending for approval)
    const result = await db.run(
      `INSERT INTO users (username, password_hash, role, full_name, email, phone, telegram_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, password_hash, role, full_name, email, phone || null, telegram_id || null, "pending"]
    )

    console.log("? User created successfully:", username, "ID:", result.lastID)

    // Close database connection
    await db.close()

    return NextResponse.json({
      message: "Account created successfully. Awaiting approval.",
      userId: result.lastID,
      status: "pending"
    }, { status: 201 })

  } catch (error: any) {
    console.error("?? Signup error:", error)
    
    // Ensure database is closed in case of error
    try {
      // If db was opened but not closed due to error
    } catch (closeError) {
      console.error("Error closing database:", closeError)
    }

    // Return appropriate error message
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        { message: "Username, email, or Telegram ID already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}