/**
 * 색상 배열 - 참여자 구분용
 */
export const PARTICIPANT_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#D97706', // Orange
]

/**
 * 무작위 색상 선택
 */
export const getRandomColor = (): string => {
  return PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)]
}

/**
 * UUID 생성
 */
export const generateId = (): string => {
  return crypto.randomUUID()
}

/**
 * 현재 시간 포맷팅 (ISO 8601)
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString()
}

/**
 * 상대 시간 표시 (예: "2시간 전")
 */
export const getRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`

  return targetDate.toLocaleDateString('ko-KR')
}

/**
 * 공유 URL 생성
 */
export const generateShareUrl = (shareCode: string): string => {
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000'

  return `${baseUrl}/room/${shareCode}`
}

/**
 * 클립보드에 복사
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 검증: 닉네임
 */
export const isValidNickname = (nickname: string): boolean => {
  return nickname.trim().length > 0 && nickname.length <= 20
}

/**
 * 검증: 방 제목
 */
export const isValidRoomTitle = (title: string): boolean => {
  return title.trim().length > 0 && title.length <= 50
}
