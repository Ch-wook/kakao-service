/**
 * 애플리케이션 설정 상수
 */

export const APP_NAME = 'Collab'
export const APP_DESCRIPTION = '메신저 협업 도구'

/**
 * 위젯 타입 설정
 */
export const WIDGET_TYPES = {
  CHECKLIST: 'checklist',
  EXPENSE: 'expense',
  VOTE: 'vote',
  MEMO: 'memo',
  SCHEDULE: 'schedule',
  ROLES: 'roles',
  POLL: 'poll',
} as const

export const WIDGET_LABELS: Record<string, string> = {
  checklist: '체크리스트',
  expense: '회비 관리',
  vote: '투표',
  memo: '공동 메모',
  schedule: '일정 조율',
  roles: '역할 분담',
  poll: '실시간 투표',
}

export const WIDGET_DESCRIPTIONS: Record<string, string> = {
  checklist: '준비물, 할 일을 관리하세요',
  expense: '누가 얼마를 냈는지 추적하세요',
  vote: '장소나 시간을 투표로 정하세요',
  memo: '자유롭게 메모를 작성하세요',
  schedule: '일정을 조율하고 공유하세요',
  roles: '역할을 분담하고 관리하세요',
  poll: '의견을 빠르게 수렴하세요',
}

/**
 * Supabase 관련 상수
 */
export const SUPABASE_TABLES = {
  ROOMS: 'rooms',
  PARTICIPANTS: 'participants',
  WIDGETS: 'widgets',
  ACTIVITY_LOG: 'activity_log',
} as const

/**
 * API 경로
 */
export const API_ROUTES = {
  ROOMS: '/api/rooms',
  PARTICIPANTS: '/api/participants',
  WIDGETS: '/api/widgets',
} as const

/**
 * 페이지 경로
 */
export const ROUTES = {
  HOME: '/',
  CREATE: '/create',
  ROOM: (id: string) => `/room/${id}`,
  JOIN: '/join',
} as const

/**
 * 제한 설정
 */
export const LIMITS = {
  MAX_ROOM_TITLE_LENGTH: 50,
  MAX_NICKNAME_LENGTH: 20,
  MAX_PARTICIPANTS: 100,
  MAX_WIDGETS_PER_ROOM: 50,
  ACTIVITY_LOG_RETENTION_DAYS: 30,
} as const

/**
 * 폴링 인터벌 (Realtime이 안 될 경우 폴백)
 */
export const POLLING_INTERVALS = {
  DEFAULT: 5000, // 5초
  SLOW: 10000, // 10초
  FAST: 1000, // 1초
} as const

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  INVALID_NICKNAME: '닉네임은 1~20자여야 합니다',
  INVALID_ROOM_TITLE: '제목은 1~50자여야 합니다',
  ROOM_NOT_FOUND: '협업을 찾을 수 없습니다',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다',
  SUPABASE_ERROR: '데이터베이스 오류가 발생했습니다',
} as const

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  ROOM_CREATED: '협업이 만들어졌습니다',
  JOINED: '참여했습니다',
  COPIED: '복사되었습니다',
  SAVED: '저장되었습니다',
} as const
