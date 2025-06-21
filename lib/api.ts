const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("authToken")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}/api${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "An error occurred" }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Tasks
  async getTasks(filters?: {
    status?: string
    city?: string
    search?: string
    assigned_to?: string
  }) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    return this.request<{ tasks: any[] }>(`/tasks?${params}`)
  }

  async getTask(id: string) {
    return this.request<{ task: any }>(`/tasks/${id}`)
  }

  async createTask(taskData: any) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData)
    })
  }

  async updateTask(id: string, taskData: any) {
    return this.request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(taskData)
    })
  }

  // Users
  async getUsers() {
    return this.request<{ users: any[] }>("/users")
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<{
      taskStats: any
      teamStats: any[]
    }>("/dashboard/stats")
  }
}

export const apiClient = new ApiClient()