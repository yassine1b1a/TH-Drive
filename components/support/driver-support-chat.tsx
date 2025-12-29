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
import { useMimoChat } from "@/lib/hooks/use-mimo-chat"



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

export function DriverSupportChat({ userId }: DriverSupportChatProps) {
  const [savedMessages, setSavedMessages] = useState<Message[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useMimoChat({
    api: "/api/support/driver-chat",
    body: { userId },
    onFinish: async (message) => {
      const supabase = createClient()
      await supabase.from("support_messages").insert({
        user_id: userId,
        message: message.content,
        is_from_user: false,
        is_ai_response: true,
      })
    },
  })

  useEffect(() => {
    loadMessages()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, savedMessages])

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

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

    handleSubmit(e)
  }

  const allMessages = [
    ...savedMessages.map((m) => ({
      id: m.id,
      role: m.is_from_user ? ("user" as const) : ("assistant" as const),
      content: m.message,
    })),
    ...messages,
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
            <p className="text-sm font-normal text-muted-foreground">Get help with your driver account</p>
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
                {
                  "Need help with your driver account? I can assist with earnings, navigation, passenger issues, and more."
                }
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
                {uniqueMessages.map((message) => (
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
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange}
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
            For urgent driver issues, contact driver-support@th-drive.com
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
