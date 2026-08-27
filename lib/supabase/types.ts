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
          user_id: string;
          course_id: string;
          tier: AccessLevel;
          monthly_amount: number;
          total_amount: number;
          status: "new" | "contacted" | "converted" | "declined";
          created_at: string;
        },
        {
          user_id: string;
          course_id: string;
          tier: AccessLevel;
          monthly_amount: number;
          total_amount: number;
          status?: "new" | "contacted" | "converted" | "declined";
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
