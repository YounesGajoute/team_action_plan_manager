"use client"

import { useState } from "react"

interface Toast {
  title?: string
  description?: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description }: Toast) => {
    console.log("Toast:", title, description)
    setToasts(prev => [...prev, { title, description }])
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 3000)
  }

  return { toast, toasts }
}