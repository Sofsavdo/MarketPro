export type SubscriptionStatus = "active" | "expired" | "canceled" | "trialing";
export type AccessSource = "subscription" | "purchase" | "none";
/**
 * Three lifetime, one-time-purchase tariffs per course — see the note on
 * courses.price_start in schema.sql. A monthly subscription grants "start"
 * access to every course but expires if not renewed; buying "standard" or
 * "pro" outright is permanent and adds live classes (2x/3x per week).
 */
export type AccessLevel = "start" | "standard" | "pro";
export type PaymentProvider = "click" | "payme" | "manual";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type LeadStatus = "new_lead" | "vip_offered" | "downsell_subscribed";

interface Table<Row, Insert, Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          full_name: string | null;
          phone: string | null;
          address: string | null;
          avatar_url: string | null;
          role: "student" | "instructor" | "admin";
          referral_code: string | null;
          referred_by: string | null;
          referral_reward_tier: number;
          lead_status: LeadStatus;
          current_streak: number;
          longest_streak: number;
          last_active_date: string | null;
          terms_accepted_at: string | null;
          signup_ip: string | null;
          created_at: string;
        },
        {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          address?: string | null;
          role?: string;
        },
        {
          full_name?: string | null;
          phone?: string | null;
          address?: string | null;
          referred_by?: string | null;
          referral_reward_tier?: number;
          lead_status?: LeadStatus;
          current_streak?: number;
          longest_streak?: number;
          last_active_date?: string | null;
          signup_ip?: string | null;
        }
      >;
      courses: Table<
        {
          id: string;
          slug: string;
          title_uz: string;
          title_ru: string;
          title_en: string;
          description_uz: string;
          description_ru: string;
          description_en: string;
          cover_url: string | null;
          instructor_name: string | null;
          instructor_avatar_url: string | null;
          duration_months: number;
          price_start: number;
          price_standard: number;
          price_pro: number;
          is_published: boolean;
          order_index: number;
          created_at: string;
        },
        Partial<Record<string, unknown>>
      >;
      modules: Table<
        {
          id: string;
          course_id: string;
          title_uz: string;
          title_ru: string;
          title_en: string;
          order_index: number;
        },
        Partial<Record<string, unknown>>
      >;
      lessons: Table<
        {
          id: string;
          course_id: string;
          module_id: string;
          title_uz: string;
          title_ru: string;
          title_en: string;
          video_url: string;
          bunny_video_id: string | null;
          thumbnail_url: string | null;
          content_uz: string | null;
          content_ru: string | null;
          content_en: string | null;
          order_index: number;
          is_free_preview: boolean;
        },
        Partial<Record<string, unknown>>
      >;
      lesson_materials: Table<
        {
          id: string;
          lesson_id: string;
          title_uz: string;
          title_ru: string;
          title_en: string;
          file_url: string;
          file_type: "pdf" | "pptx" | "doc" | "image" | "link";
          order_index: number;
        },
        Partial<Record<string, unknown>>
      >;
      quiz_questions: Table<
        {
          id: string;
          lesson_id: string;
          question_uz: string;
          question_ru: string;
          question_en: string;
          options_uz: string[];
          options_ru: string[];
          options_en: string[];
          correct_index: number;
          order_index: number;
        },
        Partial<Record<string, unknown>>
      >;
      user_progress: Table<
        {
          id: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          completed: boolean;
          quiz_passed: boolean | null;
          completed_at: string | null;
        },
        {
          user_id: string;
          lesson_id: string;
          course_id: string;
          completed?: boolean;
          quiz_passed?: boolean | null;
          completed_at?: string | null;
        }
      >;
      enrollments: Table<
        {
          id: string;
          user_id: string;
          course_id: string;
          source: "purchase" | "downsell_credit";
          tier: AccessLevel;
          created_at: string;
        },
        {
          user_id: string;
          course_id: string;
          source?: "purchase" | "downsell_credit";
          tier?: AccessLevel;
        },
        { tier?: AccessLevel }
      >;
      subscriptions: Table<
        {
          id: string;
          user_id: string;
          status: SubscriptionStatus;
          plan: "monthly" | "yearly";
          current_period_end: string;
          created_at: string;
        },
        {
          user_id: string;
          status?: SubscriptionStatus;
          plan: "monthly" | "yearly";
          current_period_end: string;
        }
      >;
      payments: Table<
        {
          id: string;
          user_id: string;
          provider: PaymentProvider;
          provider_transaction_id: string | null;
          amount: number;
          discount_amount: number;
          status: PaymentStatus;
          course_id: string | null;
          tier: AccessLevel | null;
          subscription_plan: "monthly" | "yearly" | null;
          installment_payment_id: string | null;
          promo_code: string | null;
          referral_click_token: string | null;
          terms_accepted_at: string | null;
          created_at: string;
        },
        {
          user_id: string;
          provider: PaymentProvider;
          provider_transaction_id?: string | null;
          amount: number;
          discount_amount?: number;
          status?: PaymentStatus;
          course_id?: string | null;
          tier?: AccessLevel | null;
          subscription_plan?: "monthly" | "yearly" | null;
          installment_payment_id?: string | null;
          promo_code?: string | null;
          referral_click_token?: string | null;
          terms_accepted_at?: string | null;
        }
      >;
      installment_plans: Table<
        {
          id: string;
          user_id: string;
          course_id: string;
          total_amount: number;
          installments_count: number;
          created_at: string;
        },
        {
          user_id: string;
          course_id: string;
          total_amount: number;
          installments_count: number;
        }
      >;
      installment_payments: Table<
        {
          id: string;
          plan_id: string;
          sequence_number: number;
          amount: number;
          due_date: string;
          status: "pending" | "paid";
          paid_at: string | null;
        },
        {
          plan_id: string;
          sequence_number: number;
          amount: number;
          due_date: string;
          status?: "pending" | "paid";
        },
        { status?: "pending" | "paid"; paid_at?: string | null }
      >;
      referrals: Table<
        {
          id: string;
          referrer_id: string;
          referred_id: string;
          created_at: string;
        },
        { referrer_id: string; referred_id: string }
      >;
      waitlist: Table<
        {
          id: string;
          course_id: string;
          email: string;
          phone: string | null;
          created_at: string;
        },
        { course_id: string; email: string; phone?: string | null }
      >;
      live_sessions: Table<
        {
          id: string;
          course_id: string;
          title: string;
          meet_url: string;
          scheduled_at: string;
          duration_minutes: number;
          required_tier: "standard" | "pro";
          created_at: string;
        },
        {
          course_id: string;
          title: string;
          meet_url: string;
          scheduled_at: string;
          duration_minutes?: number;
          required_tier?: "standard" | "pro";
        }
      >;
      session_questions: Table<
        {
          id: string;
          session_id: string;
          user_id: string;
          question: string;
          answer: string | null;
          answered_at: string | null;
          created_at: string;
        },
        { session_id: string; user_id: string; question: string },
        { answer?: string | null; answered_at?: string | null }
      >;
      operator_call_logs: Table<
        {
          id: string;
          user_id: string;
          note: string;
          created_by: string | null;
          created_at: string;
        },
        { user_id: string; note: string; created_by?: string | null }
      >;
      course_reviews: Table<
        {
          id: string;
          course_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          status: "pending" | "approved";
          created_at: string;
        },
        {
          course_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          status?: "pending" | "approved";
        },
        { rating?: number; comment?: string | null; status?: "pending" | "approved" }
      >;
      lesson_comments: Table<
        {
          id: string;
          lesson_id: string;
          user_id: string;
          comment: string;
          created_at: string;
        },
        { lesson_id: string; user_id: string; comment: string }
      >;
      certificates: Table<
        {
          id: string;
          course_id: string;
          user_id: string;
          issued_at: string;
        },
        { course_id: string; user_id: string }
      >;
      installment_leads: Table<
        {
          id: string;
          user_id: string | null;
          guest_name: string | null;
          guest_phone: string | null;
          course_id: string;
          tier: AccessLevel;
          monthly_amount: number;
          total_amount: number;
          status: "new" | "contacted" | "converted" | "declined";
          terms_accepted_at: string | null;
          created_at: string;
        },
        {
          user_id?: string | null;
          guest_name?: string | null;
          guest_phone?: string | null;
          course_id: string;
          tier: AccessLevel;
          monthly_amount: number;
          total_amount: number;
          status?: "new" | "contacted" | "converted" | "declined";
          terms_accepted_at?: string | null;
        },
        { status?: "new" | "contacted" | "converted" | "declined" }
      >;
      promo_codes: Table<
        {
          id: string;
          code: string;
          discount_percent: number;
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          active: boolean;
          created_at: string;
        },
        {
          code: string;
          discount_percent: number;
          max_uses?: number | null;
          expires_at?: string | null;
          active?: boolean;
        },
        { used_count?: number; active?: boolean }
      >;
      landing_blocks: Table<
        {
          id: string;
          key: string;
          is_visible: boolean;
          order_index: number;
          content: Record<string, unknown>;
          updated_at: string;
        },
        {
          key: string;
          is_visible?: boolean;
          order_index?: number;
          content?: Record<string, unknown>;
        }
      >;
      ai_brand_memory: Table<
        {
          id: string;
          singleton: boolean;
          person: Record<string, unknown>;
          brand_amaliy_biznes: Record<string, unknown>;
          brand_izdosh: Record<string, unknown>;
          voice_rules: Record<string, unknown>;
          updated_at: string;
        },
        {
          singleton?: boolean;
          person?: Record<string, unknown>;
          brand_amaliy_biznes?: Record<string, unknown>;
          brand_izdosh?: Record<string, unknown>;
          voice_rules?: Record<string, unknown>;
        }
      >;
      ai_products: Table<
        {
          id: string;
          name: string;
          status: "active" | "upcoming";
          tariffs: unknown[];
          notes: string | null;
          updated_at: string;
        },
        {
          name: string;
          status?: "active" | "upcoming";
          tariffs?: unknown[];
          notes?: string | null;
        }
      >;
      ai_competitors: Table<
        {
          id: string;
          name: string;
          category: string;
          platform: string | null;
          handle_or_url: string | null;
          positioning: string | null;
          created_at: string;
        },
        {
          name: string;
          category: string;
          platform?: string | null;
          handle_or_url?: string | null;
          positioning?: string | null;
        }
      >;
      ai_competitor_notes: Table<
        {
          id: string;
          competitor_id: string;
          summary: string;
          source_url: string | null;
          retrieved_at: string;
          agent_key: string | null;
          created_at: string;
        },
        {
          competitor_id: string;
          summary: string;
          source_url?: string | null;
          retrieved_at?: string;
          agent_key?: string | null;
        }
      >;
      ai_content_ideas: Table<
        {
          id: string;
          brand: "amaliy_biznes" | "izdosh_academy";
          pillar: string | null;
          format: string | null;
          hook: string | null;
          title: string;
          body: string | null;
          status: "idea" | "draft" | "review" | "approved" | "published";
          scheduled_for: string | null;
          score_value: number | null;
          score_hook: number | null;
          score_retention: number | null;
          score_shareability: number | null;
          score_saveability: number | null;
          score_brand_fit: number | null;
          score_originality: number | null;
          score_conversion: number | null;
          agent_key: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          brand: "amaliy_biznes" | "izdosh_academy";
          pillar?: string | null;
          format?: string | null;
          hook?: string | null;
          title: string;
          body?: string | null;
          status?: "idea" | "draft" | "review" | "approved" | "published";
          scheduled_for?: string | null;
          score_value?: number | null;
          score_hook?: number | null;
          score_retention?: number | null;
          score_shareability?: number | null;
          score_saveability?: number | null;
          score_brand_fit?: number | null;
          score_originality?: number | null;
          score_conversion?: number | null;
          agent_key?: string | null;
        },
        {
          status?: "idea" | "draft" | "review" | "approved" | "published";
          body?: string | null;
          scheduled_for?: string | null;
        }
      >;
      ai_scripts: Table<
        {
          id: string;
          content_idea_id: string;
          script: string;
          caption: string | null;
          cta: string | null;
          direction_notes: string | null;
          agent_key: string | null;
          created_at: string;
        },
        {
          content_idea_id: string;
          script?: string;
          caption?: string | null;
          cta?: string | null;
          direction_notes?: string | null;
          agent_key?: string | null;
        }
      >;
      ai_tasks: Table<
        {
          id: string;
          title: string;
          description: string | null;
          brand: "amaliy_biznes" | "izdosh_academy" | null;
          status: "backlog" | "planned" | "in_progress" | "review" | "approved" | "published";
          priority: "low" | "normal" | "high";
          deadline: string | null;
          related_content_idea_id: string | null;
          agent_key: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          title: string;
          description?: string | null;
          brand?: "amaliy_biznes" | "izdosh_academy" | null;
          status?: "backlog" | "planned" | "in_progress" | "review" | "approved" | "published";
          priority?: "low" | "normal" | "high";
          deadline?: string | null;
          related_content_idea_id?: string | null;
          agent_key?: string | null;
        },
        { status?: "backlog" | "planned" | "in_progress" | "review" | "approved" | "published" }
      >;
      ai_agents: Table<
        {
          id: string;
          key: string;
          name: string;
          role_title: string;
          system_prompt: string;
          created_at: string;
          updated_at: string;
        },
        {
          key: string;
          name: string;
          role_title: string;
          system_prompt: string;
        },
        { name?: string; role_title?: string; system_prompt?: string }
      >;
      ai_conversations: Table<
        {
          id: string;
          title: string | null;
          messages: unknown[];
          created_at: string;
          updated_at: string;
        },
        {
          title?: string | null;
          messages?: unknown[];
        },
        { title?: string | null; messages?: unknown[] }
      >;
      ai_reports: Table<
        {
          id: string;
          period: "weekly" | "monthly";
          period_start: string;
          period_end: string;
          content: Record<string, unknown>;
          agent_key: string | null;
          created_at: string;
        },
        {
          period: "weekly" | "monthly";
          period_start: string;
          period_end: string;
          content: Record<string, unknown>;
          agent_key?: string | null;
        }
      >;
      ai_objections: Table<
        {
          id: string;
          objection_text: string;
          empathetic_response: string;
          clarification: string | null;
          value_explanation: string | null;
          suggested_offer: string | null;
          agent_key: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          objection_text: string;
          empathetic_response: string;
          clarification?: string | null;
          value_explanation?: string | null;
          suggested_offer?: string | null;
          agent_key?: string | null;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
