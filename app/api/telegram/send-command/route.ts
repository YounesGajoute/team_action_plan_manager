// app/api/telegram/send-command/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("?? Send command API called")
    
    const user = await verifyToken(request)
    if (!user) {
      console.log("? Auth failed in send command route")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { command, parameters, target_user_id } = await request.json()
    console.log("?? Command request:", { command, parameters, target_user_id, by: user.username })

    if (!command) {
      return NextResponse.json(
        { message: "Command is required" },
        { status: 400 }
      )
    }

    // Basic command validation - more flexible approach
    const commandCategories = {
      'Task Management': ['/newtask', '/mytasks', '/status', '/notes'],
      'Activity Logging': ['/activity', '/travel', '/absent'],
      'File Management': ['/upload', '/files'],
      'General': ['/start', '/help', '/register'],
      'System': ['/broadcast', '/stats', '/users']
    }

    const allValidCommands = Object.values(commandCategories).flat()
    
    if (!allValidCommands.includes(command)) {
      console.log("? Invalid command:", command)
      return NextResponse.json(
        { 
          message: "Invalid command",
          validCommands: commandCategories,
          providedCommand: command
        },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    try {
      // Get command category for logging
      const category = Object.keys(commandCategories).find(cat => 
        commandCategories[cat as keyof typeof commandCategories].includes(command)
      ) || 'Unknown'

      // Log the command execution attempt
      await db.run(`
        INSERT INTO activity_logs (
          user_id, activity_type, description, start_time, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        user.id,
        'web_command',
        `Executed ${command} ${parameters || ''} from web interface (${category})`,
        new Date().toISOString(),
        new Date().toISOString()
      ])

      console.log("?? Command logged to activity_logs")

      // Simulate command processing based on command type
      let simulatedResponse = {
        success: true,
        command: command,
        parameters: parameters,
        category: category,
        timestamp: new Date().toISOString(),
        executed_by: user.full_name,
        user_role: user.role
      }

      // Add command-specific simulation
      switch (command) {
        case '/newtask':
          simulatedResponse = {
            ...simulatedResponse,
            response: "Task creation dialog would appear in Telegram bot",
            next_step: "User would fill out task details via bot interface"
          }
          break
        case '/mytasks':
          simulatedResponse = {
            ...simulatedResponse,
            response: "User's assigned tasks would be displayed in Telegram",
            expected_data: "List of tasks with status filters"
          }
          break
        case '/status':
          simulatedResponse = {
            ...simulatedResponse,
            response: "Task status update interface would appear",
            next_step: "User would select task and new status"
          }
          break
        case '/activity':
          simulatedResponse = {
            ...simulatedResponse,
            response: "Activity logging interface would appear",
            next_step: "User would select activity type and enter details"
          }
          break
        case '/upload':
          simulatedResponse = {
            ...simulatedResponse,
            response: "File upload interface would appear",
            next_step: "User would select task and upload file"
          }
          break
        default:
          simulatedResponse = {
            ...simulatedResponse,
            response: `Command ${command} would be processed by Telegram bot`,
            note: "Generic command processing"
          }
      }

      console.log("? Command processed successfully")

      return NextResponse.json({
        message: `Command ${command} queued for execution`,
        result: simulatedResponse,
        integration_note: "This is a simulated response. In production, this would integrate with the actual Telegram bot service.",
        next_steps: [
          "Integrate with Telegram Bot API",
          "Send command to active bot instance",
          "Handle bot response and user interaction",
          "Update database with command results"
        ]
      })

    } catch (dbError) {
      console.error("?? Database error in send command:", dbError)
      return NextResponse.json(
        { 
          message: "Database error",
          error: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("? Send command error:", error)
    return NextResponse.json(
      { 
        message: "Failed to execute command",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}