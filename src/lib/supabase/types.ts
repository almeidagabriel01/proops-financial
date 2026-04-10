// Database types — placeholder until generated via `supabase gen types typescript`
// Run: npx supabase gen types --lang=typescript --project-id=wqvwbawhwypcsmzfbvpy > src/lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          plan: 'basic' | 'pro';
          trial_ends_at: string | null;
          stripe_customer_id: string | null;
          audio_enabled: boolean;
          ai_queries_this_month: number;
          ai_queries_reset_at: string;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          plan?: 'basic' | 'pro';
          trial_ends_at?: string | null;
          stripe_customer_id?: string | null;
          audio_enabled?: boolean;
          ai_queries_this_month?: number;
          ai_queries_reset_at?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          plan?: 'basic' | 'pro';
          trial_ends_at?: string | null;
          stripe_customer_id?: string | null;
          audio_enabled?: boolean;
          ai_queries_this_month?: number;
          ai_queries_reset_at?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          id: string;
          user_id: string;
          bank_name: string;
          account_label: string | null;
          last_import_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_name: string;
          account_label?: string | null;
          last_import_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_name?: string;
          account_label?: string | null;
          last_import_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bank_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      imports: {
        Row: {
          id: string;
          user_id: string;
          bank_account_id: string;
          file_name: string;
          file_type: 'ofx' | 'csv';
          storage_path: string;
          transaction_count: number;
          duplicates_skipped: number;
          status: 'processing' | 'categorizing' | 'completed' | 'failed';
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_account_id: string;
          file_name: string;
          file_type: 'ofx' | 'csv';
          storage_path: string;
          transaction_count?: number;
          duplicates_skipped?: number;
          status?: 'processing' | 'categorizing' | 'completed' | 'failed';
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_account_id?: string;
          file_name?: string;
          file_type?: 'ofx' | 'csv';
          storage_path?: string;
          transaction_count?: number;
          duplicates_skipped?: number;
          status?: 'processing' | 'categorizing' | 'completed' | 'failed';
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'imports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'imports_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          bank_account_id: string;
          import_id: string | null;
          external_id: string;
          date: string;
          description: string;
          amount: number;
          type: 'credit' | 'debit';
          category: string;
          category_source: 'pending' | 'ai' | 'user' | 'cache';
          category_confidence: number | null;
          installment_group_id: string | null;
          installment_number: number | null;
          recurring_rule_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_account_id: string;
          import_id?: string | null;
          external_id: string;
          date: string;
          description: string;
          amount: number;
          type: 'credit' | 'debit';
          category?: string;
          category_source?: 'pending' | 'ai' | 'user' | 'cache';
          category_confidence?: number | null;
          installment_group_id?: string | null;
          installment_number?: number | null;
          recurring_rule_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_account_id?: string;
          import_id?: string | null;
          external_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          type?: 'credit' | 'debit';
          category?: string;
          category_source?: 'pending' | 'ai' | 'user' | 'cache';
          category_confidence?: number | null;
          installment_group_id?: string | null;
          installment_number?: number | null;
          recurring_rule_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
        ];
      };
      category_dictionary: {
        Row: {
          id: string;
          user_id: string;
          description_pattern: string;
          category: string;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description_pattern: string;
          category: string;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description_pattern?: string;
          category?: string;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'category_dictionary_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      category_cache: {
        Row: {
          id: string;
          description_normalized: string;
          category: string;
          confidence: number | null;
          hit_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          description_normalized: string;
          category: string;
          confidence?: number | null;
          hit_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          description_normalized?: string;
          category?: string;
          confidence?: number | null;
          hit_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          monthly_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          monthly_limit: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          monthly_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          deadline: string;
          status: 'active' | 'completed' | 'canceled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          deadline: string;
          status?: 'active' | 'completed' | 'canceled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          deadline?: string;
          status?: 'active' | 'completed' | 'canceled';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'goals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          conversation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          conversation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          conversation_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      installment_groups: {
        Row: {
          id: string;
          user_id: string;
          bank_account_id: string;
          description: string;
          total_amount: number;
          installment_count: number;
          installment_amount: number;
          first_date: string;
          category: string;
          source: 'import' | 'manual';
          source_transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_account_id: string;
          description: string;
          total_amount: number;
          installment_count: number;
          installment_amount: number;
          first_date: string;
          category?: string;
          source?: 'import' | 'manual';
          source_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_account_id?: string;
          description?: string;
          total_amount?: number;
          installment_count?: number;
          installment_amount?: number;
          first_date?: string;
          category?: string;
          source?: 'import' | 'manual';
          source_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'installment_groups_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'installment_groups_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          bank_account_id: string;
          description: string;
          amount: number;
          type: 'credit' | 'debit';
          category: string;
          frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual';
          start_date: string;
          end_date: string | null;
          next_due_date: string;
          status: 'active' | 'paused' | 'canceled';
          source: 'auto_detected' | 'manual';
          auto_detect_confidence: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_account_id: string;
          description: string;
          amount: number;
          type: 'credit' | 'debit';
          category?: string;
          frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual';
          start_date: string;
          end_date?: string | null;
          next_due_date: string;
          status?: 'active' | 'paused' | 'canceled';
          source?: 'auto_detected' | 'manual';
          auto_detect_confidence?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_account_id?: string;
          description?: string;
          amount?: number;
          type?: 'credit' | 'debit';
          category?: string;
          frequency?: 'weekly' | 'biweekly' | 'monthly' | 'annual';
          start_date?: string;
          end_date?: string | null;
          next_due_date?: string;
          status?: 'active' | 'paused' | 'canceled';
          source?: 'auto_detected' | 'manual';
          auto_detect_confidence?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_rules_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_rules_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      scheduled_transactions: {
        Row: {
          id: string;
          user_id: string;
          bank_account_id: string;
          description: string;
          amount: number;
          type: 'credit' | 'debit';
          category: string;
          due_date: string;
          status: 'pending' | 'paid' | 'overdue' | 'canceled';
          recurring_rule_id: string | null;
          installment_group_id: string | null;
          installment_number: number | null;
          paid_transaction_id: string | null;
          paid_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_account_id: string;
          description: string;
          amount: number;
          type: 'credit' | 'debit';
          category?: string;
          due_date: string;
          status?: 'pending' | 'paid' | 'overdue' | 'canceled';
          recurring_rule_id?: string | null;
          installment_group_id?: string | null;
          installment_number?: number | null;
          paid_transaction_id?: string | null;
          paid_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_account_id?: string;
          description?: string;
          amount?: number;
          type?: 'credit' | 'debit';
          category?: string;
          due_date?: string;
          status?: 'pending' | 'paid' | 'overdue' | 'canceled';
          recurring_rule_id?: string | null;
          installment_group_id?: string | null;
          installment_number?: number | null;
          paid_transaction_id?: string | null;
          paid_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scheduled_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_transactions_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          billing_cycle: 'monthly' | 'annual';
          status: 'active' | 'past_due' | 'canceled' | 'expired' | 'pending';
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          billing_cycle: 'monthly' | 'annual';
          status?: 'active' | 'past_due' | 'canceled' | 'expired' | 'pending';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string | null;
          billing_cycle?: 'monthly' | 'yearly';
          status?: 'active' | 'past_due' | 'canceled' | 'expired' | 'pending';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      normalize_description: {
        Args: { raw: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};

// Convenience type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
