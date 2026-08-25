export type SubscriptionStatus = "active" | "expired" | "canceled" | "trialing";
export type AccessSource = "subscription" | "purchase" | "none";
export type PlanTier = "start" | "standard" | "pro";
export type PaymentProvider = "click" | "payme";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

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
          avatar_url: string | null;
          role: "student" | "instructor" | "admin";
          created_at: string;
        },
        { id: string; full_name?: string | null; phone?: string | null; role?: string }
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
          content_uz: string | null;
          content_ru: string | null;
          content_en: string | null;
          order_index: number;
          is_free_preview: boolean;
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
          tier: PlanTier;
          source: "purchase" | "subscription";
          created_at: string;
        },
        { user_id: string; course_id: string; tier: PlanTier; source?: "purchase" | "subscription" }
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
          status: PaymentStatus;
          course_id: string | null;
          tier: PlanTier | null;
          subscription_plan: "monthly" | "yearly" | null;
          created_at: string;
        },
        {
          user_id: string;
          provider: PaymentProvider;
          provider_transaction_id?: string | null;
          amount: number;
          status?: PaymentStatus;
          course_id?: string | null;
          tier?: PlanTier | null;
          subscription_plan?: "monthly" | "yearly" | null;
        }
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
          tier: "standard" | "pro";
          title: string;
          meet_url: string;
          scheduled_at: string;
          duration_minutes: number;
          created_at: string;
        },
        {
          course_id: string;
          tier: "standard" | "pro";
          title: string;
          meet_url: string;
          scheduled_at: string;
          duration_minutes?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
