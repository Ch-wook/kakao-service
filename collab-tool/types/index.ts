export interface Room {
  id: string
  title: string
  share_code?: string
  created_at: string
}

export interface Participant {
  id: string
  room_id: string
  nickname: string
  last_active: string
  created_at: string
  color?: string
}

export interface Widget {
  id: string
  room_id: string
  type: 'checklist' | 'expense' | 'vote' | 'memo' | 'schedule' | 'roles' | 'poll' | 'member'
  title?: string
  data: Record<string, unknown>
  order: number
  created_at?: string
  updated_at?: string
}

// Widget별 데이터 타입
export interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  assignee?: string
  created_at?: string
}

export interface ChecklistData {
  items: ChecklistItem[]
  [key: string]: unknown
}

export interface ExpensePayer {
  name: string
  paid: boolean
}

export interface ExpenseData {
  totalAmount: number
  description: string
  payers: ExpensePayer[]
}

export interface VoteOption {
  id: string
  text: string
  votes: string[] // 투표자 ID 배열
}

export interface VoteData {
  question: string
  options: VoteOption[]
  created_at?: string
}

export interface ScheduleItem {
  id: string
  title: string
  date: string
  time?: string
  participants: string[]
  location?: string
}

export interface ScheduleData {
  items: ScheduleItem[]
}

export interface RoleItem {
  id: string
  title: string
  assignee: string
  description?: string
}

export interface RoleData {
  items: RoleItem[]
}

export interface MemoData {
  content: string
  updated_at?: string
}

export type MemberStatus = 'unknown' | 'attending' | 'arrived' | 'preparing' | 'absent' | 'home'

export interface Member {
  id: string
  name: string
  status: MemberStatus
  note?: string
}

export interface MemberGroup {
  id: string
  name: string
  targetCount?: number
  members: Member[]
}

export interface MemberData {
  groups: MemberGroup[]
}
