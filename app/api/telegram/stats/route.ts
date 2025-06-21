// app/api/telegram/stats/route.ts
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
    
    // Get bot statistics
    const [
      activeUsers,
      totalActivities,
      todayActivities,
      commandsToday,
      filesUploaded,
      tasksCreated
    ] = await Promise.all([
      // Active users count
      db.get(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE status = 'active' AND telegram_id IS NOT NULL
      `),
      
      // Total activities
      db.get(`
        SELECT COUNT(*) as count 
        FROM activity_logs 
        WHERE created_at >= datetime('now', '-7 days')
      `),
      
      // Today's activities
      db.get(`
        SELECT COUNT(*) as count 
        FROM activity_logs 
        WHERE date(created_at) = date('now')
      `),
      
      // Commands today (telegram activities)
      db.get(`
        SELECT COUNT(*) as count 
        FROM activity_logs 
        WHERE activity_type = 'telegram_command' 
        AND date(created_at) = date('now')
      `),
      
      // Files uploaded this week
      db.get(`
        SELECT COUNT(*) as count 
        FROM files 
        WHERE upload_method = 'telegram' 
        AND uploaded_at >= datetime('now', '-7 days')
      `),
      
      // Tasks created via telegram this week
      db.get(`
        SELECT COUNT(*) as count 
        FROM tasks t
        JOIN activity_logs al ON al.description LIKE '%' || t.task_code || '%'
        WHERE al.activity_type = 'telegram_command'
        AND al.created_at >= datetime('now', '-7 days')
      `)
    ])

    // Calculate response time (mock for now - would need actual tracking)
    const responseTime = 0.3

    // Bot status check (would integrate with actual bot service)
    const botStatus = 'online'

    return NextResponse.json({
      bot_status: botStatus,
      active_users: activeUsers?.count || 0,
      total_activities: totalActivities?.count || 0,
      today_activities: todayActivities?.count || 0,
      commands_today: commandsToday?.count || 0,
      files_uploaded: filesUploaded?.count || 0,
      tasks_created: tasksCreated?.count || 0,
      response_time: responseTime,
      uptime: '99.8%' // Would track actual uptime
    })

  } catch (error) {
    console.error("Bot stats error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}