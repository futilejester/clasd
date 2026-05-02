// Database types for Clasd. Hand-written to mirror migrations 00001-00007.

export type Plan = 'free' | 'pro';
export type ClassSessionStatus = 'scheduled' | 'cancelled' | 'completed';
export type EnrolmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'comped' | 'refunded';
export type AttendanceStatus = 'attended' | 'absent' | 'excused';
export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed';
export type ScheduledMessageStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled';
export type SegmentTarget = 'students' | 'enrolments';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: Plan;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  pending_checkout_id: string | null;
  sending_domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  instructor_name: string | null;
  default_duration_minutes: number;
  location: string | null;
  cover_image_url: string | null;
  archived: boolean;
  calendar_token: string;
  auto_remind: boolean;
  auto_remind_lead_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: string;
  class_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  status: ClassSessionStatus;
  capacity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  tags: string[];
  custom_attributes: Record<string, unknown>;
  subscribed: boolean;
  unsubscribed_at: string | null;
  last_active_at: string | null;
  notes: string | null;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
}

export interface Enrolment {
  id: string;
  user_id: string;
  student_id: string;
  class_id: string;
  status: EnrolmentStatus;
  payment_status: PaymentStatus;
  skill_level: string | null;
  attendance_count: number;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  enrolment_id: string;
  session_id: string;
  status: AttendanceStatus;
  recorded_at: string;
}

export interface SignupForm {
  id: string;
  user_id: string;
  class_id: string | null;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  custom_fields: CustomField[];
  primary_color: string | null;
  button_text: string;
  success_title: string;
  success_message: string;
  active: boolean;
  submissions_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

export interface Segment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules: SegmentRules;
  target: SegmentTarget;
  member_count: number;
  last_evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentRules {
  combinator: 'and' | 'or';
  conditions: Array<SegmentCondition | SegmentRules>;
}

export interface SegmentCondition {
  field: string;
  op:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'not_contains'
    | 'in'
    | 'not_in'
    | 'is_null'
    | 'is_not_null';
  value?: string | number | boolean | string[] | number[];
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body_html: string | null;
  body_json: Record<string, unknown> | null;
  template_id: string | null;
  segment_id: string | null;
  class_id: string | null;
  status: CampaignStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  attach_ics: boolean;
  ics_session_id: string | null;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  user_id: string;
  campaign_id: string | null;
  student_id: string;
  send_at: string;
  sent_at: string | null;
  status: ScheduledMessageStatus;
  reminder_kind: string | null;
  session_id: string | null;
  rendered_subject: string | null;
  rendered_body: string | null;
  resend_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
}

export interface DeliveryEvent {
  id: string;
  user_id: string;
  scheduled_message_id: string | null;
  campaign_id: string | null;
  student_id: string | null;
  resend_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}
