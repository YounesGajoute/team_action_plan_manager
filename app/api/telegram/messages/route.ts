export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const db = await openDb()
    
    // Get recent telegram messages/activities
    const messages = await db.all(`
      SELECT 
        al.id,
        u.full_name as user_name,
        u.telegram_id as user_id,
        al.activity_type as message_type,
        al.description as content,
        al.created_at as timestamp,
        'success' as status,
        null as response
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.activity_type LIKE 'telegram_%'
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [limit])

    await db.close()

    return NextResponse.json({ messages })

  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}