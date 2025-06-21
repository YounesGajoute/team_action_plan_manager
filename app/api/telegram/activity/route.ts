// app/api/telegram/activity/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("?? Activity API called")
    
    const user = await verifyToken(request)
    if (!user) {
      console.log("? Auth failed in activity route")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    console.log("? User authenticated:", user.username)

    const { searchParams } = new URL(request.url)
    const activityType = searchParams.get('type') || 'all'
    const timeRange = searchParams.get('range') || 'today'
    const userRole = searchParams.get('role') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log("?? Query params:", { activityType, timeRange, userRole, limit })

    const db = await openDb()
    
    try {
      // Build query based on filters
      let timeFilter = ''
      const params: any[] = []

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
        typeFilter = "AND al.activity_type = ?"
        params.push(activityType)
      }

      let roleFilter = ''
      if (userRole !== 'all') {
        roleFilter = "AND u.role = ?"
        params.push(userRole)
      }

      // Add limit parameter
      params.push(limit)

      const query = `
        SELECT 
          al.id,
          COALESCE(u.full_name, 'Unknown User') as user_name,
          COALESCE(u.role, 'unknown') as user_role,
          al.activity_type,
          COALESCE(al.description, 'No description') as description,
          al.created_at as timestamp,
          'success' as status,
          CASE 
            WHEN al.activity_type = 'telegram_command' THEN al.description
            ELSE '/' || al.activity_type
          END as command
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
          ${timeFilter}
          ${typeFilter}
          ${roleFilter}
        ORDER BY al.created_at DESC
        LIMIT ?
      `

      console.log("?? Executing query with", params.length, "parameters")

      const activities = await db.all(query, params)
      
      console.log("?? Found activities:", activities.length)

      return NextResponse.json({ 
        activities,
        count: activities.length,
        filters: { activityType, timeRange, userRole, limit }
      })

    } finally {
      // Don't close the db if it's a shared connection
      // await db.close()
    }

  } catch (error) {
    console.error("? Enhanced bot activity error:", error)
    return NextResponse.json(
      { 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}