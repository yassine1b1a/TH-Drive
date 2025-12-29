"use client"

import { useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { aiClient } from "@/lib/ai/client"

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface UseChatOptions {
  api?: string
  body?: {
    userId: string
    context?: 'driver' | 'rider'
  }
  onFinish?: (message: { content: string }) => Promise<void>
  systemPrompt?: string
}

export function useMimoChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | string) => {
    if (typeof e === 'string') {
      setInput(e)
    } else {
      setInput(e.target.value)
    }
  }, [])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput("")

    try {
      // Save user message to database
      if (options.body?.userId) {
        const supabase = createClient()
        await supabase.from("support_messages").insert({
          user_id: options.body.userId,
          message: currentInput,
          is_from_user: true,
          is_ai_response: false,
          context: options.body.context || 'driver'
        })
      }

      // Prepare messages for AI
      const aiMessages: ChatMessage[] = []
      
      // Add system prompt based on context
      if (options.body?.context === 'driver') {
        aiMessages.push({
          id: 'system',
          role: 'system',
          content: options.systemPrompt || `You are a helpful driver support assistant for TH-Drive ride-sharing service. 
          Help drivers with: earnings calculation, navigation issues, passenger reports, account management, 
          vehicle issues, and platform features. Be professional, concise, and supportive. 
          If you don't know something, suggest contacting driver-support@th-drive.com for urgent issues.`
        })
      } else {
        aiMessages.push({
          id: 'system',
          role: 'system',
          content: options.systemPrompt || `You are a helpful rider support assistant for TH-Drive ride-sharing service.
          Help riders with: booking rides, payment issues, rating drivers, reporting problems, 
          account questions, and safety concerns. Be friendly, helpful, and efficient.
          If you don't know something, suggest contacting support@th-drive.com for urgent issues.`
        })
      }

      // Add previous messages (last 10 for context)
      const recentMessages = messages.slice(-10)
      aiMessages.push(...recentMessages, userMessage)

      // Call MiMo AI
      const response = await aiClient.chat(
        aiMessages.map(msg => ({ role: msg.role, content: msg.content })),
        {
          model: 'MiMo-V2-Flash',
          temperature: 0.7,
          maxTokens: 800
        }
      )

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.content,
      }

      setMessages(prev => [...prev, aiMessage])

      // Save AI response to database
      if (options.body?.userId) {
        const supabase = createClient()
        await supabase.from("support_messages").insert({
          user_id: options.body.userId,
          message: response.content,
          is_from_user: false,
          is_ai_response: true,
          context: options.body.context || 'driver',
          tokens_used: response.usage?.total_tokens
        })
      }

      // Call onFinish callback
      if (options.onFinish) {
        await options.onFinish({ content: response.content })
      }

    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        console.log('Request aborted')
        return
      }
      
      console.error('Chat error:', err)
      setError(err)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment or contact support directly.",
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [input, isLoading, messages, options])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  const setInputValue = useCallback((value: string) => {
    setInput(value)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const append = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `${message.role}_${Date.now()}`
    }
    setMessages(prev => [...prev, newMessage])
  }, [])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    setInput: setInputValue,
    clearMessages,
    append,
  }
}