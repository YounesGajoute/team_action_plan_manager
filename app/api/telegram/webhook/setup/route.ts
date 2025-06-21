export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/telegram/webhook`
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET!
    
    // First delete existing webhook
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
      method: 'POST'
    })

    // Set new webhook
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    })
    
    const data = await response.json()
    
    if (data.ok) {
      return NextResponse.json({ 
        success: true, 
        description: data.description,
        webhook_url: webhookUrl
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: data.description 
    }, { status: 400 })

  } catch (error) {
    console.error("Webhook setup error:", error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to setup webhook' 
    }, { status: 500 })
  }
}