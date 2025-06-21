import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const db = await openDb()
    
    // Get task details
    const task = await db.get(
      `SELECT 
        t.*,
        creator.full_name as created_by_name
       FROM tasks t
       LEFT JOIN users creator ON t.created_by = creator.id
       WHERE t.id = ?`,
      [params.id]
    )

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    // Get assigned users
    const assignedUsers = await db.all(
      `SELECT u.id, u.full_name, ta.is_primary, ta.assigned_at
       FROM task_assignments ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?`,
      [params.id]
    )

    // Get task notes
    const notes = await db.all(
      `SELECT tn.*, u.full_name as user_name
       FROM task_notes tn
       JOIN users u ON tn.user_id = u.id
       WHERE tn.task_id = ?
       ORDER BY tn.created_at DESC`,
      [params.id]
    )

    // Get task files
    const files = await db.all(
      `SELECT f.*, u.full_name as uploaded_by_name
       FROM files f
       JOIN users u ON f.uploaded_by = u.id
       WHERE f.task_id = ?
       ORDER BY f.uploaded_at DESC`,
      [params.id]
    )

    return NextResponse.json({
      task: {
        ...task,
        assigned_users: assignedUsers,
        notes,
        files
      }
    })

  } catch (error) {
    console.error("Task fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}