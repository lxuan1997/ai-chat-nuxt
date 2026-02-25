export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  loading?: boolean
  cards?: any[]
  meta?: {
    duration?: number
    mode?: string
  }
  isError?: boolean
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface Document {
  id: string
  title: string
  filename?: string
  size?: number
  type?: string
  chunkCount?: number
  vectorCount?: number
  createdAt?: string
  uploadTime?: Date
  status?: 'uploading' | 'success' | 'error'
}
