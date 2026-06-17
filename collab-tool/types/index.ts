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

export interface TabConfig {
  id: string
  name: string
}

export interface TabConfigData {
  tabs: TabConfig[]
  menuOrder?: string[]
}

export interface NoticeData {
  content: string
  updated_at?: string
  updated_by?: string
}

export interface Widget {
  id: string
  room_id: string
  type: 'checklist' | 'expense' | 'vote' | 'memo' | 'schedule' | 'roles' | 'poll' | 'member' | 'ledger' | 'fee' | 'tab-config' | 'notice' | 'image-gallery' | 'music-player' | 'file-board' | 'study-plan' | 'retreat'
  title?: string
  data: Record<string, unknown>
  order: number
  tab_id?: string | null
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

export type ScheduleColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink'

export interface ScheduleItem {
  id: string
  title: string
  date: string          // YYYY-MM-DD
  time?: string         // HH:MM
  endTime?: string      // HH:MM
  location?: string
  memo?: string
  participants: string[]
  color?: ScheduleColor
  created_at: string
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
  saved_by?: string
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
  category: string           // 항목
  description: string        // 상세내역
  amount: number             // 금액 (항상 양수)
  taxType?: TaxType          // 과세구분 (구버전 호환용, 신규 입력 시 미사용)
  paymentMethod?: PaymentMethod // 결제수단
  voucherType?: VoucherType  // 증빙서류
  memo?: string              // 비고
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

// ── 이미지 갤러리 ──────────────────────────────────────────

export interface GalleryImage {
  id: string
  url: string
  storagePath: string
  filename: string
  uploaderNickname?: string
  uploadedAt: string
  size: number
}

export interface ImageGalleryData {
  images: GalleryImage[]
}

// ── 음악 플레이어 ──────────────────────────────────────────

export interface MusicTrack {
  id: string
  url: string
  storagePath: string
  name: string
  originalFilename: string
  uploaderNickname?: string
  uploadedAt: string
  size: number
}

export interface MusicPlayerData {
  tracks: MusicTrack[]
}

// ── 파일 공유 보드 ─────────────────────────────────────────

export interface SharedFile {
  id: string
  url: string
  storagePath: string
  filename: string
  size: number
  mimeType: string
  uploaderNickname?: string
  uploadedAt: string
}

export interface FileBoardData {
  files: SharedFile[]
}

// ── 학습계획표 ─────────────────────────────────────────

export interface StudyLecture {
  id: string
  title: string
  description?: string
  totalCount: number        // 전체 강의 수
  createdAt: string
}

export interface StudyDailyLog {
  id: string
  lectureId: string
  logDate: string           // YYYY-MM-DD
  watchedCount: number
  studyMinutes: number
  memo?: string
}

export interface StudyPlanData {
  lectures: StudyLecture[]
  dailyLogs: StudyDailyLog[]
  goalMinutes: number       // 일일 목표 학습 시간 (분), 기본값 180
}

// ── 하계성회 ─────────────────────────────────────────

export interface RetreatMember {
  id: string
  name: string
  group: number             // 순 번호 (1, 2, 3 ...)
  registrationStatus: 'none' | 'pre' | 'confirmed' // 미등록/가등록/선등록
}

export interface RetreatTimeSlot {
  id: string
  label: string             // "월(저녁)", "화(오전)" 등
  attendeeIds: string[]     // 참석 member IDs
}

export interface RetreatVisitation {
  id: string
  memberName: string
  date: string              // YYYY-MM-DD
  status: 'planned' | 'completed'
  memo?: string
}

export interface RetreatData {
  eventTitle: string
  eventSubtitle: string
  startDate: string         // YYYY-MM-DD
  endDate: string
  location: string
  groupName: string
  totalGoal: number
  members: RetreatMember[]
  timeSlots: RetreatTimeSlot[]
  visitations: RetreatVisitation[]
}
