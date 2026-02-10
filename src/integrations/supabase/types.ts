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
          created_at: string
          customer_name: string | null
          error_message: string | null
          executed_at: string | null
          flow_id: string
          id: string
          phone: string
          scheduled_at: string
          status: string
          trigger_data: Json
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          executed_at?: string | null
          flow_id: string
          id?: string
          phone: string
          scheduled_at: string
          status?: string
          trigger_data?: Json
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          executed_at?: string | null
          flow_id?: string
          id?: string
          phone?: string
          scheduled_at?: string
          status?: string
          trigger_data?: Json
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
          created_at: string
          delay_unit: string
          delay_value: number
          id: string
          media_type: string | null
          media_url: string | null
          message_content: string
          name: string
          status: string
          trigger_event: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_content?: string
          name: string
          status?: string
          trigger_event: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_content?: string
          name?: string
          status?: string
          trigger_event?: string
          updated_at?: string
          variables?: Json | null
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
          last_message: string | null
          last_message_at: string | null
          status: string
          tab_id: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          channel: string
          contact_id: string
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          tab_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          channel?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          tab_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
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
          name: string
          order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          order?: number
          updated_at?: string
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
        }
        Relationships: []
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          sender_id: string | null
          sender_type: string
          status: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
          status?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
          status?: string | null
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
      nuvemshop_abandoned_checkouts: {
        Row: {
          checkout_id: number
          contact_channel: string | null
          contacted_at: string | null
          created_at: string
          created_at_nuvemshop: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          products: Json | null
          raw_data: Json | null
          recovered: boolean | null
          recovery_url: string | null
          status: string | null
          store_id: number
          total: number | null
          updated_at: string
          updated_at_nuvemshop: string | null
        }
        Insert: {
          checkout_id: number
          contact_channel?: string | null
          contacted_at?: string | null
          created_at?: string
          created_at_nuvemshop?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          products?: Json | null
          raw_data?: Json | null
          recovered?: boolean | null
          recovery_url?: string | null
          status?: string | null
          store_id: number
          total?: number | null
          updated_at?: string
          updated_at_nuvemshop?: string | null
        }
        Update: {
          checkout_id?: number
          contact_channel?: string | null
          contacted_at?: string | null
          created_at?: string
          created_at_nuvemshop?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          products?: Json | null
          raw_data?: Json | null
          recovered?: boolean | null
          recovery_url?: string | null
          status?: string | null
          store_id?: number
          total?: number | null
          updated_at?: string
          updated_at_nuvemshop?: string | null
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
          event: string
          id: string
          nuvemshop_order_id: number
          order_date: string | null
          order_number: string | null
          payment_method: string | null
          payment_status: string | null
          products: Json | null
          raw_data: Json | null
          shipping_status: string | null
          status: string | null
          store_id: number
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          event: string
          id?: string
          nuvemshop_order_id: number
          order_date?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products?: Json | null
          raw_data?: Json | null
          shipping_status?: string | null
          status?: string | null
          store_id: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          event?: string
          id?: string
          nuvemshop_order_id?: number
          order_date?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          products?: Json | null
          raw_data?: Json | null
          shipping_status?: string | null
          status?: string | null
          store_id?: number
          total?: number | null
          updated_at?: string
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
        }
        Relationships: []
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
      [_ in never]: never
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
