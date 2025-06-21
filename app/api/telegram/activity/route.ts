// app/api/telegram/activity/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activityType = searchParams.get('type') || 'all'
    const timeRange = searchParams.get('range') || 'today'
    const userRole = searchParams.get('role') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = await openDb()
    
    // Build query based on filters
    let timeFilter = ''
    switch (timeRange) {
      case 'today':
        timeFilter = "AND date(al.created_at) = date('now')"
        break
      case 'week':
        timeFilter = "AND al.created_at >= datetime('now', '-7 days')"
        break
      case 'month':
        timeFilter = "AND al.created_at >= datetime('now', '-30 days')"
        break
      default:
        timeFilter = "AND al.created_at >= datetime('now', '-24 hours')"
    }

    let typeFilter = ''
    if (activityType !== 'all') {
      typeFilter = `AND al.activity_type = '${activityType}'`
    }

    let roleFilter = ''
    if (userRole !== 'all') {
      roleFilter = `AND u.role = '${userRole}'`
    }

    const activities = await db.all(`
      SELECT 
        al.id,
        u.full_name as user_name,
        u.role as user_role,
        al.activity_type,
        al.description,
        al.created_at as timestamp,
        'success' as status,
        CASE 
          WHEN al.activity_type = 'telegram_command' THEN al.description
          ELSE '/' || al.activity_type
        END as command
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE u.telegram_id IS NOT NULL
        ${timeFilter}
        ${typeFilter}
        ${roleFilter}
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [limit])

    return NextResponse.json({ activities })

  } catch (error) {
    console.error("Bot activity error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}