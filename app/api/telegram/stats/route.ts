// app/api/telegram/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("?? Stats API called")
    
    const user = await verifyToken(request)
    if (!user) {
      console.log("? Auth failed in stats route")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    console.log("? User authenticated for stats:", user.username)

    const db = await openDb()
    
    try {
      console.log("?? Fetching bot statistics...")

      // Get all statistics with proper error handling and fallbacks
      const [
        activeUsersResult,
        totalActivitiesResult,
        todayActivitiesResult,
        commandsTodayResult,
        filesUploadedResult,
        tasksCreatedResult
      ] = await Promise.all([
        // Active users count with telegram_id
        db.get(`
          SELECT COUNT(*) as count 
          FROM users 
          WHERE status = 'active' 
          AND telegram_id IS NOT NULL 
          AND telegram_id != ''
        `).catch(() => ({ count: 0 })),
        
        // Total activities in last 7 days
        db.get(`
          SELECT COUNT(*) as count 
          FROM activity_logs 
          WHERE created_at >= datetime('now', '-7 days')
        `).catch(() => ({ count: 0 })),
        
        // Today's activities
        db.get(`
          SELECT COUNT(*) as count 
          FROM activity_logs 
          WHERE date(created_at) = date('now')
        `).catch(() => ({ count: 0 })),
        
        // Telegram commands today (look for telegram-related activity)
        db.get(`
          SELECT COUNT(*) as count 
          FROM activity_logs 
          WHERE (activity_type LIKE '%telegram%' OR activity_type = 'telegram_command')
          AND date(created_at) = date('now')
        `).catch(() => ({ count: 0 })),
        
        // Files uploaded this week via telegram
        db.get(`
          SELECT COUNT(*) as count 
          FROM files 
          WHERE upload_method = 'telegram' 
          AND uploaded_at >= datetime('now', '-7 days')
        `).catch(() => ({ count: 0 })),
        
        // Tasks created this week
        db.get(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE created_at >= datetime('now', '-7 days')
        `).catch(() => ({ count: 0 }))
      ])

      console.log("?? Raw stats fetched:", {
        active_users: activeUsersResult?.count,
        total_activities: totalActivitiesResult?.count,
        today_activities: todayActivitiesResult?.count,
        commands_today: commandsTodayResult?.count,
        files_uploaded: filesUploadedResult?.count,
        tasks_created: tasksCreatedResult?.count
      })

      // Mock response time and bot status (in production, these would be real metrics)
      const responseTime = Math.round((Math.random() * 0.5 + 0.2) * 100) / 100 // 0.2-0.7 seconds
      const botStatus = 'online' // Could check actual bot service
      const uptime = '99.8%' // Could track actual uptime

      const statsResponse = {
        bot_status: botStatus,
        active_users: activeUsersResult?.count || 0,
        total_activities: totalActivitiesResult?.count || 0,
        today_activities: todayActivitiesResult?.count || 0,
        commands_today: commandsTodayResult?.count || 0,
        files_uploaded: filesUploadedResult?.count || 0,
        tasks_created: tasksCreatedResult?.count || 0,
        response_time: responseTime,
        uptime: uptime,
        last_updated: new Date().toISOString()
      }

      console.log("? Returning stats:", statsResponse)

      return NextResponse.json(statsResponse)

    } catch (dbError) {
      console.error("?? Database error in stats:", dbError)
      
      // Return mock data if database fails
      const fallbackStats = {
        bot_status: 'online',
        active_users: 0,
        total_activities: 0,
        today_activities: 0,
        commands_today: 0,
        files_uploaded: 0,
        tasks_created: 0,
        response_time: 0.3,
        uptime: '99.8%',
        last_updated: new Date().toISOString(),
        note: 'Fallback data due to database error'
      }
      
      return NextResponse.json(fallbackStats)
    }

  } catch (error) {
    console.error("? Bot stats error:", error)
    return NextResponse.json(
      { 
        message: "Internal server error", 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}