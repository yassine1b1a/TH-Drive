"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Loader2, Sparkles, DollarSign, Navigation, AlertTriangle, HelpCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  message: string
  is_from_user: boolean
  is_ai_response: boolean
  created_at: string
}

interface DriverSupportChatProps {
  userId: string
}

const quickActions = [
  { icon: Navigation, label: "Navigation Help", message: "How do I use the navigation features?" },
  { icon: DollarSign, label: "Earnings", message: "How are my earnings calculated?" },
  { icon: AlertTriangle, label: "Report Passenger", message: "I need to report an issue with a passenger" },
  { icon: HelpCircle, label: "Account Help", message: "I have questions about my driver account" },
]

class MiMoAIClient {
  private apiKey: string
  private baseURL = 'https://api.mi.mo/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(messages: Array<{role: 'user' | 'assistant' | 'system', content: string}>, options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}) {
    try {
      const request = {
        model: options.model || 'allenai/olmo-3.1-32b-think:free',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
        stream: false
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AI API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI')
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage
      }
    } catch (error) {
      console.error('AI chat error:', error)
      throw error
    }
  }
}

const aiClient = new MiMoAIClient('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')

export function DriverSupportChat({ userId }: DriverSupportChatProps) {
  const [savedMessages, setSavedMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string}>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [aiMessages, savedMessages])

  const loadMessages = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      if (data) {
        setSavedMessages(data)
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleQuickAction = (message: string) => {
    setInput(message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const supabase = createClient()
    const { data: savedUserMessage } = await supabase
      .from("support_messages")
      .insert({
        user_id: userId,
        message: input,
        is_from_user: true,
        is_ai_response: false,
      })
      .select()
      .single()

    if (savedUserMessage) {
      setSavedMessages((prev) => [...prev, savedUserMessage])
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: input
    }
    setAiMessages(prev => [...prev, userMessage])
    
    setIsLoading(true)
    try {
      const messagesForAI = [
        {
          role: 'system' as const,
          content: 'You are a helpful support assistant for TH-Drive driver support. Help drivers with earnings, navigation, passenger issues, account management, and driver-specific questions.'
        },
        ...savedMessages.map(msg => ({
          role: msg.is_from_user ? 'user' as const : 'assistant' as const,
          content: msg.message
        })),
        ...aiMessages.map(msg => ({ role: msg.role, content: msg.content })),
        userMessage
      ]

      const response = await aiClient.chat(messagesForAI, {
        model: 'allenai/olmo-3.1-32b-think:free',
        temperature: 0.7,
        maxTokens: 500
      })

      const aiResponseMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant' as const,
        content: response.content
      }
      setAiMessages(prev => [...prev, aiResponseMessage])

      await supabase.from("support_messages").insert({
        user_id: userId,
        message: response.content,
        is_from_user: false,
        is_ai_response: true,
      })

    } catch (error) {
      console.error('Error getting AI response:', error)
    } finally {
      setIsLoading(false)
      setInput("")
    }
  }

  const allMessages = [
    ...savedMessages.map((m) => ({
      id: m.id,
      role: m.is_from_user ? ("user" as const) : ("assistant" as const),
      content: m.message,
    })),
    ...aiMessages,
  ]

  const uniqueMessages = allMessages.filter(
    (message, index, self) => index === self.findIndex((m) => m.content === message.content && m.role === message.role),
  )

  return (
    <Card className="mx-auto max-w-3xl shadow-lg shadow-primary/5 border-border/50">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <span className="text-lg">Driver Support Assistant</span>
            <p className="text-sm font-normal text-muted-foreground">Powered by MiMo AI - Get help with your driver account</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : uniqueMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center text-center px-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20">
                <Bot className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Driver Support</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Need help with your driver account? I can assist with earnings, navigation, passenger issues, and more.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-sm">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuickAction(action.message)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm font-medium transition-all hover:bg-muted hover:border-accent/50"
                  >
                    <action.icon className="h-4 w-4 text-accent" />
                    {action.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {uniqueMessages.map((message, index) => (
                  <motion.div
                    key={`${message.id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[85%] items-start gap-2 ${
                        message.role === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          message.role === "user" ? "bg-primary" : "bg-accent/20"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <Bot className="h-4 w-4 text-accent" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20">
                      <Bot className="h-4 w-4 text-accent" />
                    </div>
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-xl p-0 shadow-lg shadow-primary/25"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Powered by MiMo AI using allenai/olmo-3.1-32b-think:free model
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
