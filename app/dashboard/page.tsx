"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSidebar } from "@/components/dashboard/user-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Profile {
  id: string
  full_name: string | null
  email: string
  rating: number | null
}

interface SupportMessage {
  id: string
  message: string
  is_from_user: boolean
  is_ai_response: boolean
  created_at: string
}

export default function SupportPage() {
  const [userId, setUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [issueType, setIssueType] = useState("general")
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Fetch profile with id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, rating")
        .eq("id", user.id)
        .single()
      
      setProfile(profileData)

      // Fetch support messages
      const { data: messagesData } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
      
      setMessages(messagesData || [])
      
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || isSending) return

    setIsSending(true)
    const supabase = createClient()

    try {
      // Add user message
      const { data: userMessage } = await supabase
        .from("support_messages")
        .insert({
          user_id: userId,
          message: newMessage,
          is_from_user: true,
          is_ai_response: false,
        })
        .select()
        .single()

      if (userMessage) {
        setMessages(prev => [...prev, userMessage])
        setNewMessage("")
      }

      // Simulate AI response after 2 seconds
      setTimeout(async () => {
        const aiResponse = `Thank you for your message about "${issueType}". Our support team will review your inquiry and get back to you within 24 hours. In the meantime, you can check our FAQ or browse help articles.`
        
        const { data: aiMessage } = await supabase
          .from("support_messages")
          .insert({
            user_id: userId,
            message: aiResponse,
            is_from_user: false,
            is_ai_response: true,
          })
          .select()
          .single()

        if (aiMessage) {
          setMessages(prev => [...prev, aiMessage])
        }
        setIsSending(false)
      }, 2000)

    } catch (error) {
      console.error("Error sending message:", error)
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <UserSidebar
          user={{
            id: "loading", // Add temporary id
            full_name: "Loading...",
            email: "",
            rating: 5.0,
          }}
        />
        <main className="p-4 md:ml-64 md:p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!userId || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p>You need to be logged in to access support.</p>
        </div>
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <UserSidebar
        user={{
          id: profile.id, // ADD THIS REQUIRED PROPERTY
          full_name: profile.full_name || "User",
          email: profile.email || "",
          rating: profile.rating || 5.0,
        }}
      />
      
      <main className="p-4 md:ml-64 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Get help with any issues or questions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Support Chat */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Support Chat
                </CardTitle>
                <CardDescription>
                  Chat with our support team for assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Messages Container */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto p-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-lg font-semibold">No messages yet</h3>
                      <p className="text-muted-foreground">Start a conversation with our support team</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_from_user ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.is_from_user
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.is_ai_response && (
                              <Badge variant="outline" className="text-xs">
                                AI Assistant
                              </Badge>
                            )}
                            <span className="text-xs opacity-75">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm">{message.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input Area */}
                <div className="space-y-4">
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="payment">Payment/Billing</SelectItem>
                      <SelectItem value="safety">Safety Concern</SelectItem>
                      <SelectItem value="ride">Ride Issues</SelectItem>
                      <SelectItem value="account">Account Problem</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Describe your issue..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="min-h-[100px]"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      size="icon"
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Help */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Help</CardTitle>
                <CardDescription>Common questions and resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Response Time
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Our support team typically responds within 24 hours. For urgent matters, please call our emergency line.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Frequently Asked
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• How do I cancel a ride?</li>
                    <li>• Payment method issues</li>
                    <li>• Driver rating concerns</li>
                    <li>• Account security</li>
                    <li>• Refund requests</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Emergency Contact
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    For safety emergencies, contact:
                    <br />
                    <strong>Emergency Line: 1-800-XXX-XXXX</strong>
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    View Help Articles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
