// hooks/use-telegram.ts
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface TelegramUser {
  id: number
  telegram_id: string
  username: string
  full_name: string
  status: 'pending' | 'active' | 'inactive'
  role: string
  created_at: string
}

interface BotStats {
  active_users: number
  total_activities: number
  today_activities: number
  commands_today: number
  files_uploaded: number
  tasks_created: number
  bot_status: 'online' | 'offline' | 'error'
}

export function useTelegram() {
  const [botStats, setBotStats] = useState<BotStats | null>(null)
  const [pendingUsers, setPendingUsers] = useState<TelegramUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchBotStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch bot stats`)
      }

      const data = await response.json()
      setBotStats(data.stats)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch bot stats:', err)
    }
  }, [])

  const fetchPendingUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/pending-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch pending users`)
      }

      const data = await response.json()
      setPendingUsers(data.users || [])
    } catch (err: any) {
      console.error('Failed to fetch pending users:', err)
    }
  }, [])

  const approveUser = useCallback(async (userId: number, role: string = 'technician') => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/approve-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to approve user')
      }

      const result = await response.json()
      
      toast({
        title: 'User Approved',
        description: result.message || 'User has been approved successfully',
      })

      // Refresh pending users list
      await fetchPendingUsers()
      await fetchBotStats()

      return true
    } catch (err: any) {
      toast({
        title: 'Approval Failed',
        description: err.message,
        variant: 'destructive',
      })
      return false
    }
  }, [fetchPendingUsers, fetchBotStats, toast])

  const rejectUser = useCallback(async (userId: number, reason?: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/reject-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, reason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to reject user')
      }

      const result = await response.json()
      
      toast({
        title: 'User Rejected',
        description: result.message || 'User registration has been rejected',
      })

      // Refresh pending users list
      await fetchPendingUsers()

      return true
    } catch (err: any) {
      toast({
        title: 'Rejection Failed',
        description: err.message,
        variant: 'destructive',
      })
      return false
    }
  }, [fetchPendingUsers, toast])

  const sendBotCommand = useCallback(async (command: string, parameters: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/send-command', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, parameters }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send command')
      }

      const result = await response.json()
      
      toast({
        title: 'Command Sent',
        description: result.message || 'Command executed successfully',
      })

      // Refresh stats after command
      setTimeout(fetchBotStats, 1000)

      return result
    } catch (err: any) {
      toast({
        title: 'Command Failed',
        description: err.message,
        variant: 'destructive',
      })
      throw err
    }
  }, [fetchBotStats, toast])

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchBotStats(), fetchPendingUsers()])
    } finally {
      setIsLoading(false)
    }
  }, [fetchBotStats, fetchPendingUsers])

  useEffect(() => {
    refreshData()
    
    // Set up periodic refresh
    const interval = setInterval(fetchBotStats, 30000) // Refresh stats every 30 seconds
    
    return () => clearInterval(interval)
  }, [refreshData, fetchBotStats])

  return {
    botStats,
    pendingUsers,
    isLoading,
    error,
    approveUser,
    rejectUser,
    sendBotCommand,
    refreshData,
  }
}

// hooks/use-bot-activity.ts
interface BotActivity {
  id: number
  user_name: string
  command: string
  activity_type?: string
  description: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
}

export function useBotActivity() {
  const [activities, setActivities] = useState<BotActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/activity', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (err) {
      console.error('Failed to fetch bot activities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    
    // Refresh activities every minute
    const interval = setInterval(fetchActivities, 60000)
    
    return () => clearInterval(interval)
  }, [fetchActivities])

  return {
    activities,
    isLoading,
    refreshActivities: fetchActivities,
  }
}

// Additional API routes needed:

// app/api/telegram/pending-users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { openDb } from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const db = await openDb()
    
    const pendingUsers = await db.all(`
      SELECT id, username, full_name, email, telegram_id, created_at, role
      FROM users 
      WHERE status = 'pending' AND telegram_id IS NOT NULL
      ORDER BY created_at DESC
    `)

    return NextResponse.json({ users: pendingUsers })

  } catch (error) {
    console.error("Pending users error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// app/api/telegram/approve-user/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || user.role !== 'manager') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { userId, role = 'technician' } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      )
    }

    const validRoles = ['manager', 'technician', 'commercial', 'other']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      )
    }

    const db = await openDb()
    
    // Update user status and role
    const result = await db.run(
      'UPDATE users SET status = ?, role = ? WHERE id = ? AND status = ?',
      ['active', role, userId, 'pending']
    )

    if (result.changes === 0) {
      return NextResponse.json(
        { message: "User not found or already processed" },
        { status: 404 }
      )
    }

    // Get user details for notification
    const updatedUser = await db.get(
      'SELECT username, full_name, telegram_id FROM users WHERE id = ?',
      [userId]
    )

    // TODO: Send approval notification to user via Telegram
    // This would require integration with the bot service

    return NextResponse.json({
      message: `User ${updatedUser.full_name} approved as ${role}`,
      user: updatedUser
    })

  } catch (error) {
    console.error("Approve user error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// app/api/telegram/activity/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const db = await openDb()
    
    const activities = await db.all(`
      SELECT 
        al.id,
        u.full_name as user_name,
        al.activity_type,
        al.description,
        al.created_at as timestamp,
        'success' as status,
        ('/' || al.activity_type || ' ' || al.description) as command
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE u.telegram_id IS NOT NULL
        AND al.created_at >= datetime('now', '-24 hours')
      ORDER BY al.created_at DESC
      LIMIT 50
    `)

    return NextResponse.json({ activities })

  } catch (error) {
    console.error("Bot activity error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// Component for managing pending users
// components/telegram/pending-users-manager.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, Clock, User } from 'lucide-react'
import { useTelegram } from '@/hooks/use-telegram'

export function PendingUsersManager() {
  const { pendingUsers, approveUser, rejectUser, isLoading } = useTelegram()
  const [selectedRole, setSelectedRole] = React.useState<Record<number, string>>({})

  const handleApprove = async (userId: number) => {
    const role = selectedRole[userId] || 'technician'
    await approveUser(userId, role)
  }

  const handleRoleChange = (userId: number, role: string) => {
    setSelectedRole(prev => ({ ...prev, [userId]: role }))
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Loading Pending Users...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Pending Telegram Registrations
          <Badge variant="secondary">{pendingUsers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No pending registrations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-600">@{user.username}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  <div className="text-xs text-gray-500">
                    Registered: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedRole[user.id] || 'technician'}
                    onValueChange={(role) => handleRoleChange(user.id, role)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => handleApprove(user.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => rejectUser(user.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}