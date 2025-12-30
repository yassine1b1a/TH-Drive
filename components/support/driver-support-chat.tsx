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

const OPENROUTER_API_KEY = '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'
const OPENROUTER_MODEL = 'allenai/olmo-3.1-32b-think:free'

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

  // FIXED: Proper OpenRouter API call with correct response extraction
  const callOpenRouterAPI = async (userMessage: string): Promise<string> => {
    try {
      console.log("🔍 Calling OpenRouter API with key:", OPENROUTER_API_KEY.substring(0, 10) + "...")
      
      const requestBody = {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful support assistant for TH-Drive driver support. Help drivers with earnings, navigation, passenger issues, account management, driver ratings, vehicle issues, payment processing, and driver-specific questions. Keep responses concise and helpful (2-3 paragraphs max)."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://th-drive.thprojects.ovh',
          'X-Title': 'TH-Drive Driver Support'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      // FIXED: Proper response extraction
      if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
        const aiResponse = data.choices[0].message.content
        console.log("✅ AI Response extracted:", aiResponse.substring(0, 100) + "...")
        return aiResponse
      } else {
        console.error("❌ Unexpected API response format:", data)
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
      
      console.log("🤖 AI Response received successfully!")

    } catch (apiError) {
      console.error("API failed, using fallback:", apiError)
      
      // FALLBACK RESPONSES WHEN API FAILS
      const lowerMessage = userMessage.toLowerCase()
      
      if (lowerMessage.includes('money') || lowerMessage.includes('earn') || lowerMessage.includes('income')) {
        aiResponse = `💰 **Earnings Strategy for TH-Drive Drivers:**

1. **Peak Hours Driving**: Focus on 7-9 AM and 5-7 PM weekdays, Friday/Saturday evenings for surge pricing.

2. **Airport Trips**: Monitor airport arrivals for longer, higher-paying rides.

3. **High-Demand Areas**: Position yourself near business districts, malls, and event venues.

4. **Maintain High Rating**: 4.8+ ratings get priority for ride requests.

5. **Referral Program**: Earn $50 for each new driver you refer.

6. **Weekly Bonuses**: Complete 50+ rides/week for $100 bonus.

Track your performance in the Driver Analytics dashboard.`
      } else if (lowerMessage.includes('navigation') || lowerMessage.includes('route') || lowerMessage.includes('map')) {
        aiResponse = `🗺️ **Navigation Features:**

• **Built-in GPS**: Integrated with Google Maps in the Driver app
• **Live Traffic Updates**: Real-time route optimization
• **ETA Predictions**: Accurate arrival time estimates
• **Voice Guidance**: Hands-free turn-by-turn directions
• **Alternative Routes**: Tap to see faster options

Pro Tip: Enable "Avoid Tolls" in settings if you want to maximize earnings on short trips.`
      } else if (lowerMessage.includes('report') || lowerMessage.includes('passenger') || lowerMessage.includes('issue')) {
        aiResponse = `⚠️ **Reporting Passenger Issues:**

**Steps to Report:**
1. Go to "Ride History" in your app
2. Select the specific ride
3. Tap "Report Issue" button
4. Choose category: Safety, Behavior, Payment, or Other
5. Add details and submit

**Response Time:** Our support team reviews within 24 hours.

**Emergency:** For immediate safety concerns, contact local authorities first, then notify us at safety@th-drive.com`
      } else {
        aiResponse = `👋 Thanks for your question! I'm here to help with TH-Drive driver support.

For earnings optimization, consider driving during peak hours (7-9 AM, 5-7 PM), focusing on airport pickups, and maintaining a high driver rating.

For immediate assistance, contact our driver support team at driver-support@th-drive.com or call 1-800-DRIVE-TH.

Is there anything specific about your driver account you'd like help with?`
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
    <Card className="mx-auto max-w-3xl shadow-lg shadow-blue-500/5 border-blue-200">
      <CardHeader className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900">Driver Support Assistant</span>
            <p className="text-sm font-normal text-gray-600">Powered by OpenRouter AI • Real-time assistance</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">Loading your conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center text-center px-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Welcome to Driver Support!</h3>
              <p className="mt-2 text-sm text-gray-600 max-w-md">
                How can I help with your driver account today?
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuickAction(action.message)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-blue-200 bg-white p-4 text-center text-sm font-medium transition-all hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm"
                  >
                    <action.icon className="h-5 w-5 text-blue-500" />
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
                            ? "bg-gradient-to-br from-blue-500 to-blue-600" 
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
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                            : "bg-gradient-to-r from-gray-50 to-white border border-gray-200 text-gray-800"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-2 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300">
                      <Bot className="h-4 w-4 text-gray-700" />
                    </div>
                    <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-xs mt-2 text-gray-600">Getting AI response from OpenRouter...</p>
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
              placeholder="Ask about earnings, navigation, or passenger issues..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>Using OpenRouter AI • Model: {OPENROUTER_MODEL}</span>
            <span>API Key: {OPENROUTER_API_KEY.substring(0, 8)}...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
