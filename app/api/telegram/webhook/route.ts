import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    const signature = request.headers.get('X-Telegram-Bot-Api-Secret-Token')

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && signature !== webhookSecret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const update = await request.json()
    
    // Process Telegram webhook update
    await processTelegramUpdate(update)

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

async function processTelegramUpdate(update: any) {
  const db = await openDb()
  
  try {
    if (update.message) {
      const message = update.message
      const telegramId = message.from.id.toString()
      const text = message.text || ''
      
      // Log the incoming message
      console.log(`Received message from ${telegramId}: ${text}`)
      
      // Find user by Telegram ID
      const user = await db.get(
        'SELECT * FROM users WHERE telegram_id = ? AND status = "active"',
        [telegramId]
      )

      if (user && text.startsWith('/')) {
        // Log bot command activity
        await db.run(`
          INSERT INTO activity_logs (
            user_id, activity_type, description, start_time, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          user.id,
          'telegram_command',
          text,
          new Date().toISOString(),
          new Date().toISOString()
        ])
      }
    }
  } catch (error) {
    console.error("Error processing telegram update:", error)
  } finally {
    // Note: We should handle database connection properly in your database module
    // For now, we'll leave it open as closing might be handled elsewhere
  }
}