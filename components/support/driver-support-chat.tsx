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

// WORKING OpenRouter AI Client
class OpenRouterAIClient {
  private apiKey: string
  private baseURL = 'https://openrouter.ai/api/v1'

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

      console.log('📡 Sending request to OpenRouter:', { 
        model: request.model, 
        messageCount: messages.length 
      })

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://th-drive.thprojects.ovh',
          'X-Title': 'TH-Drive Driver Support'
        },
        body: JSON.stringify(request)
      })

      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ AI Response received')
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI')
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage
      }
    } catch (error) {
      console.error('❌ AI chat error:', error)
      throw error
    }
  }
}

// Initialize with YOUR API key
const aiClient = new OpenRouterAIClient('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')

export function DriverSupportChat({ userId }: DriverSupportChatProps) {
  const [messages, setMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
  }>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [userId])

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    }
  }, [messages, isLoading])

  const loadMessages = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading messages:", error)
        return
      }

      if (data) {
        // Convert saved messages to UI format
        const uiMessages = data.map((msg: Message) => ({
          id: msg.id,
          role: msg.is_from_user ? 'user' as const : 'assistant' as const,
          content: msg.message,
          timestamp: new Date(msg.created_at).getTime()
        }))
        
        setMessages(uiMessages)
        console.log('📝 Loaded', uiMessages.length, 'messages from database')
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

    const userMessage = input
    const tempMessageId = `temp-${Date.now()}`
    
    // Add user message to UI IMMEDIATELY
    setMessages(prev => [...prev, {
      id: tempMessageId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    }])

    // Clear input
    setInput("")
    
    // Save to database
    const supabase = createClient()
    let savedUserMessageId = tempMessageId
    
    try {
      const { data: savedUserMessage } = await supabase
        .from("support_messages")
        .insert({
          user_id: userId,
          message: userMessage,
          is_from_user: true,
          is_ai_response: false,
        })
        .select()
        .single()

      if (savedUserMessage) {
        savedUserMessageId = savedUserMessage.id
        console.log('✅ Saved user message to DB:', savedUserMessage.id)
      }
    } catch (error) {
      console.error('Error saving user message:', error)
    }

    // Show loading state
    setIsLoading(true)
    
    try {
      // Prepare conversation history for AI
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Add current user message to history
      conversationHistory.push({
        role: 'user',
        content: userMessage
      })

      // Prepare system message
      const messagesForAI = [
        {
          role: 'system' as const,
          content: 'You are a helpful support assistant for TH-Drive driver support. Help drivers with earnings, navigation, passenger issues, account management, driver ratings, vehicle issues, payment processing, and driver-specific questions. Keep responses concise and helpful.'
        },
        ...conversationHistory
      ]

      console.log('🤖 Getting AI response for:', userMessage.substring(0, 50) + '...')

      // Get AI response
      const response = await aiClient.chat(messagesForAI, {
        model: 'allenai/olmo-3.1-32b-think:free',
        temperature: 0.7,
        maxTokens: 500
      })

      const aiResponse = response.content
      console.log('✅ AI Response:', aiResponse.substring(0, 100) + '...')

      // Add AI response to UI IMMEDIATELY
      const tempAiId = `ai-temp-${Date.now()}`
      setMessages(prev => [...prev, {
        id: tempAiId,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      }])

      // Save AI response to database
      const { data: savedAiMessage } = await supabase
        .from("support_messages")
        .insert({
          user_id: userId,
          message: aiResponse,
          is_from_user: false,
          is_ai_response: true,
        })
        .select()
        .single()

      if (savedAiMessage) {
        console.log('✅ Saved AI response to DB:', savedAiMessage.id)
        
        // Update the temporary ID with the real database ID
        setMessages(prev => prev.map(msg => 
          msg.id === tempAiId 
            ? { ...msg, id: savedAiMessage.id }
            : msg
        ))
      }

    } catch (error) {
      console.error('❌ Error getting AI response:', error)
      
      // FALLBACK: Show helpful response when AI fails
      const fallbackResponse = getFallbackResponse(userMessage)
      
      // Add fallback to UI
      const fallbackId = `fallback-${Date.now()}`
      setMessages(prev => [...prev, {
        id: fallbackId,
        role: 'assistant',
        content: fallbackResponse,
        timestamp: Date.now()
      }])

      // Save fallback to database
      try {
        await supabase.from("support_messages").insert({
          user_id: userId,
          message: fallbackResponse,
          is_from_user: false,
          is_ai_response: true,
        })
      } catch (dbError) {
        console.error('Error saving fallback:', dbError)
      }

    } finally {
      setIsLoading(false)
    }
  }

  // Helper function for fallback responses
  const getFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('navigation') || lowerMessage.includes('route') || lowerMessage.includes('directions')) {
      return "You can access navigation through the Driver Dashboard. Tap the 'Navigation' button for turn-by-turn directions to passenger locations. Make sure location services are enabled on your device."
    }
    
    if (lowerMessage.includes('earning') || lowerMessage.includes('payment') || lowerMessage.includes('money')) {
      return "Earnings are calculated based on: 1) Base fare, 2) Distance traveled, 3) Time spent, and 4) Surge pricing. You receive 75% of the total fare. Payments are processed weekly to your registered bank account."
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('passenger') || lowerMessage.includes('issue')) {
      return "To report a passenger issue: Go to ride details → Tap 'Report Issue' → Select issue type → Add details → Submit. Our team reviews reports within 24 hours."
    }
    
    if (lowerMessage.includes('account') || lowerMessage.includes('profile') || lowerMessage.includes('vehicle')) {
      return "For account help: Update your profile in Driver Settings. Vehicle info can be updated in 'My Vehicle' section. Contact driver-support@th-drive.com for account-specific issues."
    }
    
    return "I'm here to help with TH-Drive driver support! For immediate assistance, please contact driver-support@th-drive.com or try one of the quick actions above."
  }

  return (
    <Card className="mx-auto max-w-3xl shadow-lg shadow-primary/5 border-border/50">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <span className="text-lg font-semibold">Driver Support Assistant</span>
            <p className="text-sm font-normal text-muted-foreground">
              Powered by AI • Available 24/7
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">Loading chat history...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center text-center px-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Driver Support Center</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Need help with your driver account? I can assist with earnings, navigation, passenger issues, and more.
              </p>

              {/* Quick Actions */}
              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuickAction(action.message)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center text-sm font-medium transition-all hover:bg-blue-50 hover:border-blue-200"
                  >
                    <action.icon className="h-5 w-5 text-blue-500" />
                    <span>{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 pb-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
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
                          message.role === "user" 
                            ? "bg-blue-600 text-white" 
                            : "bg-blue-500/10 border border-blue-500/20"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user" 
                            ? "bg-blue-600 text-white" 
                            : "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.role === "user" ? "You" : "Driver Assistant"}
                        </p>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Bot className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-xs mt-2 text-blue-600">Thinking...</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-gradient-to-t from-white to-blue-50/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ask about earnings, navigation, or passenger issues..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl border-blue-200 focus:border-blue-400 focus:ring-blue-400"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Using OpenRouter AI • Response times may vary • Contact driver-support@th-drive.com for urgent issues
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
