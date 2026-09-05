/**
 * Typed shapes for ai_brand_memory's four JSONB columns — used so the
 * admin edits structured fields (name/bio/lists) instead of raw JSON text.
 * See lib/ai-department/system-prompt.ts, which just JSON.stringifies
 * whatever's stored here — these types only constrain the admin UI/action,
 * not what the AI itself can read.
 */

export type PersonMemory = {
  name: string;
  bio: string;
  positioning: string;
  marketplace_experience: {
    uzum: string;
    other_platforms: string[];
    skills: string[];
  };
  vibe_coding_experience: {
    duration: string;
    flow: string;
    stack: string[];
  };
  projects: { name: string; desc: string }[];
  story_arc: string;
};

export type AmaliyBiznesMemory = {
  handle: string;
  goal: string;
  topics: string[];
  content_pillars: string[];
  content_series: string[];
};

export type IzdoshMemory = {
  handle: string;
  website: string;
  principle: string;
  current_courses: string[];
  upcoming_courses: string[];
  tariffs_structure: { START: string[]; STANDARD: string[]; PRO: string[] };
  monthly_subscription_som: number;
  payment_options: string[];
  no_income_guarantee: boolean;
  content_pillars: string[];
};

export type VoiceRulesMemory = {
  philosophy: string;
  tone: string[];
  voice_persona: string;
  language: string;
  context: string;
  never_rules: string[];
  content_check_questions: string[];
  approval_required_for: string[];
};

export const EMPTY_PERSON: PersonMemory = {
  name: "",
  bio: "",
  positioning: "",
  marketplace_experience: { uzum: "", other_platforms: [], skills: [] },
  vibe_coding_experience: { duration: "", flow: "", stack: [] },
  projects: [],
  story_arc: "",
};

export const EMPTY_AMALIY_BIZNES: AmaliyBiznesMemory = {
  handle: "",
  goal: "",
  topics: [],
  content_pillars: [],
  content_series: [],
};

export const EMPTY_IZDOSH: IzdoshMemory = {
  handle: "",
  website: "",
  principle: "",
  current_courses: [],
  upcoming_courses: [],
  tariffs_structure: { START: [], STANDARD: [], PRO: [] },
  monthly_subscription_som: 0,
  payment_options: [],
  no_income_guarantee: true,
  content_pillars: [],
};

export const EMPTY_VOICE_RULES: VoiceRulesMemory = {
  philosophy: "",
  tone: [],
  voice_persona: "",
  language: "",
  context: "",
  never_rules: [],
  content_check_questions: [],
  approval_required_for: [],
};
