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
    
    // Get task statistics
    const taskStats = await db.get(
      `SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status IN ('to_do', 'in_progress', 'pending') THEN 1 ELSE 0 END) as active_tasks,
        SUM(CASE WHEN travel_required = 1 THEN 1 ELSE 0 END) as travel_tasks,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks`
    )

    // Get team availability
    const teamStats = await db.all(
      `SELECT 
        u.id, u.full_name, u.role,
        CASE 
          WHEN ua.availability_type IS NOT NULL THEN ua.availability_type
          ELSE 'available'
        END as status,
        ua.destination_city,
        t.task_code as current_task
       FROM users u
       LEFT JOIN user_availability ua ON u.id = ua.user_id 
         AND DATE('now') BETWEEN ua.start_date AND ua.end_date
       LEFT JOIN task_assignments ta ON u.id = ta.user_id AND ta.is_primary = 1
       LEFT JOIN tasks t ON ta.task_id = t.id AND t.status IN ('to_do', 'in_progress')
       WHERE u.status = 'active' AND u.role IN ('manager', 'technician')
       ORDER BY u.full_name`
    )

    return NextResponse.json({
      taskStats,
      teamStats
    })

  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}