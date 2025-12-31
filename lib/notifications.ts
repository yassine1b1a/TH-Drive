import { createClient } from "@/lib/supabase/client"

export type NotificationType = "warning" | "info" | "alert" | "success"

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: NotificationType
  relatedType?: "moderation_alert" | "ride" | "violation" | "rating" | "support"
  relatedId?: string
  metadata?: Record<string, any>
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const supabase = createClient()
    
    // Use RPC function if available, otherwise direct insert
    const { data, error } = await supabase.rpc('send_notification', {
      p_user_id: params.userId,
      p_title: params.title,
      p_message: params.message,
      p_type: params.type || 'info',
      p_related_type: params.relatedType,
      p_related_id: params.relatedId,
      p_metadata: params.metadata || {}
    })

    if (error) {
      // Fallback to direct insert if RPC fails
      const { data: insertData, error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || 'info',
          related_type: params.relatedType,
          related_id: params.relatedId,
          metadata: params.metadata || {}
        })
        .select()
        .single()

      if (insertError) throw insertError
      return insertData
    }

    return data
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

// Helper function for admin warnings
export async function sendWarningNotification(
  userId: string,
  reason: string,
  moderatorName: string,
  alertId?: string
) {
  return createNotification({
    userId,
    title: "Warning Issued",
    message: `You have received a warning from moderator ${moderatorName}. Reason: ${reason}`,
    type: "warning",
    relatedType: "moderation_alert",
    relatedId: alertId,
    metadata: { action: "warning", moderator: moderatorName, reason }
  })
}

// Helper function for bans
export async function sendBanNotification(
  userId: string,
  reason: string,
  moderatorName: string,
  alertId?: string
) {
  return createNotification({
    userId,
    title: "Account Suspended",
    message: `Your account has been suspended. Reason: ${reason}. Please contact support for more information.`,
    type: "alert",
    relatedType: "moderation_alert",
    relatedId: alertId,
    metadata: { action: "ban", moderator: moderatorName, reason }
  })
}

// Helper for ride notifications
export async function sendRideNotification(
  userId: string,
  title: string,
  message: string,
  rideId: string,
  type: NotificationType = "info"
) {
  return createNotification({
    userId,
    title,
    message,
    type,
    relatedType: "ride",
    relatedId: rideId
  })
}
