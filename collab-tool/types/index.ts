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
  type: 'checklist' | 'expense' | 'vote' | 'memo' | 'schedule' | 'roles' | 'poll' | 'member' | 'ledger' | 'fee'
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
  paidAmount?: number
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

// ── 회계장부 ──────────────────────────────────────────────

export type LedgerEntryType = 'income' | 'expense'
export type TaxType = '과세' | '면세' | '비과세' | '영세율'
export type PaymentMethod = '현금' | '카드' | '계좌이체' | '어음' | '기타'
export type VoucherType = '세금계산서' | '계산서' | '영수증' | '카드매출전표' | '없음'

export interface LedgerEntry {
  id: string
  date: string               // YYYY-MM-DD
  type: LedgerEntryType      // 수입 / 지출
  category: string           // 계정과목
  description: string        // 적요
  amount: number             // 금액 (항상 양수)
  taxType: TaxType           // 과세구분
  paymentMethod: PaymentMethod // 결제수단
  voucherType: VoucherType   // 증빙서류
  memo: string               // 비고
  created_at: string
}

export interface LedgerData {
  entries: LedgerEntry[]
  openingBalance: number     // 기초잔액
  companyName: string        // 상호/회사명
  businessNumber: string     // 사업자등록번호
  fiscalYear: string         // 회계연도
}

// ── 납부 체크 ─────────────────────────────────────────────

export interface FeeEntry {
  id: string
  name: string
  amount?: number
  paid: boolean
  note?: string
}

export interface FeeData {
  defaultAmount: number
  entries: FeeEntry[]
}
