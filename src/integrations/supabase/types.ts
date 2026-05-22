export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_name: string | null
          error_message: string | null
          executed_at: string | null
          flow_id: string | null
          id: string
          phone: string | null
          result: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          trigger_data: Json | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          executed_at?: string | null
          flow_id?: string | null
          id?: string
          phone?: string | null
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          executed_at?: string | null
          flow_id?: string | null
          id?: string
          phone?: string | null
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          trigger_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          actions: Json | null
          created_at: string
          delay_unit: string | null
          delay_value: number | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          media_type: string | null
          media_url: string | null
          message_content: string | null
          name: string
          status: string | null
          target_phone: string | null
          trigger_config: Json | null
          trigger_event: string
          updated_at: string
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          delay_unit?: string | null
          delay_value?: number | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          name: string
          status?: string | null
          target_phone?: string | null
          trigger_config?: Json | null
          trigger_event: string
          updated_at?: string
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          actions?: Json | null
          created_at?: string
          delay_unit?: string | null
          delay_value?: number | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          name?: string
          status?: string | null
          target_phone?: string | null
          trigger_config?: Json | null
          trigger_event?: string
          updated_at?: string
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          updated_at: string
          user_id: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          media_url: string | null
          message_type: string | null
          use_count: number | null
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          media_url?: string | null
          message_type?: string | null
          use_count?: number | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          media_url?: string | null
          message_type?: string | null
          use_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string | null
          cluster_ids: string[] | null
          completed_at: string | null
          created_at: string
          daily_limit: number | null
          delay_max_seconds: number | null
          delay_min_seconds: number | null
          description: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          total_recipients: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          cluster_ids?: string[] | null
          completed_at?: string | null
          created_at?: string
          daily_limit?: number | null
          delay_max_seconds?: number | null
          delay_min_seconds?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          cluster_ids?: string[] | null
          completed_at?: string | null
          created_at?: string
          daily_limit?: number | null
          delay_max_seconds?: number | null
          delay_min_seconds?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          instagram_id: string | null
          name: string
          notes: string | null
          phone: string | null
          tags: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          channel: string
          contact_id: string
          created_at: string | null
          id: string
          is_archived: boolean
          last_message: string | null
          last_message_at: string | null
          status: string
          tab_id: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          channel: string
          contact_id: string
          created_at?: string | null
          id?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          tab_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          channel?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          is_archived?: boolean
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          tab_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "custom_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tabs: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          manychat_url: string | null
          name: string
          order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          manychat_url?: string | null
          name: string
          order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          manychat_url?: string | null
          name?: string
          order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_clusters: {
        Row: {
          color: string | null
          created_at: string
          criteria: Json | null
          customer_count: number | null
          description: string | null
          emoji: string | null
          id: string
          name: string
          objective: string | null
          percentage: number | null
          recommendation: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          criteria?: Json | null
          customer_count?: number | null
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          objective?: string | null
          percentage?: number | null
          recommendation?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          criteria?: Json | null
          customer_count?: number | null
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          objective?: string | null
          percentage?: number | null
          recommendation?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_journeys: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          execution_count: number
          id: string
          is_active: boolean
          kill_conditions: Json
          last_executed_at: string | null
          name: string
          nodes: Json
          status: string
          trigger_event: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          execution_count?: number
          id?: string
          is_active?: boolean
          kill_conditions?: Json
          last_executed_at?: string | null
          name: string
          nodes?: Json
          status?: string
          trigger_event: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          execution_count?: number
          id?: string
          is_active?: boolean
          kill_conditions?: Json
          last_executed_at?: string | null
          name?: string
          nodes?: Json
          status?: string
          trigger_event?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          bounced_count: number | null
          clicked_count: number | null
          cluster_ids: string[] | null
          completed_at: string | null
          created_at: string
          daily_limit: number | null
          description: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          name: string
          opened_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          subject_override: string | null
          template_id: string | null
          total_recipients: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bounced_count?: number | null
          clicked_count?: number | null
          cluster_ids?: string[] | null
          completed_at?: string | null
          created_at?: string
          daily_limit?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          name: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          subject_override?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bounced_count?: number | null
          clicked_count?: number | null
          cluster_ids?: string[] | null
          completed_at?: string | null
          created_at?: string
          daily_limit?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          opened_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          subject_override?: string | null
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          brevo_message_id: string | null
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          email: string
          error_message: string | null
          html_content: string
          id: string
          metadata: Json | null
          opened_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          brevo_message_id?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          email: string
          error_message?: string | null
          html_content: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          brevo_message_id?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          email?: string
          error_message?: string | null
          html_content?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "imported_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          preview_text: string | null
          subject: string
          updated_at: string
          use_count: number | null
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          preview_text?: string | null
          subject: string
          updated_at?: string
          use_count?: number | null
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          preview_text?: string | null
          subject?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          email: string
          id: string
          reason: string | null
          unsubscribed_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_payments: {
        Row: {
          amount: number
          created_at: string
          expense_id: string
          id: string
          notes: string | null
          paid_at: string
          reference_month: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expense_id: string
          id?: string
          notes?: string | null
          paid_at?: string
          reference_month: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_id?: string
          id?: string
          notes?: string | null
          paid_at?: string
          reference_month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          due_date: string | null
          expense_type: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          recurrence_day: number | null
          status: string
          subcategory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          expense_type?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          recurrence_day?: number | null
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          expense_type?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          recurrence_day?: number | null
          status?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "expense_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          absent_emails: number | null
          absent_phones: number | null
          column_mapping: Json | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          filename: string
          id: string
          invalid_emails: number | null
          invalid_phones: number | null
          invalid_rows: number | null
          status: string | null
          total_rows: number | null
          user_id: string | null
          valid_emails: number | null
          valid_phones: number | null
          valid_rows: number | null
        }
        Insert: {
          absent_emails?: number | null
          absent_phones?: number | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          invalid_emails?: number | null
          invalid_phones?: number | null
          invalid_rows?: number | null
          status?: string | null
          total_rows?: number | null
          user_id?: string | null
          valid_emails?: number | null
          valid_phones?: number | null
          valid_rows?: number | null
        }
        Update: {
          absent_emails?: number | null
          absent_phones?: number | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          invalid_emails?: number | null
          invalid_phones?: number | null
          invalid_rows?: number | null
          status?: string | null
          total_rows?: number | null
          user_id?: string | null
          valid_emails?: number | null
          valid_phones?: number | null
          valid_rows?: number | null
        }
        Relationships: []
      }
      imported_customers: {
        Row: {
          city: string | null
          cluster_id: string | null
          created_at: string
          email: string | null
          email_status: string | null
          favorite_category: string | null
          favorite_product: string | null
          first_purchase_at: string | null
          id: string
          import_batch_id: string | null
          last_purchase_at: string | null
          metadata: Json | null
          name: string
          order_count: number | null
          phone: string | null
          phone_status: string | null
          region: string | null
          rfm_frequency: number | null
          rfm_monetary: number | null
          rfm_recency: number | null
          rfm_score: string | null
          source: string | null
          state: string | null
          ticket_level: string | null
          total_spent: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          city?: string | null
          cluster_id?: string | null
          created_at?: string
          email?: string | null
          email_status?: string | null
          favorite_category?: string | null
          favorite_product?: string | null
          first_purchase_at?: string | null
          id?: string
          import_batch_id?: string | null
          last_purchase_at?: string | null
          metadata?: Json | null
          name: string
          order_count?: number | null
          phone?: string | null
          phone_status?: string | null
          region?: string | null
          rfm_frequency?: number | null
          rfm_monetary?: number | null
          rfm_recency?: number | null
          rfm_score?: string | null
          source?: string | null
          state?: string | null
          ticket_level?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          city?: string | null
          cluster_id?: string | null
          created_at?: string
          email?: string | null
          email_status?: string | null
          favorite_category?: string | null
          favorite_product?: string | null
          first_purchase_at?: string | null
          id?: string
          import_batch_id?: string | null
          last_purchase_at?: string | null
          metadata?: Json | null
          name?: string
          order_count?: number | null
          phone?: string | null
          phone_status?: string | null
          region?: string | null
          rfm_frequency?: number | null
          rfm_monetary?: number | null
          rfm_recency?: number | null
          rfm_score?: string | null
          source?: string | null
          state?: string | null
          ticket_level?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_customers_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "customer_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_customers_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_personal_credentials: {
        Row: {
          created_at: string
          csrftoken: string | null
          ds_user_id: string | null
          error_message: string | null
          id: string
          ig_user_id: string | null
          ig_username: string | null
          last_inbox_check_at: string | null
          last_inbox_cursor: string | null
          last_verified_at: string | null
          sessionid: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          csrftoken?: string | null
          ds_user_id?: string | null
          error_message?: string | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          last_inbox_check_at?: string | null
          last_inbox_cursor?: string | null
          last_verified_at?: string | null
          sessionid: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          csrftoken?: string | null
          ds_user_id?: string | null
          error_message?: string | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          last_inbox_check_at?: string | null
          last_inbox_cursor?: string | null
          last_verified_at?: string | null
          sessionid?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journey_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_node_id: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          error_message: string | null
          execution_data: Json
          id: string
          journey_id: string
          next_action_at: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          execution_data?: Json
          id?: string
          journey_id: string
          next_action_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          execution_data?: Json
          id?: string
          journey_id?: string
          next_action_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_executions_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "customer_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          evolution_message_id: string | null
          id: string
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          sender_id: string | null
          sender_type: string
          status: string | null
          user_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          evolution_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
          status?: string | null
          user_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          evolution_message_id?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
          status?: string | null
          user_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_comments: {
        Row: {
          author_id: string | null
          author_username: string | null
          comment_id: string
          created_at: string
          hidden: boolean | null
          id: string
          integration_id: string | null
          media_caption: string | null
          media_id: string | null
          media_url: string | null
          metadata: Json | null
          parent_comment_id: string | null
          received_at: string
          replied_at: string | null
          reply_text: string | null
          sentiment: string | null
          status: string
          text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author_id?: string | null
          author_username?: string | null
          comment_id: string
          created_at?: string
          hidden?: boolean | null
          id?: string
          integration_id?: string | null
          media_caption?: string | null
          media_id?: string | null
          media_url?: string | null
          metadata?: Json | null
          parent_comment_id?: string | null
          received_at?: string
          replied_at?: string | null
          reply_text?: string | null
          sentiment?: string | null
          status?: string
          text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author_id?: string | null
          author_username?: string | null
          comment_id?: string
          created_at?: string
          hidden?: boolean | null
          id?: string
          integration_id?: string | null
          media_caption?: string | null
          media_id?: string | null
          media_url?: string | null
          metadata?: Json | null
          parent_comment_id?: string | null
          received_at?: string
          replied_at?: string | null
          reply_text?: string | null
          sentiment?: string | null
          status?: string
          text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_credentials: {
        Row: {
          app_id: string | null
          app_secret: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          webhook_verify_token: string | null
        }
        Insert: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          webhook_verify_token?: string | null
        }
        Update: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      meta_integrations: {
        Row: {
          created_at: string
          facebook_user_id: string | null
          facebook_user_name: string | null
          id: string
          instagram_business_account_id: string | null
          instagram_username: string | null
          last_sync_at: string | null
          metadata: Json | null
          page_access_token: string
          page_id: string
          page_name: string | null
          scopes: string[] | null
          status: string
          updated_at: string
          user_id: string
          webhook_subscribed: boolean | null
        }
        Insert: {
          created_at?: string
          facebook_user_id?: string | null
          facebook_user_name?: string | null
          id?: string
          instagram_business_account_id?: string | null
          instagram_username?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          page_access_token: string
          page_id: string
          page_name?: string | null
          scopes?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_subscribed?: boolean | null
        }
        Update: {
          created_at?: string
          facebook_user_id?: string | null
          facebook_user_name?: string | null
          id?: string
          instagram_business_account_id?: string | null
          instagram_username?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          page_access_token?: string
          page_id?: string
          page_name?: string | null
          scopes?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_subscribed?: boolean | null
        }
        Relationships: []
      }
      meta_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          object_type: string | null
          page_id: string | null
          payload: Json
          processed: boolean | null
          processing_error: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          object_type?: string | null
          page_id?: string | null
          payload: Json
          processed?: boolean | null
          processing_error?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          object_type?: string | null
          page_id?: string | null
          payload?: Json
          processed?: boolean | null
          processing_error?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nuvemshop_abandoned_checkouts: {
        Row: {
          clicked_at: string | null
          contact_channel: string | null
          contacted_at: string | null
          created_at: string
          created_at_nuvemshop: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          expired_at: string | null
          id: string
          nuvemshop_checkout_id: string | null
          products: Json | null
          recovered: boolean | null
          recovery_flow_id: string | null
          recovery_status: string | null
          recovery_url: string | null
          status: string | null
          total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          contact_channel?: string | null
          contacted_at?: string | null
          created_at?: string
          created_at_nuvemshop?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expired_at?: string | null
          id?: string
          nuvemshop_checkout_id?: string | null
          products?: Json | null
          recovered?: boolean | null
          recovery_flow_id?: string | null
          recovery_status?: string | null
          recovery_url?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          contact_channel?: string | null
          contacted_at?: string | null
          created_at?: string
          created_at_nuvemshop?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expired_at?: string | null
          id?: string
          nuvemshop_checkout_id?: string | null
          products?: Json | null
          recovered?: boolean | null
          recovery_flow_id?: string | null
          recovery_status?: string | null
          recovery_url?: string | null
          status?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nuvemshop_orders: {
        Row: {
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          nuvemshop_order_id: string | null
          order_date: string | null
          order_number: string | null
          paid_to_supplier: boolean
          payment_method: string | null
          payment_status: string | null
          production_cost: number | null
          products: Json | null
          shipping_status: string | null
          status: string | null
          subtotal: number | null
          supplier: string | null
          total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          nuvemshop_order_id?: string | null
          order_date?: string | null
          order_number?: string | null
          paid_to_supplier?: boolean
          payment_method?: string | null
          payment_status?: string | null
          production_cost?: number | null
          products?: Json | null
          shipping_status?: string | null
          status?: string | null
          subtotal?: number | null
          supplier?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          nuvemshop_order_id?: string | null
          order_date?: string | null
          order_number?: string | null
          paid_to_supplier?: boolean
          payment_method?: string | null
          payment_status?: string | null
          production_cost?: number | null
          products?: Json | null
          shipping_status?: string | null
          status?: string | null
          subtotal?: number | null
          supplier?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          device_type: string | null
          duration_seconds: number | null
          id: string
          page_title: string | null
          page_url: string
          product_category: string | null
          product_id: string | null
          product_image_url: string | null
          product_name: string | null
          product_price: number | null
          referrer: string | null
          session_id: string | null
          state: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          page_title?: string | null
          page_url: string
          product_category?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string | null
          product_price?: number | null
          referrer?: string | null
          session_id?: string | null
          state?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          page_title?: string | null
          page_url?: string
          product_category?: string | null
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string | null
          product_price?: number | null
          referrer?: string | null
          session_id?: string | null
          state?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          media_type: string | null
          media_url: string | null
          shortcut: string | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          shortcut?: string | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          shortcut?: string | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      recovery_executions: {
        Row: {
          cart_items: Json | null
          cart_value: number | null
          checkout_id: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          flow_id: string | null
          id: string
          metadata: Json | null
          recovery_url: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_items?: Json | null
          cart_value?: number | null
          checkout_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          flow_id?: string | null
          id?: string
          metadata?: Json | null
          recovery_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_items?: Json | null
          cart_value?: number | null
          checkout_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          flow_id?: string | null
          id?: string
          metadata?: Json | null
          recovery_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_executions_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "nuvemshop_abandoned_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "recovery_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          segmentation_rules: Json | null
          steps: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          segmentation_rules?: Json | null
          steps?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          segmentation_rules?: Json | null
          steps?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      recovery_messages: {
        Row: {
          ab_winner: boolean | null
          channel: string
          clicked_at: string | null
          content: string | null
          created_at: string
          error_message: string | null
          execution_id: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          sent_at: string | null
          status: string | null
          step_number: number
          subject: string | null
          user_id: string | null
          variant: string | null
        }
        Insert: {
          ab_winner?: boolean | null
          channel: string
          clicked_at?: string | null
          content?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          step_number: number
          subject?: string | null
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          ab_winner?: boolean | null
          channel?: string
          clicked_at?: string | null
          content?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string | null
          step_number?: number
          subject?: string | null
          user_id?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_messages_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "recovery_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      send_logs: {
        Row: {
          campaign_id: string | null
          channel: string
          cluster_name: string | null
          content: string | null
          customer_id: string | null
          email: string | null
          error_message: string | null
          id: string
          phone: string | null
          queue_id: string | null
          response_data: Json | null
          sent_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel: string
          cluster_name?: string | null
          content?: string | null
          customer_id?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          phone?: string | null
          queue_id?: string | null
          response_data?: Json | null
          sent_at?: string
          status: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          cluster_name?: string | null
          content?: string | null
          customer_id?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          phone?: string | null
          queue_id?: string | null
          response_data?: Json | null
          sent_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "send_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "imported_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          priority: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_queue: {
        Row: {
          attempts: number | null
          campaign_id: string
          content: string
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          phone: string
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          campaign_id: string
          content: string
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          phone: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          campaign_id?: string
          content?: string
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          phone?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "imported_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "campaign_messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_rfm_scores: { Args: never; Returns: undefined }
      find_meta_user_by_verify_token: {
        Args: { _token: string }
        Returns: string
      }
      get_webhook_owner_user_id: { Args: never; Returns: string }
      increment_campaign_sent: {
        Args: { campaign_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
