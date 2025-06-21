export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    
    // Get bot info to test connection
    const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const botData = await botResponse.json()
    
    if (!botData.ok) {
      return NextResponse.json({ 
        success: false, 
        error: botData.description 
      }, { status: 400 })
    }

    // Send test message to admin (assuming user has telegram_id)
    if (user.telegram_id) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegram_id,
            text: `?? <b>Bot Test Message</b>\n\n? Bot is working correctly!\n\n?? <b>Bot:</b> ${botData.result.first_name}\n?? <b>Time:</b> ${new Date().toLocaleString()}`,
            parse_mode: 'HTML'
          })
        })
      } catch (error) {
        console.warn('Could not send test message to admin:', error)
      }
    }

    return NextResponse.json({ 
      success: true,
      bot_info: {
        id: botData.result.id,
        name: botData.result.first_name,
        username: botData.result.username,
        can_join_groups: botData.result.can_join_groups,
        can_read_all_group_messages: botData.result.can_read_all_group_messages,
        supports_inline_queries: botData.result.supports_inline_queries
      }
    })

  } catch (error) {
    console.error("Bot test error:", error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test bot' 
    }, { status: 500 })
  }
}