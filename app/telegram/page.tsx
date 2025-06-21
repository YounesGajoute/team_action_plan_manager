"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageSquare, Send, Bot, Users, FileText, Camera, Clock, CheckCircle, 
  RefreshCw, AlertCircle, TrendingUp, Activity, Zap, ExternalLink, Copy
} from "lucide-react"
import ProtectedRoute from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface BotStats {
  active_users: number
  total_activities: number
  today_activities: number
  commands_today: number
  files_uploaded: number
  tasks_created: number
  bot_status: 'online' | 'offline' | 'error'
}

interface BotActivity {
  id: number
  user_name: string
  command: string
  activity_type?: string
  description: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
}

interface CommandExample {
  cmd: string
  desc: string
  params: string
  example?: string
}

export default function TelegramInterface() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedCommand, setSelectedCommand] = useState("")
  const [commandParams, setCommandParams] = useState("")
  const [botStats, setBotStats] = useState<BotStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<BotActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState("")

  const botCommands = [
    {
      category: "Task Management",
      icon: FileText,
      commands: [
        { 
          cmd: "/newtask", 
          desc: "Create a new task", 
          params: "Interactive wizard",
          example: "/newtask"
        },
        { 
          cmd: "/mytasks", 
          desc: "Show your assigned tasks", 
          params: "[status]",
          example: "/mytasks in_progress"
        },
        { 
          cmd: "/status", 
          desc: "Update task status", 
          params: "<task_id> <status>",
          example: "/status TA001 in_progress"
        },
        { 
          cmd: "/notes", 
          desc: "Add note to task", 
          params: "<task_id> <note>",
          example: "/notes TA001 Equipment installed successfully"
        },
      ],
    },
    {
      category: "Activity Logging", 
      icon: Activity,
      commands: [
        { 
          cmd: "/activity", 
          desc: "Log work activity", 
          params: "<type> <description>",
          example: "/activity customer_visit Working at Aptive Tanger"
        },
        { 
          cmd: "/travel", 
          desc: "Set travel period", 
          params: "<start> <end> <city>",
          example: "/travel 2025-01-16 2025-01-17 Casablanca"
        },
        { 
          cmd: "/absent", 
          desc: "Set absence period", 
          params: "<start> <end> <reason>",
          example: "/absent 2025-01-20 2025-01-21 Medical appointment"
        },
      ],
    },
    {
      category: "File Management",
      icon: Camera,
      commands: [
        { 
          cmd: "/upload", 
          desc: "Upload file to task", 
          params: "<task_id> [description]",
          example: "/upload TA001 Equipment photo"
        },
        { 
          cmd: "/files", 
          desc: "List task files", 
          params: "<task_id>",
          example: "/files TA001"
        },
      ],
    },
    {
      category: "System Commands",
      icon: Users,
      commands: [
        { 
          cmd: "/register", 
          desc: "Register for system access", 
          params: "None",
          example: "/register"
        },
        { 
          cmd: "/help", 
          desc: "Show available commands", 
          params: "None",
          example: "/help"
        },
        ...(user?.role === "manager" ? [
          { 
            cmd: "/approve", 
            desc: "Approve user registration", 
            params: "<username> [role]",
            example: "/approve john_doe technician"
          },
          { 
            cmd: "/users", 
            desc: "List pending users", 
            params: "None",
            example: "/users"
          },
        ] : []),
      ],
    },
  ]

  useEffect(() => {
    loadBotData()
    // Refresh data every 30 seconds
    const interval = setInterval(loadBotData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadBotData = async () => {
    try {
      setIsRefreshing(true)
      setError("")
      
      const token = localStorage.getItem("authToken")
      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch("/api/telegram/stats", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed")
        }
        throw new Error(`HTTP ${response.status}: Failed to load bot data`)
      }

      const data = await response.json()
      setBotStats(data.stats || {
        active_users: 0,
        total_activities: 0,
        today_activities: 0,
        commands_today: 0,
        files_uploaded: 0,
        tasks_created: 0,
        bot_status: 'offline'
      })
      setRecentActivity(data.recentActivity || [])
    } catch (error: any) {
      console.error("Failed to load bot data:", error)
      setError(error.message || "Failed to load bot statistics")
      
      // Use fallback data for demo
      setBotStats({
        active_users: 12,
        total_activities: 156,
        today_activities: 23,
        commands_today: 156,
        files_uploaded: 23,
        tasks_created: 8,
        bot_status: 'offline'
      })
      setRecentActivity([
        {
          id: 1,
          user_name: "Ahmed Benali",
          command: "/activity customer_visit Working at Aptive Tanger",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: "success",
          description: "Working at Aptive Tanger"
        },
        {
          id: 2,
          user_name: "Mohamed Alami", 
          command: "/upload TA002 Equipment photo",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: "success",
          description: "Equipment photo uploaded"
        }
      ])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleSendCommand = async () => {
    if (!selectedCommand || !commandParams.trim()) {
      toast({
        title: "Invalid Command",
        description: "Please select a command and provide parameters.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch("/api/telegram/send-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          command: selectedCommand,
          parameters: commandParams,
          user_id: user?.id,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Command Sent",
          description: result.message || `Command ${selectedCommand} executed successfully.`,
        })
        setSelectedCommand("")
        setCommandParams("")
        // Refresh data to show new activity
        setTimeout(loadBotData, 1000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to send command")
      }
    } catch (error: any) {
      toast({
        title: "Command Failed",
        description: error.message || "Failed to execute command. Please try again.",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Command copied to clipboard",
    })
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

  const getSelectedCommandExample = () => {
    for (const category of botCommands) {
      const command = category.commands.find(cmd => cmd.cmd === selectedCommand)
      if (command?.example) {
        return command.example
      }
    }
    return ""
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Telegram interface...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Telegram Bot Interface</h1>
                <div className="flex items-center gap-4">
                  <p className="text-gray-600">Manage tasks and activities through Telegram commands</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${botStats?.bot_status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-medium ${getBotStatusColor(botStats?.bot_status || 'offline')}`}>
                      Bot {botStats?.bot_status || 'offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={loadBotData} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://t.me/your_bot_username', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Bot
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Bot Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commands Today</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{botStats?.commands_today || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{botStats?.today_activities || 0} from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{botStats?.active_users || 0}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Files Uploaded</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{botStats?.files_uploaded || 0}</div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Created</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{botStats?.tasks_created || 0}</div>
                <p className="text-xs text-muted-foreground">Via Telegram</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bot Commands Reference */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Available Commands
                  </CardTitle>
                  <CardDescription>Complete list of Telegram bot commands by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {botCommands.map((category, index) => {
                      const IconComponent = category.icon
                      return (
                        <div key={index}>
                          <h3 className="font-semibold text-lg mb-3 text-blue-600 flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {category.category}
                          </h3>
                          <div className="space-y-3">
                            {category.commands.map((command, cmdIndex) => (
                              <div key={cmdIndex} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">
                                        {command.cmd}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(command.example || command.cmd)}
                                        className="p-1 h-6 w-6"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{command.desc}</p>
                                    <p className="text-xs text-gray-500">Parameters: {command.params}</p>
                                    {command.example && (
                                      <p className="text-xs text-green-600 mt-1">Example: {command.example}</p>
                                    )}
                                  </div>
                                  <Button 
                                    variant="outline" 
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
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Command Tester & Activity */}
            <div className="space-y-6">
              {/* Command Tester */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Test Commands
                  </CardTitle>
                  <CardDescription>Test Telegram bot commands directly from the web interface</CardDescription>
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
                        )),
                      )}
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Enter command parameters..."
                    value={commandParams}
                    onChange={(e) => setCommandParams(e.target.value)}
                    rows={2}
                  />

                  <div className="flex gap-2">
                    <Button onClick={handleSendCommand} className="flex-1">
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
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Command Preview:</p>
                      <code className="text-sm block mb-2">
                        {selectedCommand} {commandParams}
                      </code>
                      {getSelectedCommandExample() && (
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Example:</p>
                          <code className="text-xs text-green-600">{getSelectedCommandExample()}</code>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Bot Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Bot Activity
                  </CardTitle>
                  <CardDescription>Latest commands executed through Telegram</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
                        <p className="text-xs">Bot commands will appear here</p>
                      </div>
                    ) : (
                      recentActivity.map((activity, index) => (
                        <div key={activity.id || index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.status === 'success' ? 'bg-green-100' : 
                            activity.status === 'error' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            <CheckCircle className={`h-4 w-4 ${
                              activity.status === 'success' ? 'text-green-600' :
                              activity.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{activity.user_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {activity.status}
                              </Badge>
                            </div>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded block mb-1">
                              {activity.command}
                            </code>
                            <div className="text-xs text-gray-500">
                              {formatTimestamp(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Usage Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                How to Use the Telegram Bot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Register</h3>
                  <p className="text-sm text-gray-600">Send /register to the bot to request access to the system</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Create Tasks</h3>
                  <p className="text-sm text-gray-600">Use /newtask to create tasks or manage existing ones</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Camera className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Upload Files</h3>
                  <p className="text-sm text-gray-600">Send photos, videos, or documents with /upload command</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">4. Track Activity</h3>
                  <p className="text-sm text-gray-600">Log your work activities and travel with /activity and /travel</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}