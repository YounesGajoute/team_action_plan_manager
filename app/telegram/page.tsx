"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { 
  Bot, Users, Activity, FileText, Camera, Send, RefreshCw, 
  CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, 
  MessageSquare, Zap, Eye, Copy, Settings, Database,
  UserCheck, UserX, Filter, Search
} from 'lucide-react'

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
}

interface BotActivity {
  id: number
  user_name: string
  command: string
  activity_type: string
  description: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
}

export default function TelegramPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedCommand, setSelectedCommand] = useState("")
  const [commandParams, setCommandParams] = useState("")
  const [botStats, setBotStats] = useState<BotStats | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [recentActivity, setRecentActivity] = useState<BotActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterRole, setFilterRole] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

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

      if (response.ok) {
        const data = await response.json()
        setBotStats(data)
      }
    } catch (err) {
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

      if (response.ok) {
        const data = await response.json()
        setPendingUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch pending users:', err)
    }
  }, [])

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/activity?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentActivity(data.activities || [])
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err)
    }
  }, [])

  // Load all data
  const loadAllData = useCallback(async () => {
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

  // Initial load
  useEffect(() => {
    if (user) {
      loadAllData()
    }
  }, [user, loadAllData])

  // Auto refresh
  useEffect(() => {
    if (autoRefresh && user) {
      const interval = setInterval(() => {
        fetchBotStats()
        fetchRecentActivity()
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, user, fetchBotStats, fetchRecentActivity])

  // Handle user approval
  const handleApproveUser = async (userId: number, role: string) => {
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

      if (response.ok) {
        setPendingUsers(prev => prev.filter(user => user.id !== userId))
        alert(`User approved successfully as ${role}`)
        await fetchBotStats()
      } else {
        alert('Failed to approve user')
      }
    } catch (error) {
      alert('Failed to approve user')
    }
  }

  // Handle user rejection
  const handleRejectUser = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/reject-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setPendingUsers(prev => prev.filter(user => user.id !== userId))
        alert('User rejected successfully')
      } else {
        alert('Failed to reject user')
      }
    } catch (error) {
      alert('Failed to reject user')
    }
  }

  // Handle send command
  const handleSendCommand = async () => {
    if (!selectedCommand) return
    
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/telegram/send-command', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          command: selectedCommand, 
          parameters: commandParams 
        }),
      })

      if (response.ok) {
        alert('Command sent successfully')
        setSelectedCommand("")
        setCommandParams("")
        setTimeout(() => {
          fetchRecentActivity()
          fetchBotStats()
        }, 1000)
      } else {
        alert('Failed to send command')
      }
    } catch (error) {
      alert('Failed to send command')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getBotStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'offline': return 'text-red-600'
      case 'error': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const filteredPendingUsers = pendingUsers.filter(user => {
    const matchesRole = filterRole === "all" || user.requested_role === filterRole
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesRole && matchesSearch
  })

  const botCommands = [
    {
      category: "Task Management",
      commands: [
        { cmd: "/newtask", desc: "Create a new task", example: "/newtask" },
        { cmd: "/mytasks", desc: "Show your assigned tasks", example: "/mytasks in_progress" },
        { cmd: "/status", desc: "Update task status", example: "/status TA001 in_progress" },
        { cmd: "/notes", desc: "Add note to task", example: "/notes TA001 Equipment installed" }
      ]
    },
    {
      category: "Activity Logging",
      commands: [
        { cmd: "/activity", desc: "Log work activity", example: "/activity customer_visit Working at Aptive" },
        { cmd: "/travel", desc: "Set travel period", example: "/travel 2025-01-16 2025-01-17 Casablanca" },
        { cmd: "/absent", desc: "Set absence period", example: "/absent 2025-01-20 2025-01-21 Medical" }
      ]
    },
    {
      category: "File Management",
      commands: [
        { cmd: "/upload", desc: "Upload file to task", example: "/upload TA001 Equipment photo" },
        { cmd: "/files", desc: "List task files", example: "/files TA001" }
      ]
    }
  ]

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Telegram Bot Management</h1>
              <div className="flex items-center gap-4">
                <p className="text-gray-600">Real-time bot monitoring and user management</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${botStats?.bot_status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${getBotStatusColor(botStats?.bot_status || 'offline')}`}>
                    Bot {botStats?.bot_status || 'offline'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  id="auto-refresh"
                />
                <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
              </div>
              <Button 
                onClick={loadAllData} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStats?.active_users || 0}</div>
              <p className="text-xs opacity-90">Connected to bot</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commands Today</CardTitle>
              <Zap className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStats?.commands_today || 0}</div>
              <p className="text-xs opacity-90">Bot interactions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Files Uploaded</CardTitle>
              <Camera className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStats?.files_uploaded || 0}</div>
              <p className="text-xs opacity-90">This week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStats?.response_time || 0}s</div>
              <p className="text-xs opacity-90">Average response</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">
              User Approvals
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bot Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Bot Health Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <Badge variant={botStats?.bot_status === 'online' ? 'default' : 'destructive'}>
                      {botStats?.bot_status || 'offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Uptime</span>
                    <span className="font-medium">{botStats?.uptime || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Activities</span>
                    <span className="font-medium">{botStats?.total_activities || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tasks Created</span>
                    <span className="font-medium">{botStats?.tasks_created || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Broadcast Message
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Export Bot Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Bot Configuration
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart Bot Service
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Bot Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No recent activity</p>
                      <p className="text-sm text-gray-500">Bot activity will appear here</p>
                    </div>
                  ) : (
                    recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <p className="font-medium">{activity.user_name}</p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{activity.command}</Badge>
                          <p className="text-xs text-gray-500 mt-1">{formatTimestamp(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pending Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Pending User Approvals
                  <Badge variant="secondary">{filteredPendingUsers.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Review and approve new user registrations from Telegram
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPendingUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPendingUsers.map((user) => (
                      <div key={user.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{user.full_name}</h3>
                              <Badge variant="outline">@{user.username}</Badge>
                              <Badge variant="secondary">{user.requested_role}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Email:</span> {user.email}
                              </div>
                              <div>
                                <span className="font-medium">Telegram ID:</span> {user.telegram_id}
                              </div>
                              <div>
                                <span className="font-medium">Requested:</span> {formatTimestamp(user.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Select onValueChange={(role) => handleApproveUser(user.id, role)}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Approve as..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="technician">Technician</SelectItem>
                                <SelectItem value="commercial">Commercial</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectUser(user.id)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commands" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Command Reference */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Available Commands
                  </CardTitle>
                  <CardDescription>Complete list of Telegram bot commands</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {botCommands.map((category, index) => (
                      <div key={index}>
                        <h3 className="font-semibold text-lg mb-3 text-blue-600">
                          {category.category}
                        </h3>
                        <div className="space-y-2">
                          {category.commands.map((command, cmdIndex) => (
                            <div key={cmdIndex} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                  {command.cmd}
                                </code>
                                <p className="text-sm text-gray-600 mt-1">{command.desc}</p>
                                {command.example && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Example: <code>{command.example}</code>
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(command.example || command.cmd)
                                    alert('Copied to clipboard!')
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCommand(command.cmd)
                                    if (command.example) {
                                      setCommandParams(command.example.split(' ').slice(1).join(' '))
                                    }
                                  }}
                                >
                                  Use
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Command Tester */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Test Commands
                  </CardTitle>
                  <CardDescription>Execute Telegram bot commands directly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedCommand} onValueChange={setSelectedCommand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a command to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {botCommands.map((category) =>
                        category.commands.map((command) => (
                          <SelectItem key={command.cmd} value={command.cmd}>
                            {command.cmd} - {command.desc}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Enter command parameters..."
                    value={commandParams}
                    onChange={(e) => setCommandParams(e.target.value)}
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSendCommand}
                      disabled={!selectedCommand}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Command
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedCommand("")
                        setCommandParams("")
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  {selectedCommand && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Command:</strong> {selectedCommand}<br />
                        <strong>Parameters:</strong> {commandParams || 'None'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {/* Live Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Feed
                  <Badge variant="outline" className="ml-2">Real-time</Badge>
                </CardTitle>
                <CardDescription>Monitor all bot interactions in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No activity found</p>
                      <p className="text-sm text-gray-500">Bot interactions will appear here</p>
                    </div>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          {activity.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : activity.status === 'error' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{activity.user_name}</span>
                            <span className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {activity.command}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {activity.activity_type}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Activity Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Commands/Hour</span>
                      <span className="font-bold">
                        {recentActivity.length > 0 ? Math.round(recentActivity.length / 24 * 10) / 10 : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Peak Activity</span>
                      <span className="font-bold">2:00 PM - 4:00 PM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Most Active User</span>
                      <span className="font-bold">
                        {recentActivity.length > 0 ? recentActivity[0].user_name : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Success Rate</span>
                      <span className="font-bold text-green-600">
                        {recentActivity.length > 0 
                          ? Math.round((recentActivity.filter(a => a.status === 'success').length / recentActivity.length) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? (
                      recentActivity
                        .reduce((acc: any[], activity) => {
                          const existing = acc.find(u => u.name === activity.user_name)
                          if (existing) {
                            existing.count++
                          } else {
                            acc.push({ name: activity.user_name, count: 1 })
                          }
                          return acc
                        }, [])
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 4)
                        .map((user, index) => {
                          const maxCount = Math.max(...recentActivity.reduce((acc: any[], activity) => {
                            const existing = acc.find(u => u.name === activity.user_name)
                            if (existing) {
                              existing.count++
                            } else {
                              acc.push({ name: activity.user_name, count: 1 })
                            }
                            return acc
                          }, []).map((u: any) => u.count))
                          
                          return (
                            <div key={user.name} className="flex items-center justify-between">
                              <span className="text-sm">{user.name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${Math.min(100, (user.count / maxCount) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{user.count}</span>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No user activity to display</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}