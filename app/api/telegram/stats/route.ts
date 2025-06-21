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
    
    // Get bot usage statistics
    const stats = await db.get(`
      SELECT 
        COUNT(DISTINCT al.user_id) as active_users,
        COUNT(al.id) as total_activities,
        COUNT(CASE WHEN DATE(al.created_at) = DATE('now') THEN 1 END) as today_activities,
        COUNT(CASE WHEN DATE(al.created_at) = DATE('now') THEN 1 END) as commands_today,
        COUNT(CASE WHEN f.upload_method = 'telegram' THEN 1 END) as files_uploaded,
        COUNT(CASE WHEN t.created_at >= DATE('now', '-7 days') THEN 1 END) as tasks_created
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN files f ON f.uploaded_at >= DATE('now', '-7 days')
      LEFT JOIN tasks t ON t.created_at >= DATE('now', '-7 days')
      WHERE al.created_at >= DATE('now', '-7 days')
        AND u.telegram_id IS NOT NULL
    `)
    
    // Get recent activity from users with Telegram IDs
    const recentActivity = await db.all(`
      SELECT 
        al.id,
        u.full_name as user_name,
        al.activity_type,
        al.description,
        al.created_at as timestamp,
        'success' as status,
        ('/' || al.activity_type || ' ' || al.description) as command
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE u.telegram_id IS NOT NULL
        AND al.created_at >= DATE('now', '-1 days')
      ORDER BY al.created_at DESC
      LIMIT 10
    `)

    // Check bot status (this would normally ping the bot service)
    const botStatus = 'online' // In production, ping the actual bot

    return NextResponse.json({
      stats: {
        ...stats,
        bot_status: botStatus
      },
      recentActivity
    })

  } catch (error) {
    console.error("Bot stats error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}