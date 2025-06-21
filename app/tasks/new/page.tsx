"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Users, MapPin, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import ProtectedRoute from "@/components/protected-route"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: number
  full_name: string
  role: string
}

export default function NewTaskPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    task_type: "technical_task",
    category: "",
    description: "",
    customer_name: "",
    customer_city: "",
    customer_area: "",
    company_type: "SARL",
    priority: "normal",
    estimated_hours: "",
    assigned_to: [] as number[],
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await apiClient.getUsers()
      setUsers(data.users.filter(u => u.role === "technician" || u.role === "manager"))
    } catch (error) {
      console.error("Failed to load users:", error)
    }
  }

  const cities = [
    "Tanger", "Kenitra", "Oujda", "Casablanca", "Meknes", "Skhirat", "Ain_Ouda"
  ]

  const categories = [
    "Installation", "Maintenance", "Repair", "Training", "Consultation", 
    "Emergency", "Upgrade", "Inspection", "Other"
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (!formData.category || !formData.description || !formData.customer_name) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    try {
      const response = await apiClient.createTask({
        ...formData,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : [user?.id],
      })

      toast({
        title: "Task created successfully",
        description: `Task ${response.taskCode} has been created and assigned.`,
      })

      router.push("/")
    } catch (error: any) {
      setError(error.message || "Failed to create task")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleUserAssignment = (userId: number, checked: boolean) => {
    if (checked) {
      setFormData({ 
        ...formData, 
        assigned_to: [...formData.assigned_to, userId] 
      })
    } else {
      setFormData({ 
        ...formData, 
        assigned_to: formData.assigned_to.filter(id => id !== userId) 
      })
    }
  }

  const getTravelRequired = () => {
    return formData.customer_city.toLowerCase() !== "tanger"
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Task</h1>
            <p className="text-gray-600">Add a new task to the team's action plan</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Task Information */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Details</CardTitle>
                    <CardDescription>Basic information about the task</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="task_type">Task Type</Label>
                        <Select
                          value={formData.task_type}
                          onValueChange={(value) => handleChange("task_type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical_task">Technical Task</SelectItem>
                            <SelectItem value="support_ticket">Support Ticket</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleChange("category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the task in detail..."
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) => handleChange("priority", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimated_hours">Estimated Hours</Label>
                        <Input
                          id="estimated_hours"
                          type="number"
                          step="0.5"
                          placeholder="e.g., 4.5"
                          value={formData.estimated_hours}
                          onChange={(e) => handleChange("estimated_hours", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Customer Information
                    </CardTitle>
                    <CardDescription>Details about the customer and location</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Customer Name *</Label>
                      <Input
                        id="customer_name"
                        placeholder="Company or customer name"
                        value={formData.customer_name}
                        onChange={(e) => handleChange("customer_name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer_city">City</Label>
                        <Select
                          value={formData.customer_city}
                          onValueChange={(value) => handleChange("customer_city", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer_area">Area/Zone</Label>
                        <Input
                          id="customer_area"
                          placeholder="e.g., Industrial Zone, Downtown"
                          value={formData.customer_area}
                          onChange={(e) => handleChange("customer_area", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company_type">Company Type</Label>
                      <Select
                        value={formData.company_type}
                        onValueChange={(value) => handleChange("company_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SARL">SARL</SelectItem>
                          <SelectItem value="ZF">Zone Franche (ZF)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {getTravelRequired() && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This task requires travel (customer not in Tanger)
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Assignment and Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Task Assignment
                    </CardTitle>
                    <CardDescription>Assign technicians to this task</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {users.map((assignableUser) => (
                        <div key={assignableUser.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${assignableUser.id}`}
                            checked={formData.assigned_to.includes(assignableUser.id)}
                            onCheckedChange={(checked) => 
                              handleUserAssignment(assignableUser.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`user-${assignableUser.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {assignableUser.full_name}
                            <span className="text-xs text-gray-500 ml-2 capitalize">
                              ({assignableUser.role})
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>

                    {formData.assigned_to.length === 0 && (
                      <p className="text-sm text-yellow-600 mt-3">
                        No users selected. Task will be assigned to you by default.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Task...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Task
                        </>
                      )}
                    </Button>

                    <Button type="button" variant="outline" className="w-full" asChild>
                      <Link href="/">Cancel</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Task Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Type:</strong> {formData.task_type.replace("_", " ")}</div>
                    <div><strong>Category:</strong> {formData.category || "Not selected"}</div>
                    <div><strong>Priority:</strong> {formData.priority}</div>
                    <div><strong>Customer:</strong> {formData.customer_name || "Not specified"}</div>
                    <div><strong>Location:</strong> {formData.customer_city || "Not selected"}</div>
                    <div><strong>Travel Required:</strong> {getTravelRequired() ? "Yes" : "No"}</div>
                    <div><strong>Estimated Hours:</strong> {formData.estimated_hours || "Not specified"}</div>
                    <div><strong>Assigned Users:</strong> {formData.assigned_to.length || "Auto-assign"}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  )
}