// hooks/use-telegram.ts
import { useState, useEffect, useCallback } from 'react'

interface BotStats {
  bot_status: 'online' | 'offline' | 'error'
  active_users: number
  total_activities: number
  today_activities: number
  commands_today: number
  files_uploaded: number
  tasks_created: number
  response_time: number
  uptime: string
}

interface PendingUser {
  id: number
  username: string
  full_name: string
  email: string
  telegram_id: string
  created_at: string
  requested_role: string
  phone?: string
}

interface BotActivity {
  id: number
  user_name: string
  user_role: string
  command: string
  activity_type: string
  description: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
}

interface UseTelegramOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useTelegram(options: UseTelegramOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options
  
  const [botStats, setBotStats] = useState<BotStats | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [recentActivity, setRecentActivity] = useState<BotActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch bot statistics
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
        throw new Error('Failed to fetch bot stats')
      }

      const data = await response.json()
      setBotStats(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch bot stats:', err)
    }
  }, [])

  // Fetch pending users
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
        throw new Error('Failed to fetch pending users')
      }

      const data = await response.json()
      setPendingUsers(data.users || [])
    } catch (err: any) {
      console.error('Failed to fetch pending users:', err)
    }
  }, [])

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async (filters: {
    type?: string
    range?: string
    role?: string
    limit?: number
  } = {}) => {
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/telegram/activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }

      const data = await response.json()
      setRecentActivity(data.activities || [])
    } catch (err: any) {
      console.error('Failed to fetch activity:', err)
    }
  }, [])

  // Approve user
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
      
      // Refresh data
      await Promise.all([fetchPendingUsers(), fetchBotStats()])
      
      return { success: true, message: result.message }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchPendingUsers, fetchBotStats])

  // Reject user
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
      
      // Refresh data
      await fetchPendingUsers()
      
      return { success: true, message: result.message }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchPendingUsers])

  // Send bot command
  const sendBotCommand = useCallback(async (command: string, parameters: string = '', targetUserId?: number) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/send-command', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, parameters, target_user_id: targetUserId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send command')
      }

      const result = await response.json()
      
      // Refresh activity data
      setTimeout(() => {
        fetchRecentActivity()
        fetchBotStats()
      }, 1000)
      
      return { success: true, message: result.message, result: result.result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchRecentActivity, fetchBotStats])

  // Send broadcast message
  const sendBroadcast = useCallback(async (message: string, targetRole: string = 'all', urgent: boolean = false) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, target_role: targetRole, urgent }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send broadcast')
      }

      const result = await response.json()
      
      // Refresh activity data
      setTimeout(() => {
        fetchRecentActivity()
        fetchBotStats()
      }, 1000)
      
      return { success: true, message: result.message, stats: result.stats }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchRecentActivity, fetchBotStats])

  // Refresh all data
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchBotStats(),
        fetchPendingUsers(),
        fetchRecentActivity()
      ])
    } finally {
      setIsLoading(false)
    }
  }, [fetchBotStats, fetchPendingUsers, fetchRecentActivity])

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchBotStats()
      fetchRecentActivity()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchBotStats, fetchRecentActivity])

  return {
    // Data
    botStats,
    pendingUsers,
    recentActivity,
    isLoading,
    error,
    
    // Actions
    approveUser,
    rejectUser,
    sendBotCommand,
    sendBroadcast,
    refreshData,
    
    // Fetch functions for manual control
    fetchBotStats,
    fetchPendingUsers,
    fetchRecentActivity: (filters?: any) => fetchRecentActivity(filters),
  }
}

// Hook for real-time activity monitoring
export function useBotActivity(filters: {
  type?: string
  range?: string
  role?: string
  limit?: number
} = {}) {
  const [activities, setActivities] = useState<BotActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/telegram/activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }

      const data = await response.json()
      setActivities(data.activities || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch activities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchActivities()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000)
    
    return () => clearInterval(interval)
  }, [fetchActivities])

  return {
    activities,
    isLoading,
    error,
    refreshActivities: fetchActivities,
  }
}

// Hook for managing bot configuration
export function useBotConfig() {
  const [config, setConfig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bot config')
      }

      const data = await response.json()
      setConfig(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch bot config:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateConfig = useCallback(async (newConfig: any) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update config')
      }

      const result = await response.json()
      setConfig(result.config)
      
      return { success: true, message: result.message }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  const restartBot = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/restart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to restart bot')
      }

      const result = await response.json()
      
      return { success: true, message: result.message }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  return {
    config,
    isLoading,
    error,
    updateConfig,
    restartBot,
    refreshConfig: fetchConfig,
  }
}

// Utility functions for formatting and validation
export const telegramUtils = {
  formatTimestamp: (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  },

  formatDuration: (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  },

  getBotStatusColor: (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'offline': return 'text-red-600'
      case 'error': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  },

  getActivityIcon: (activityType: string) => {
    switch (activityType) {
      case 'telegram_command': return '??'
      case 'file_upload': return '??'
      case 'task_update': return '?'
      case 'user_management': return '??'
      case 'broadcast': return '??'
      default: return '??'
    }
  },

  validateCommand: (command: string) => {
    const validCommands = [
      '/start', '/help', '/register', '/newtask', '/mytasks', 
      '/status', '/notes', '/activity', '/travel', '/absent', 
      '/upload', '/files'
    ]
    
    return validCommands.includes(command) || command.startsWith('/')
  },

  parseCommand: (commandString: string) => {
    const parts = commandString.trim().split(' ')
    const command = parts[0]
    const parameters = parts.slice(1).join(' ')
    
    return { command, parameters }
  }
}