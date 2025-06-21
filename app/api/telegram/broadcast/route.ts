export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { message, target_users } = await request.json()
    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    // Get target users based on selection
    let users
    if (target_users === 'all') {
      users = await db.all(`
        SELECT telegram_id, full_name FROM users 
        WHERE telegram_id IS NOT NULL AND status = 'active'
      `)
    } else if (Array.isArray(target_users)) {
      const placeholders = target_users.map(() => '?').join(',')
      users = await db.all(`
        SELECT telegram_id, full_name FROM users 
        WHERE telegram_id IS NOT NULL AND status = 'active' 
        AND role IN (${placeholders})
      `, target_users)
    } else {
      users = await db.all(`
        SELECT telegram_id, full_name FROM users 
        WHERE telegram_id IS NOT NULL AND status = 'active' 
        AND role = ?
      `, [target_users])
    }

    let sentCount = 0
    let failedCount = 0
    
    // Send message to each user
    for (const targetUser of users) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetUser.telegram_id,
            text: `?? <b>Broadcast Message</b>\n\n${message}`,
            parse_mode: 'HTML'
          })
        })

        const result = await response.json()
        if (result.ok) {
          sentCount++
        } else {
          failedCount++
          console.error(`Failed to send to ${targetUser.telegram_id}:`, result.description)
        }
      } catch (error) {
        failedCount++
        console.error(`Error sending to ${targetUser.telegram_id}:`, error)
      }
    }

    // Log broadcast activity
    await db.run(`
      INSERT INTO activity_logs (
        user_id, activity_type, description, start_time, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user.id,
      'broadcast_message',
      `Sent broadcast to ${sentCount} users: "${message.substring(0, 50)}..."`,
      new Date().toISOString(),
      new Date().toISOString()
    ])

    await db.close()

    return NextResponse.json({ 
      sent_count: sentCount,
      failed_count: failedCount,
      total_users: users.length
    })

  } catch (error) {
    console.error("Broadcast error:", error)
    return NextResponse.json({ 
      error: 'Failed to send broadcast' 
    }, { status: 500 })
  }
}