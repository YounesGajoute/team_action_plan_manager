"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  FileText,
  Camera,
  MessageSquare,
  Plane,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"

export default function TaskDetail() {
  const params = useParams()
  const taskId = params.id as string

  const [newNote, setNewNote] = useState("")
  const [taskStatus, setTaskStatus] = useState("in_progress")

  // Mock task data - in real implementation, fetch based on taskId
  const task = {
    id: taskId,
    description: "Install new equipment at customer site",
    customer: "Aptive Tanger Freezone",
    city: "Tanger",
    area: "Freezone",
    status: "in_progress",
    priority: "high",
    assignedTo: ["Ahmed Benali", "Mohamed Alami"],
    travelRequired: false,
    createdAt: "2025-01-15 09:30:00",
    category: "Installation",
    estimatedHours: 8,
    actualHours: 4.5,
    companyType: "SARL",
    createdBy: "Manager",
    notes: [
      {
        id: 1,
        user: "Ahmed Benali",
        timestamp: "2025-01-15 10:00:00",
        text: "Started equipment inspection. All components present.",
        type: "general",
      },
      {
        id: 2,
        user: "System",
        timestamp: "2025-01-15 11:30:00",
        text: "Status changed from 'To Do' to 'In Progress'",
        type: "status_change",
      },
    ],
    files: [
      {
        id: 1,
        name: "equipment_photo_1.jpg",
        type: "photo",
        uploadedBy: "Ahmed Benali",
        uploadedAt: "2025-01-15 10:15:00",
        description: "Equipment arrival photo",
      },
      {
        id: 2,
        name: "installation_manual.pdf",
        type: "document",
        uploadedBy: "Mohamed Alami",
        uploadedAt: "2025-01-15 09:45:00",
        description: "Technical installation guide",
      },
    ],
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "blocked":
        return "bg-red-100 text-red-800"
      case "to_do":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "normal":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleAddNote = () => {
    if (newNote.trim()) {
      // In real implementation, this would call an API
      console.log("Adding note:", newNote)
      setNewNote("")
    }
  }

  const handleStatusUpdate = () => {
    // In real implementation, this would call an API
    console.log("Updating status to:", taskStatus)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                  {task.id}
                </Badge>
                <div className={`w-4 h-4 rounded-full ${getPriorityColor(task.priority)}`} />
                <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ").toUpperCase()}</Badge>
                {task.travelRequired && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Plane className="h-3 w-3 mr-1" />
                    Travel Required
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.description}</h1>

              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {task.customer}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {task.assignedTo.join(", ")}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Created {task.createdAt}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">Edit Task</Button>
              <Button>Complete Task</Button>
            </div>
          </div>
        </div>

        {/* Task Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time Spent</span>
                  <span>
                    {task.actualHours}h / {task.estimatedHours}h
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(task.actualHours / task.estimatedHours) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="font-medium">
                  {task.city} - {task.area}
                </div>
                <div className="text-sm text-gray-600">{task.companyType} Company</div>
                <div className="text-sm text-gray-600">
                  {task.travelRequired ? "Travel Required" : "Local (Tanger)"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="font-medium">{task.category}</div>
                <div className="text-sm text-gray-600">Priority: {task.priority}</div>
                <div className="text-sm text-gray-600">Created by: {task.createdBy}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes & Updates</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                  <CardDescription>Change the current status of this task</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to_do">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleStatusUpdate} className="w-full">
                    Update Status
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common actions for this task</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo via Telegram
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Customer
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Note</CardTitle>
                <CardDescription>Add updates, observations, or important information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote}>Add Note</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.notes.map((note) => (
                    <div key={note.id} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{note.user}</span>
                        <span className="text-sm text-gray-500">{note.timestamp}</span>
                        {note.type === "status_change" && (
                          <Badge variant="secondary" className="text-xs">
                            Status Change
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700">{note.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files</CardTitle>
                <CardDescription>Files uploaded via Telegram and organized in OneDrive</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {file.type === "photo" ? (
                          <Camera className="h-8 w-8 text-blue-600" />
                        ) : (
                          <FileText className="h-8 w-8 text-green-600" />
                        )}
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-gray-600">
                            {file.description} • Uploaded by {file.uploadedBy}
                          </div>
                          <div className="text-xs text-gray-500">{file.uploadedAt}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Upload Files via Telegram</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Use the Telegram bot to upload photos, videos, or documents:
                  </p>
                  <code className="bg-white px-2 py-1 rounded text-sm">/upload {task.id} "Description of file"</code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Complete history of all actions on this task</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Task created</div>
                      <div className="text-sm text-gray-600">Created by Manager • {task.createdAt}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Assigned to technicians</div>
                      <div className="text-sm text-gray-600">
                        Assigned to Ahmed Benali, Mohamed Alami • 2025-01-15 09:35:00
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Status changed to In Progress</div>
                      <div className="text-sm text-gray-600">Changed by Ahmed Benali • 2025-01-15 11:30:00</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
