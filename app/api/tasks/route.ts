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
    const status = searchParams.get("status")
    const city = searchParams.get("city")
    const search = searchParams.get("search")
    const assigned_to = searchParams.get("assigned_to")

    const db = await openDb()
    
    let query = `
      SELECT 
        t.*,
        GROUP_CONCAT(u.full_name) as assigned_users,
        creator.full_name as created_by_name
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE 1=1
    `
    
    const params: any[] = []

    // Apply filters
    if (status && status !== "all") {
      query += " AND t.status = ?"
      params.push(status)
    }

    if (city && city !== "all") {
      query += " AND t.customer_city = ?"
      params.push(city)
    }

    if (search) {
      query += " AND (t.description LIKE ? OR t.customer_name LIKE ? OR t.task_code LIKE ?)"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (assigned_to && assigned_to !== "all") {
      query += " AND ta.user_id = ?"
      params.push(assigned_to)
    }

    // If user is not manager, only show their assigned tasks
    if (user.role !== "manager") {
      query += " AND ta.user_id = ?"
      params.push(user.id)
    }

    query += " GROUP BY t.id ORDER BY t.created_at DESC"

    const tasks = await db.all(query, params)

    return NextResponse.json({ tasks })

  } catch (error) {
    console.error("Tasks fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const taskData = await request.json()

    const db = await openDb()
    
    // Generate task code
    const taskCount = await db.get("SELECT COUNT(*) as count FROM tasks")
    const taskCode = `TA${String(taskCount.count + 1).padStart(3, "0")}`

    // Detect travel requirement
    const travelRequired = taskData.customer_city?.toLowerCase() !== "tanger"

    // Insert task
    const result = await db.run(
      `INSERT INTO tasks (
        task_code, task_type, category, description, customer_name,
        customer_city, customer_area, travel_required, company_type,
        status, priority, created_by, estimated_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskCode,
        taskData.task_type || "technical_task",
        taskData.category,
        taskData.description,
        taskData.customer_name,
        taskData.customer_city,
        taskData.customer_area,
        travelRequired,
        taskData.company_type,
        "to_do",
        taskData.priority || "normal",
        user.id,
        taskData.estimated_hours || null
      ]
    )

    // Assign task to specified users or creator
    const assignedUsers = taskData.assigned_to || [user.id]
    for (const userId of assignedUsers) {
      await db.run(
        "INSERT INTO task_assignments (task_id, user_id, assigned_by, is_primary) VALUES (?, ?, ?, ?)",
        [result.lastID, userId, user.id, userId === assignedUsers[0]]
      )
    }

    return NextResponse.json({
      message: "Task created successfully",
      taskId: result.lastID,
      taskCode
    }, { status: 201 })

  } catch (error) {
    console.error("Task creation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}