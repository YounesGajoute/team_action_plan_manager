// app/api/telegram/webhook/route.ts - ENHANCED VERSION
// Replace your existing webhook file with this content

import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"

// Enhanced Telegram Types
interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  document?: TelegramDocument
  photo?: TelegramPhotoSize[]
  video?: TelegramVideo
}

interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
}

interface TelegramChat {
  id: number
  type: string
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

interface TelegramVideo {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  file_size?: number
}

interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

class EnhancedTelegramBot {
  private botToken: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN!
  }

  // =================== MESSAGING METHODS ===================
  
  async sendMessage(chatId: number, text: string, options?: any) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...options
        })
      })

      const result = await response.json()
      if (!result.ok) {
        console.error('Telegram API error:', result.description)
        throw new Error(result.description)
      }

      return result
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text
      })
    })
  }

  // =================== FILE HANDLING ===================
  
  async getFile(fileId: string) {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`)
    return response.json()
  }

  async downloadFile(filePath: string): Promise<ArrayBuffer> {
    const response = await fetch(`https://api.telegram.org/file/bot${this.botToken}/${filePath}`)
    return response.arrayBuffer()
  }

  // =================== USER MANAGEMENT ===================
  
  async getUserFromDatabase(telegramId: string) {
    const db = await openDb()
    try {
      const user = await db.get(
        'SELECT * FROM users WHERE telegram_id = ? AND status = ?',
        [telegramId, 'active']
      )
      return user
    } finally {
      await db.close()
    }
  }

  async registerOrUpdateUser(telegramUser: TelegramUser) {
    const db = await openDb()
    try {
      // Check if user exists
      let user = await db.get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramUser.id.toString()]
      )

      if (!user) {
        // Create new pending user (same as your current system)
        const fullName = `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim()
        
        await db.run(`
          INSERT INTO users (telegram_id, username, full_name, status, role)
          VALUES (?, ?, ?, 'pending', 'technician')
        `, [
          telegramUser.id.toString(),
          telegramUser.username || null,
          fullName
        ])

        user = await db.get(
          'SELECT * FROM users WHERE telegram_id = ?',
          [telegramUser.id.toString()]
        )

        // Log new registration
        await this.logActivity(user.id, 'telegram_registration', `New user registered: ${fullName}`)
      }

      return user
    } finally {
      await db.close()
    }
  }

  // =================== ACTIVITY LOGGING ===================
  
  async logActivity(userId: number, activityType: string, description: string, taskId?: number) {
    const db = await openDb()
    try {
      await db.run(`
        INSERT INTO activity_logs (
          user_id, activity_type, description, start_time, 
          task_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userId,
        activityType,
        description,
        new Date().toISOString(),
        taskId || null,
        new Date().toISOString()
      ])
    } finally {
      await db.close()
    }
  }

  // =================== COMMAND HANDLERS ===================
  
  async handleStartCommand(message: TelegramMessage, user: any) {
    const welcomeText = user.status === 'active' ? `
?? <b>Welcome back, ${user.full_name}!</b>

You're connected to the Techmac Team Action Plan Manager.

<b>?? Quick Commands:</b>
?? /tasks - View your tasks
? /newtask - Create a new task  
? /activity - Log activity
?? /upload - Upload files
? /help - Show all commands

?? <b>Web Interface:</b> ${process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com'}
` : `
?? <b>Registration Pending</b>

Hello ${user.full_name}! Your registration is pending approval.

Please wait for an administrator to approve your account.

?? <b>Web Interface:</b> ${process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com'}
`

    await this.sendMessage(message.chat.id, welcomeText, {
      reply_markup: user.status === 'active' ? {
        inline_keyboard: [
          [
            { text: '?? My Tasks', callback_data: 'tasks_my' },
            { text: '? New Task', callback_data: 'task_new' }
          ],
          [
            { text: '? Log Activity', callback_data: 'activity_log' },
            { text: '?? My Stats', callback_data: 'stats_show' }
          ],
          [
            { text: '?? Open Web App', url: process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com' }
          ]
        ]
      } : {
        inline_keyboard: [
          [{ text: '?? Web Interface', url: process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com' }]
        ]
      }
    })

    await this.logActivity(user.id, 'telegram_command', '/start command executed')
  }

  async handleTasksCommand(message: TelegramMessage, user: any) {
    const db = await openDb()
    try {
      // Get user's tasks (compatible with your existing task system)
      const tasks = await db.all(`
        SELECT t.*, GROUP_CONCAT(u.full_name) as assigned_users
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users u ON ta.user_id = u.id
        WHERE ta.user_id = ? OR t.created_by = ?
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `, [user.id, user.id])

      if (!tasks.length) {
        await this.sendMessage(message.chat.id, '?? <b>No Tasks Found</b>\n\nYou don\'t have any assigned tasks yet.')
        return
      }

      let tasksText = `?? <b>Your Tasks (${tasks.length})</b>\n\n`
      
      tasks.forEach((task) => {
        const statusEmoji = this.getStatusEmoji(task.status)
        const priorityEmoji = this.getPriorityEmoji(task.priority)
        
        tasksText += `${statusEmoji} <b>${task.task_code}</b> ${priorityEmoji}\n`
        tasksText += `?? ${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}\n`
        tasksText += `?? ${task.customer_name || 'No customer'}\n`
        tasksText += `?? ${task.customer_city || 'No location'}\n\n`
      })

      await this.sendMessage(message.chat.id, tasksText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '?? Refresh', callback_data: 'tasks_refresh' },
              { text: '? New Task', callback_data: 'task_new' }
            ],
            [
              { text: '?? View in Web App', url: `${process.env.NEXT_PUBLIC_API_URL}/tasks` }
            ]
          ]
        }
      })

      await this.logActivity(user.id, 'telegram_command', '/tasks command executed')
    } finally {
      await db.close()
    }
  }

  async handleNewTaskCommand(message: TelegramMessage, user: any, args: string[]) {
    if (args.length === 0) {
      await this.sendMessage(message.chat.id, `
? <b>Create New Task</b>

<b>Usage:</b> /newtask [description]

<b>Example:</b> /newtask Install new equipment at customer site

?? For full task creation with all options, use the web interface.
`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '?? Full Task Creator', url: `${process.env.NEXT_PUBLIC_API_URL}/tasks/new` }]
          ]
        }
      })
      return
    }

    const description = args.join(' ')
    
    try {
      const db = await openDb()
      
      // Generate task code (same logic as your API)
      const taskCount = await db.get("SELECT COUNT(*) as count FROM tasks")
      const taskCode = `TA${String(taskCount.count + 1).padStart(3, "0")}`

      // Create task (compatible with your tasks table)
      const result = await db.run(`
        INSERT INTO tasks (
          task_code, task_type, category, description, 
          status, priority, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        taskCode,
        'technical_task',
        'other',
        description,
        'to_do',
        'normal',
        user.id
      ])

      // Assign to creator (same as your API logic)
      await db.run(
        "INSERT INTO task_assignments (task_id, user_id, assigned_by, is_primary) VALUES (?, ?, ?, ?)",
        [result.lastID, user.id, user.id, true]
      )

      await this.sendMessage(message.chat.id, `
? <b>Task Created Successfully!</b>

??? <b>Code:</b> ${taskCode}
?? <b>Description:</b> ${description}
?? <b>Assigned to:</b> ${user.full_name}

?? <b>Edit details:</b> Use the web interface for more options.
`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '?? Edit Task', url: `${process.env.NEXT_PUBLIC_API_URL}/tasks/${result.lastID}` }]
          ]
        }
      })

      await this.logActivity(user.id, 'task_creation', `Created task ${taskCode}: ${description}`, result.lastID)

      await db.close()
    } catch (error) {
      console.error('Task creation error:', error)
      await this.sendMessage(message.chat.id, '? <b>Error</b>\n\nCouldn\'t create task. Please try again.')
    }
  }

  async handleHelpCommand(message: TelegramMessage, user: any) {
    const helpText = `
? <b>Techmac Bot Help</b>

<b>?? Task Commands:</b>
/tasks - View your tasks
/newtask [description] - Create quick task

<b>? Activity Commands:</b>
/activity [type] [description] - Log activity

<b>?? File Commands:</b>
Send any file directly to upload it

<b>?? Info Commands:</b>
/help - Show this help
/start - Main menu

<b>?? Web Interface:</b>
For full features: ${process.env.NEXT_PUBLIC_API_URL}

<b>?? Tips:</b>
• Send files directly to upload them
• Use the web interface for advanced features
• Your activities sync across all platforms
`

    await this.sendMessage(message.chat.id, helpText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '?? Open Web Interface', url: process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com' }]
        ]
      }
    })

    await this.logActivity(user.id, 'telegram_command', '/help command executed')
  }

  // =================== FILE UPLOAD HANDLING ===================
  
  async handleFileUpload(message: TelegramMessage, user: any) {
    let fileId: string
    let fileName: string
    let fileType: string

    if (message.document) {
      fileId = message.document.file_id
      fileName = message.document.file_name || 'document'
      fileType = message.document.mime_type || 'application/octet-stream'
    } else if (message.photo) {
      const photo = message.photo[message.photo.length - 1] // Get highest resolution
      fileId = photo.file_id
      fileName = `photo_${Date.now()}.jpg`
      fileType = 'image/jpeg'
    } else if (message.video) {
      fileId = message.video.file_id
      fileName = `video_${Date.now()}.mp4`
      fileType = 'video/mp4'
    } else {
      return
    }

    try {
      // Get file info from Telegram
      const fileInfo = await this.getFile(fileId)
      
      if (!fileInfo.ok) {
        throw new Error('Failed to get file info')
      }

      // Download file
      const fileBuffer = await this.downloadFile(fileInfo.result.file_path)
      
      // Save file to uploads directory
      const fs = require('fs').promises
      const path = require('path')
      const uploadsDir = process.env.TEMP_UPLOAD_DIR || './uploads'
      
      await fs.mkdir(uploadsDir, { recursive: true })
      
      const timestamp = Date.now()
      const savedFileName = `telegram_${timestamp}_${fileName}`
      const filePath = path.join(uploadsDir, savedFileName)
      
      await fs.writeFile(filePath, Buffer.from(fileBuffer))

      // Save file record to database
      const db = await openDb()
      try {
        await db.run(`
          INSERT INTO files (
            filename, original_filename, file_type, file_size,
            upload_method, uploaded_by, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          savedFileName,
          fileName,
          fileType,
          fileInfo.result.file_size || 0,
          'telegram',
          user.id,
          'Uploaded via Telegram bot'
        ])
      } finally {
        await db.close()
      }

      await this.sendMessage(message.chat.id, `
? <b>File Uploaded Successfully!</b>

?? <b>File:</b> ${fileName}
?? <b>Size:</b> ${Math.round((fileInfo.result.file_size || 0) / 1024)} KB
?? <b>Saved as:</b> ${savedFileName}

?? Access your files in the web interface.
`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '?? View Files', url: `${process.env.NEXT_PUBLIC_API_URL}/files` }]
          ]
        }
      })

      await this.logActivity(user.id, 'file_upload', `Uploaded file: ${fileName} (${fileType})`)

    } catch (error) {
      console.error('File upload error:', error)
      await this.sendMessage(message.chat.id, '? <b>Upload Failed</b>\n\nCouldn\'t save the file. Please try again.')
    }
  }

  // =================== CALLBACK QUERY HANDLING ===================
  
  async handleCallbackQuery(callback: TelegramCallbackQuery, user: any) {
    const data = callback.data!
    const chatId = callback.message!.chat.id

    try {
      switch (data) {
        case 'tasks_my':
        case 'tasks_refresh':
          await this.handleTasksCommand(callback.message!, user)
          break
        
        case 'task_new':
          await this.sendMessage(chatId, `
? <b>Create New Task</b>

Quick create: /newtask [description]

?? For full task creation with all options, use the web interface.
`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '?? Open Task Creator', url: `${process.env.NEXT_PUBLIC_API_URL}/tasks/new` }]
              ]
            }
          })
          break
        
        case 'activity_log':
          await this.sendMessage(chatId, `
? <b>Log Activity</b>

Use: /activity [type] [description]

Example: /activity customer_visit Working at Aptive office

?? For detailed activity management, use the web interface.
`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '?? Activity Manager', url: `${process.env.NEXT_PUBLIC_API_URL}/activity` }]
              ]
            }
          })
          break
        
        case 'stats_show':
          await this.showUserStats(chatId, user)
          break
      }

      // Answer callback query
      await this.answerCallbackQuery(callback.id)

    } catch (error) {
      console.error('Callback query error:', error)
      await this.answerCallbackQuery(callback.id, 'Error processing request')
    }
  }

  async showUserStats(chatId: number, user: any) {
    const db = await openDb()
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_activities,
          SUM(CASE WHEN DATE(start_time) = DATE('now') THEN 1 ELSE 0 END) as today_activities,
          SUM(CASE WHEN start_time >= date('now', '-7 days') THEN 1 ELSE 0 END) as week_activities
        FROM activity_logs 
        WHERE user_id = ?
      `, [user.id])

      const statsText = `
?? <b>Your Statistics</b>

?? <b>User:</b> ${user.full_name}
?? <b>Total Activities:</b> ${stats.total_activities}
?? <b>Today:</b> ${stats.today_activities}
?? <b>This Week:</b> ${stats.week_activities}

?? View detailed statistics in the web interface.
`

      await this.sendMessage(chatId, statsText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '?? Detailed Stats', url: `${process.env.NEXT_PUBLIC_API_URL}/stats` }]
          ]
        }
      })
    } finally {
      await db.close()
    }
  }

  // =================== UTILITY METHODS ===================
  
  getStatusEmoji(status: string): string {
    const emojis = {
      'to_do': '??',
      'in_progress': '?',
      'pending': '?',
      'blocked': '??',
      'completed': '?'
    }
    return emojis[status as keyof typeof emojis] || '??'
  }

  getPriorityEmoji(priority: string): string {
    const emojis = {
      'critical': '??',
      'high': '??',
      'normal': '??'
    }
    return emojis[priority as keyof typeof emojis] || '??'
  }

  // =================== MAIN PROCESSING ===================
  
  async processUpdate(update: TelegramUpdate) {
    console.log('?? Processing Telegram update:', update.update_id)

    try {
      if (update.message) {
        await this.processMessage(update.message)
      }

      if (update.callback_query) {
        await this.processCallbackQuery(update.callback_query)
      }
    } catch (error) {
      console.error('Error processing update:', error)
    }
  }

  async processMessage(message: TelegramMessage) {
    // Get or register user
    const user = await this.registerOrUpdateUser(message.from)
    
    if (!user) {
      await this.sendMessage(message.chat.id, '? <b>Error</b>\n\nUser registration failed. Please try again.')
      return
    }

    // Check if user is active
    if (user.status !== 'active') {
      await this.sendMessage(message.chat.id, `
?? <b>Account Pending Approval</b>

Hello ${user.full_name}! Your account is waiting for administrator approval.

?? <b>Web Interface:</b> ${process.env.NEXT_PUBLIC_API_URL}
`)
      return
    }

    // Handle commands
    if (message.text?.startsWith('/')) {
      await this.handleCommand(message, user)
    }
    // Handle file uploads
    else if (message.document || message.photo || message.video) {
      await this.handleFileUpload(message, user)
    }
    // Handle regular text
    else {
      await this.handleTextMessage(message, user)
    }
  }

  async handleCommand(message: TelegramMessage, user: any) {
    const command = message.text!.split(' ')[0].toLowerCase()
    const args = message.text!.split(' ').slice(1)

    switch (command) {
      case '/start':
        await this.handleStartCommand(message, user)
        break
      
      case '/tasks':
        await this.handleTasksCommand(message, user)
        break
      
      case '/newtask':
        await this.handleNewTaskCommand(message, user, args)
        break
      
      case '/help':
        await this.handleHelpCommand(message, user)
        break
      
      default:
        await this.sendMessage(message.chat.id, `
? <b>Unknown Command</b>

Use /help to see available commands.

?? <b>Web Interface:</b> ${process.env.NEXT_PUBLIC_API_URL}
`)
    }
  }

  async handleTextMessage(message: TelegramMessage, user: any) {
    await this.sendMessage(message.chat.id, `
?? <b>Message Received</b>

Use commands to interact with the bot. Type /help for available commands.

?? For full features, use the web interface.
`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '? Help', callback_data: 'help_show' },
            { text: '?? Web App', url: process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com' }
          ]
        ]
      }
    })

    await this.logActivity(user.id, 'telegram_message', message.text || 'Text message')
  }

  async processCallbackQuery(callback: TelegramCallbackQuery) {
    const user = await this.getUserFromDatabase(callback.from.id.toString())
    
    if (!user || user.status !== 'active') {
      await this.answerCallbackQuery(callback.id, '?? Access denied. Please register first.')
      return
    }

    await this.handleCallbackQuery(callback, user)
  }
}

// =================== ENHANCED WEBHOOK ENDPOINT ===================

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token')

    if (process.env.NODE_ENV === 'production' && signature !== webhookSecret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const update: TelegramUpdate = await request.json()
    
    // Process with enhanced bot
    const bot = new EnhancedTelegramBot()
    await bot.processUpdate(update)

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error("Enhanced webhook error:", error)
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// GET endpoint for health check
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: "Enhanced Telegram webhook endpoint is active",
    status: "ok",
    timestamp: new Date().toISOString(),
    features: [
      "Full command processing",
      "User authentication", 
      "Task management",
      "File uploads",
      "Activity logging",
      "Database integration"
    ]
  })
}