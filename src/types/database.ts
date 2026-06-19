// Auto-derived from supabase/migrations/20260619000001_initial_schema.sql
// Regenerate with: npx supabase gen types typescript --linked > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'user' | 'admin' | 'super_admin'
export type TeamRole = 'product' | 'support' | 'growth'
export type ContentType = 'article' | 'library_item' | 'initiative'
export type ContentStatus = 'draft' | 'published' | 'archived'
export type InteractionType = 'view' | 'click' | 'share' | 'download'
export type PurchaseStatus = 'pending' | 'success' | 'failed' | 'refunded'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RequestStatus = 'open' | 'in_review' | 'planned' | 'completed' | 'declined'
export type NotificationType = 'system' | 'content' | 'support' | 'payment'

// ============================================================
// ROW TYPES  (what comes back from SELECT *)
// ============================================================

export interface UserRow {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  team_role: TeamRole | null
  job_role: string | null
  country: string | null
  areas_of_interest: string[]
  onboarding_done: boolean
  auth_provider: string
  created_at: string
  updated_at: string
}

export interface ContentRow {
  id: string
  title: string
  slug: string
  type: ContentType
  status: ContentStatus
  summary: string | null
  body: string | null
  cover_image_url: string | null
  author_id: string | null
  tags: string[]
  view_count: number
  upvote_count: number
  comment_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ContentInteractionRow {
  id: string
  content_id: string
  user_id: string | null
  session_id: string | null
  type: InteractionType
  metadata: Json | null
  created_at: string
}

export interface ContentCommentRow {
  id: string
  content_id: string
  user_id: string
  parent_id: string | null
  body: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface ContentUpvoteRow {
  id: string
  content_id: string
  user_id: string
  created_at: string
}

export interface AiSummaryRow {
  id: string
  content_id: string
  summary_text: string
  model_used: string
  requested_by: string
  created_at: string
}

export interface RatingRow {
  id: string
  content_id: string
  user_id: string
  rating: 1 | 2 | 3 | 4 | 5
  created_at: string
  updated_at: string
}

export interface PurchaseRow {
  id: string
  user_id: string
  amount: number
  currency: string
  status: PurchaseStatus
  paystack_reference: string | null
  paystack_access_code: string | null
  item_type: string
  item_id: string | null
  metadata: Json | null
  created_at: string
  updated_at: string
}

export interface ContentRequestRow {
  id: string
  user_id: string
  title: string
  description: string | null
  status: RequestStatus
  upvote_count: number
  created_at: string
  updated_at: string
}

export interface SupportTicketRow {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface TicketReplyRow {
  id: string
  ticket_id: string
  user_id: string
  body: string
  is_internal: boolean
  created_at: string
}

export interface NotificationRow {
  id: string
  title: string
  body: string
  type: NotificationType
  action_url: string | null
  created_by: string | null
  created_at: string
}

export interface NotificationRecipientRow {
  id: string
  notification_id: string
  user_id: string
  read_at: string | null
  created_at: string
}

export interface AdminActionLogRow {
  id: string
  admin_id: string
  action_type: string
  target_table: string | null
  target_id: string | null
  metadata: Json | null
  created_at: string
}

// ============================================================
// INSERT TYPES  (fields required / optional on insert)
// ============================================================

export type UserInsert = Pick<UserRow, 'id' | 'email'> &
  Partial<Pick<UserRow, 'full_name' | 'first_name' | 'last_name' | 'avatar_url' | 'bio' | 'role' | 'team_role' | 'job_role' | 'country' | 'areas_of_interest' | 'onboarding_done' | 'auth_provider'>>

export type ContentInsert = Pick<ContentRow, 'title' | 'slug' | 'type'> &
  Partial<Pick<ContentRow, 'status' | 'summary' | 'body' | 'cover_image_url' | 'author_id' | 'tags' | 'published_at'>>

export type ContentInteractionInsert = Pick<ContentInteractionRow, 'content_id' | 'type'> &
  Partial<Pick<ContentInteractionRow, 'user_id' | 'session_id' | 'metadata'>>

export type ContentCommentInsert = Pick<ContentCommentRow, 'content_id' | 'user_id' | 'body'> &
  Partial<Pick<ContentCommentRow, 'parent_id'>>

export type ContentUpvoteInsert = Pick<ContentUpvoteRow, 'content_id' | 'user_id'>

export type AiSummaryInsert = Pick<AiSummaryRow, 'content_id' | 'summary_text' | 'requested_by'> &
  Partial<Pick<AiSummaryRow, 'model_used'>>

export type RatingInsert = Pick<RatingRow, 'content_id' | 'user_id' | 'rating'>

export type PurchaseInsert = Pick<PurchaseRow, 'user_id' | 'amount' | 'item_type'> &
  Partial<Pick<PurchaseRow, 'currency' | 'status' | 'paystack_reference' | 'paystack_access_code' | 'item_id' | 'metadata'>>

export type ContentRequestInsert = Pick<ContentRequestRow, 'user_id' | 'title'> &
  Partial<Pick<ContentRequestRow, 'description'>>

export type SupportTicketInsert = Pick<SupportTicketRow, 'user_id' | 'subject'> &
  Partial<Pick<SupportTicketRow, 'priority'>>

export type TicketReplyInsert = Pick<TicketReplyRow, 'ticket_id' | 'user_id' | 'body'> &
  Partial<Pick<TicketReplyRow, 'is_internal'>>

export type NotificationInsert = Pick<NotificationRow, 'title' | 'body'> &
  Partial<Pick<NotificationRow, 'type' | 'action_url' | 'created_by'>>

export type NotificationRecipientInsert = Pick<NotificationRecipientRow, 'notification_id' | 'user_id'>

export type AdminActionLogInsert = Pick<AdminActionLogRow, 'admin_id' | 'action_type'> &
  Partial<Pick<AdminActionLogRow, 'target_table' | 'target_id' | 'metadata'>>

// ============================================================
// UPDATE TYPES  (all fields optional except id)
// ============================================================

export type UserUpdate = Partial<Pick<UserRow, 'full_name' | 'first_name' | 'last_name' | 'avatar_url' | 'bio' | 'role' | 'team_role' | 'job_role' | 'country' | 'areas_of_interest' | 'onboarding_done' | 'auth_provider'>>

export type ContentUpdate = Partial<Pick<ContentRow,
  'title' | 'slug' | 'type' | 'status' | 'summary' | 'body' |
  'cover_image_url' | 'author_id' | 'tags' | 'published_at'
>>

export type ContentCommentUpdate = Partial<Pick<ContentCommentRow, 'body' | 'is_deleted'>>

export type RatingUpdate = Pick<RatingRow, 'rating'>

export type PurchaseUpdate = Partial<Pick<PurchaseRow,
  'status' | 'paystack_reference' | 'paystack_access_code' | 'metadata'
>>

export type ContentRequestUpdate = Partial<Pick<ContentRequestRow, 'title' | 'description' | 'status'>>

export type SupportTicketUpdate = Partial<Pick<SupportTicketRow, 'status' | 'priority' | 'assigned_to'>>

export type NotificationRecipientUpdate = Pick<NotificationRecipientRow, 'read_at'>

// ============================================================
// SUPABASE DATABASE TYPE MAP
// (used with createClient<Database>() for full type inference)
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
        Relationships: []
      }
      content: {
        Row: ContentRow
        Insert: ContentInsert
        Update: ContentUpdate
        Relationships: []
      }
      content_interactions: {
        Row: ContentInteractionRow
        Insert: ContentInteractionInsert
        Update: Partial<ContentInteractionInsert>
        Relationships: []
      }
      content_comments: {
        Row: ContentCommentRow
        Insert: ContentCommentInsert
        Update: ContentCommentUpdate
        Relationships: []
      }
      content_upvotes: {
        Row: ContentUpvoteRow
        Insert: ContentUpvoteInsert
        Update: Record<string, never>
        Relationships: []
      }
      ai_summaries: {
        Row: AiSummaryRow
        Insert: AiSummaryInsert
        Update: Record<string, never>
        Relationships: []
      }
      ratings: {
        Row: RatingRow
        Insert: RatingInsert
        Update: RatingUpdate
        Relationships: []
      }
      purchases: {
        Row: PurchaseRow
        Insert: PurchaseInsert
        Update: PurchaseUpdate
        Relationships: []
      }
      content_requests: {
        Row: ContentRequestRow
        Insert: ContentRequestInsert
        Update: ContentRequestUpdate
        Relationships: []
      }
      support_tickets: {
        Row: SupportTicketRow
        Insert: SupportTicketInsert
        Update: SupportTicketUpdate
        Relationships: []
      }
      ticket_replies: {
        Row: TicketReplyRow
        Insert: TicketReplyInsert
        Update: Record<string, never>
        Relationships: []
      }
      notifications: {
        Row: NotificationRow
        Insert: NotificationInsert
        Update: Partial<NotificationInsert>
        Relationships: []
      }
      notification_recipients: {
        Row: NotificationRecipientRow
        Insert: NotificationRecipientInsert
        Update: NotificationRecipientUpdate
        Relationships: []
      }
      admin_actions_log: {
        Row: AdminActionLogRow
        Insert: AdminActionLogInsert
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Enums: {
      user_role: UserRole
      team_role: TeamRole
      content_type: ContentType
      content_status: ContentStatus
      interaction_type: InteractionType
      purchase_status: PurchaseStatus
      ticket_status: TicketStatus
      ticket_priority: TicketPriority
      request_status: RequestStatus
      notification_type: NotificationType
    }
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
