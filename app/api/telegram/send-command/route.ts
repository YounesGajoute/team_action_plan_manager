import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { command, parameters, user_id } = await request.json()

    if (!command) {
      return NextResponse.json(
        { message: "Command is required" },
        { status: 400 }
      )
    }

    const db = await openDb()

    // Log the command execution attempt
    await db.run(`
      INSERT INTO activity_logs (
        user_id, activity_type, description, start_time, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id || user.id,
      'bot_command',
      `${command} ${parameters || ''}`.trim(),
      new Date().toISOString(),
      new Date().toISOString()
    ])

    // In a real implementation, you would:
    // 1. Forward the command to the Telegram bot service
    // 2. Handle the response appropriately
    // 3. Update the database with results

    // For now, simulate command execution
    const simulatedResponse = await simulateCommandExecution(command, parameters, user)

    return NextResponse.json({
      success: true,
      message: simulatedResponse.message,
      result: simulatedResponse.result
    })

  } catch (error) {
    console.error("Send command error:", error)
    return NextResponse.json(
      { message: "Failed to execute command" },
      { status: 500 }
    )
  }
}

async function simulateCommandExecution(command: string, parameters: string, user: any) {
  // Simulate different command responses
  switch (command) {
    case '/mytasks':
      return {
        message: "Tasks retrieved successfully",
        result: "You have 3 active tasks"
      }
    case '/activity':
      return {
        message: "Activity logged successfully",
        result: `Activity "${parameters}" logged for ${user.full_name}`
      }
    case '/status':
      const [taskId, status] = (parameters || '').split(' ')
      return {
        message: "Task status updated",
        result: `Task ${taskId} status changed to ${status}`
      }
    case '/help':
      return {
        message: "Help information sent",
        result: "Command list sent to Telegram"
      }
    default:
      return {
        message: "Command executed",
        result: `Command ${command} processed`
      }
  }
}