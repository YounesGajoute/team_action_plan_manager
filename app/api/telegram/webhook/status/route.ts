export async function GET(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
    const data = await response.json()
    
    if (data.ok) {
      const result = data.result
      return NextResponse.json({
        status: result.url ? 'active' : 'inactive',
        url: result.url,
        pending_updates: result.pending_update_count,
        last_error: result.last_error_message,
        has_custom_certificate: result.has_custom_certificate,
        allowed_updates: result.allowed_updates,
        max_connections: result.max_connections
      })
    }
    
    return NextResponse.json({ 
      status: 'error', 
      error: data.description 
    }, { status: 500 })

  } catch (error) {
    console.error("Webhook status check error:", error)
    return NextResponse.json({ 
      status: 'error', 
      error: 'Failed to check webhook status' 
    }, { status: 500 })
  }
}