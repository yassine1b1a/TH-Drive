"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Loader2, Sparkles, HelpCircle, CreditCard, Star, Car } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  message: string
  is_from_user: boolean
  is_ai_response: boolean
  created_at: string
}

interface SupportChatProps {
  userId: string
}

const quickActions = [
  { icon: Car, label: "Booking Help", message: "How do I book a ride?" },
  { icon: CreditCard, label: "Payment Issues", message: "I have a payment issue" },
  { icon: Star, label: "Rate Driver", message: "How do I rate my driver?" },
  { icon: HelpCircle, label: "Report Issue", message: "I want to report an issue with my ride" },
]

// YOUR CONFIGURATION
const OPENROUTER_API_KEY = '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'
const OPENROUTER_MODEL = 'nex-agi/deepseek-v3.1-nex-n1:free'

export function SupportChat({ userId }: SupportChatProps) {
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
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

      if (error) throw error

      if (data) {
        const uiMessages = data.map((msg: Message) => ({
          id: msg.id,
          role: msg.is_from_user ? 'user' as const : 'assistant' as const,
          content: msg.message,
          timestamp: new Date(msg.created_at).getTime()
        }))
        
        setMessages(uiMessages)
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

  // WORKING OpenRouter API call with your model
  const callOpenRouterAPI = async (userMessage: string): Promise<string> => {
    try {
      console.log("🤖 Calling OpenRouter with model:", OPENROUTER_MODEL)
      
      const requestBody = {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful support assistant for TH-Drive, a ride-sharing service. Help users with booking rides, payment issues, rating drivers, reporting problems, account management, and general questions. Keep responses friendly, concise, and helpful (2-3 paragraphs max)."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://th-drive.thprojects.ovh',
          'X-Title': 'TH-Drive Support'
        },
        body: JSON.stringify(requestBody)
      })

      console.log("📥 API Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error details:", errorText)
        
        // If rate limited, use fallback
        if (response.status === 429) {
          console.log("⚠️ Rate limited, using fallback")
          throw new Error('Rate limited, using fallback')
        }
        
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ API Response received")
      
      // Proper response extraction
      if (data.choices && 
          data.choices.length > 0 && 
          data.choices[0].message && 
          data.choices[0].message.content) {
        
        const aiResponse = data.choices[0].message.content
        console.log("✨ AI Response extracted successfully")
        return aiResponse
        
      } else {
        console.error("❌ Unexpected API format:", data)
        throw new Error('Invalid API response format')
      }

    } catch (error) {
      console.error("❌ OpenRouter API call failed:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    const userMessageId = `user-${Date.now()}`

    // 1. ADD USER MESSAGE TO UI IMMEDIATELY
    setMessages(prev => [...prev, {
      id: userMessageId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    }])

    // Clear input
    setInput("")
    
    // 2. SAVE USER MESSAGE TO DATABASE
    const supabase = createClient()
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
        // Update ID with real database ID
        setMessages(prev => prev.map(msg => 
          msg.id === userMessageId 
            ? { ...msg, id: savedUserMessage.id }
            : msg
        ))
      }
    } catch (error) {
      console.error("Error saving user message:", error)
    }

    // 3. SHOW LOADING AND GET AI RESPONSE
    setIsLoading(true)
    let aiResponse = ""
    const aiMessageId = `ai-${Date.now()}`

    try {
      // GET REAL AI RESPONSE FROM OPENROUTER
      aiResponse = await callOpenRouterAPI(userMessage)
      
      console.log("✅ AI Response received:", aiResponse.substring(0, 100) + "...")

    } catch (apiError) {
      console.error("API failed, using smart fallback:", apiError)
      
      // SMART FALLBACK RESPONSES
      const lowerMessage = userMessage.toLowerCase()
      
      if (lowerMessage.includes('book') || lowerMessage.includes('ride') || lowerMessage.includes('request')) {
        aiResponse = `🚗 **How to Book a Ride:**

1. **Open the TH-Drive app** and allow location access
2. **Enter your destination** in the search bar
3. **Choose your ride type**: Standard, Premium, or Group
4. **Confirm pickup location** on the map
5. **Select payment method** (card, QR code, or cash)
6. **Tap "Request Ride"** and wait for driver acceptance

You'll see driver details, ETA, and fare estimate before confirming.`
        
      } else if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('charge')) {
        aiResponse = `💳 **Payment Help:**

**Payment Methods:**
• Credit/Debit Cards (Visa, MasterCard, Amex)
• QR Code payments
• Cash (select markets)

**Common Issues & Solutions:**
1. **Failed Payment**: Check card details or try another payment method
2. **Double Charge**: Contact support@th-drive.com with ride details
3. **Refund Request**: Go to Ride History → Select ride → Request Refund

**Payment Security**: All transactions are encrypted and secure.`
        
      } else if (lowerMessage.includes('rate') || lowerMessage.includes('rating') || lowerMessage.includes('star')) {
        aiResponse = `⭐ **Rating System:**

**How to Rate Your Driver:**
1. After ride completion, you'll see a rating screen
2. Tap 1-5 stars (5 being best)
3. Add optional comments
4. Submit your rating

**What Ratings Mean:**
• 5 Stars: Excellent service
• 4 Stars: Good with minor issues  
• 3 Stars: Average experience
• 2 Stars: Below expectations
• 1 Star: Poor experience requiring review

**Note**: Ratings affect driver matching and incentives.`
        
      } else if (lowerMessage.includes('report') || lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
        aiResponse = `⚠️ **Reporting Issues:**

**Steps to Report:**
1. Go to "My Rides" in the app
2. Select the specific ride
3. Tap "Report Issue" 
4. Choose category:
   • Safety Concern
   • Route/Direction Issue
   • Driver Behavior
   • Payment Problem
   • Lost Item
5. Add details and submit

**Response Time**: Our team reviews within 24 hours.

**Emergency**: For immediate safety concerns, contact local authorities first.`
        
      } else {
        aiResponse = `👋 Hello! I'm your TH-Drive support assistant. 

I can help you with:
• **Booking rides** and understanding fares
• **Payment issues** and refund requests  
• **Rating drivers** and viewing your ratings
• **Reporting problems** with rides or drivers
• **Account questions** and profile updates

What can I help you with today? For immediate assistance, contact support@th-drive.com.`
      }
    }

    // 4. ADD AI RESPONSE TO UI IMMEDIATELY
    setMessages(prev => [...prev, {
      id: aiMessageId,
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    }])

    // 5. SAVE AI RESPONSE TO DATABASE
    try {
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
        // Update ID with real database ID
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, id: savedAiMessage.id }
            : msg
        ))
      }
    } catch (error) {
      console.error("Error saving AI message:", error)
    }

    setIsLoading(false)
  }

  return (
    <Card className="mx-auto max-w-3xl shadow-lg shadow-primary/5 border-primary/20">
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-white pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900">TH-Drive Support Assistant</span>
            <p className="text-sm font-normal text-gray-600">
              Using DeepSeek AI • Available 24/7
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2 text-sm text-gray-500">Loading your conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center text-center px-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">How can I help you today?</h3>
              <p className="mt-2 text-sm text-gray-600 max-w-md">
                I'm your TH-Drive support assistant. Ask me about bookings, payments, ratings, or report any issues.
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
                    className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-white p-4 text-center text-sm font-medium transition-all hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm"
                  >
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">{action.label}</span>
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
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          message.role === "user" 
                            ? "bg-gradient-to-br from-primary to-primary/80" 
                            : "bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-gray-700" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user" 
                            ? "bg-gradient-to-r from-primary to-primary/80 text-white" 
                            : "bg-gradient-to-r from-gray-50 to-white border border-gray-200 text-gray-800"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-2 ${message.role === "user" ? "text-primary-100" : "text-gray-500"}`}>
                          {message.role === "user" ? "You" : "Support Assistant"}
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300">
                      <Bot className="h-4 w-4 text-gray-700" />
                    </div>
                    <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-xs mt-2 text-gray-600">Getting AI response from DeepSeek...</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-gray-200 p-4 bg-gradient-to-t from-white to-gray-50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ask about bookings, payments, or report issues..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl border-gray-300 focus:border-primary focus:ring-primary"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Using DeepSeek V3.1 via OpenRouter • Response times may vary • Contact support@th-drive.com for urgent issues</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
