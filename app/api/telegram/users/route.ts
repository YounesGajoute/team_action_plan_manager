export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const db = await openDb()
    
    // Get users connected to bot with activity stats
    const botUsers = await db.all(`
      SELECT 
        u.id,
        u.telegram_id,
        u.full_name,
        u.username,
        u.status,
        u.role,
        u.created_at,
        COUNT(al.id) as message_count,
        MAX(al.created_at) as last_activity
      FROM users u
      LEFT JOIN activity_logs al ON u.id = al.user_id AND al.activity_type LIKE 'telegram_%'
      WHERE u.telegram_id IS NOT NULL
      GROUP BY u.id
      ORDER BY last_activity DESC NULLS LAST
    `)

    await db.close()

    return NextResponse.json({ users: botUsers })

  } catch (error) {
    console.error("Bot users fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}