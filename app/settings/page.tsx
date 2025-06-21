"use client"

import ProtectedRoute from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings, Users, Database, Mail, Bot } from "lucide-react"

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole={["manager"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage system configuration and user accounts</p>
          </div>

          <div className="space-y-6">
            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Pending User Approvals</h4>
                    <p className="text-sm text-gray-600">Review and approve new user registrations</p>
                  </div>
                  <Button>View Pending (2)</Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Active Users</h4>
                    <p className="text-sm text-gray-600">Manage existing user accounts</p>
                  </div>
                  <Button variant="outline">Manage Users</Button>
                </div>
              </CardContent>
            </Card>

            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="home-city">Home Base City</Label>
                    <Input id="home-city" defaultValue="Tanger" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="work-hours">Work Hours per Day</Label>
                    <Input id="work-hours" type="number" defaultValue="8" />
                  </div>
                </div>
                
                <Button>Save Configuration</Button>
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Configuration
                </CardTitle>
                <CardDescription>
                  Configure email settings for notifications and reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-server">SMTP Server</Label>
                    <Input id="smtp-server" defaultValue="smtp.gmail.com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input id="smtp-port" type="number" defaultValue="587" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-username">Email Username</Label>
                    <Input id="email-username" type="email" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="report-recipient">Report Recipient</Label>
                    <Input id="report-recipient" type="email" defaultValue="service.technique@techmac.ma" />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button>Save Email Settings</Button>
                  <Button variant="outline">Test Email</Button>
                </div>
              </CardContent>
            </Card>

            {/* Telegram Bot Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Telegram Bot Configuration
                </CardTitle>
                <CardDescription>
                  Configure Telegram bot integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bot-token">Bot Token</Label>
                  <Input id="bot-token" type="password" placeholder="Enter bot token" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" defaultValue="https://your-domain.com/api/telegram/webhook" />
                </div>
                
                <div className="flex gap-2">
                  <Button>Save Bot Settings</Button>
                  <Button variant="outline">Test Bot Connection</Button>
                </div>
              </CardContent>
            </Card>

            {/* Database Backup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Management
                </CardTitle>
                <CardDescription>
                  Backup and maintenance operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Manual Backup</h4>
                    <p className="text-sm text-gray-600">Create a backup of the current database</p>
                  </div>
                  <Button>Create Backup</Button>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">System Maintenance</h4>
                    <p className="text-sm text-gray-600">Run system maintenance and cleanup</p>
                  </div>
                  <Button variant="outline">Run Maintenance</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}