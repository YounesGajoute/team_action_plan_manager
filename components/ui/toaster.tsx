"use client"

import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50">
      {toasts.map((toast, index) => (
        <div
          key={index}
          className="mb-2 max-w-sm rounded-lg border bg-white p-4 shadow-lg"
        >
          {toast.title && <div className="font-semibold">{toast.title}</div>}
          {toast.description && <div className="text-sm text-gray-600">{toast.description}</div>}
        </div>
      ))}
    </div>
  )
}