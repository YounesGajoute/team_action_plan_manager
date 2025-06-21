export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    
    // Delete current webhook
    const deleteResponse = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drop_pending_updates: true
      })
    })

    const deleteData = await deleteResponse.json()
    
    if (!deleteData.ok) {
      return NextResponse.json({ 
        success: false, 
        error: deleteData.description 
      }, { status: 400 })
    }

    // Wait a moment then reset webhook
    await new Promise(resolve => setTimeout(resolve, 1000))

    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/telegram/webhook`
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET!

    const setResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    })
    
    const setData = await setResponse.json()
    
    if (setData.ok) {
      // Log restart activity
      const db = await openDb()
      await db.run(`
        INSERT INTO activity_logs (
          user_id, activity_type, description, start_time, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        user.id,
        'bot_restart',
        'Bot webhook restarted from dashboard',
        new Date().toISOString(),
        new Date().toISOString()
      ])
      await db.close()

      return NextResponse.json({ 
        success: true,
        description: 'Bot restarted successfully',
        webhook_url: webhookUrl
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: setData.description 
    }, { status: 400 })

  } catch (error) {
    console.error("Bot restart error:", error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to restart bot' 
    }, { status: 500 })
  }
}