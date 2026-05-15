'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface AuthSession {
  user: {
    id: string
    email?: string
  } | null
  nickname: string | null
}

const NICKNAME_STORAGE_KEY = 'collab_nickname'
const SESSION_STORAGE_KEY = 'collab_session'

export const useAuth = () => {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    nickname: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기화: 익명 로그인 및 닉네임 복구
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 1. 현재 세션 확인
        const { data: currentSession } = await supabase.auth.getSession()

        if (currentSession.session) {
          // 이미 로그인되어 있음
          const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY)
          setSession({
            user: currentSession.session.user,
            nickname: storedNickname,
          })
          setIsLoading(false)
          return
        }

        // 2. 익명 로그인
        const { data, error: signInError } =
          await supabase.auth.signInAnonymously()

        if (signInError) {
          throw new Error(signInError.message)
        }

        if (data.session) {
          // 3. localStorage에서 닉네임 복구
          const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY)

          setSession({
            user: data.session.user,
            nickname: storedNickname,
          })
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '인증 초기화 실패'
        )
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // 닉네임 설정
  const setNickname = (nickname: string) => {
    if (!nickname.trim()) {
      setError('닉네임은 비울 수 없습니다')
      return false
    }

    if (nickname.length > 20) {
      setError('닉네임은 20자 이하여야 합니다')
      return false
    }

    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname)
    setSession((prev) => ({
      ...prev,
      nickname,
    }))
    setError(null)
    return true
  }

  // 닉네임 제거
  const clearNickname = () => {
    localStorage.removeItem(NICKNAME_STORAGE_KEY)
    setSession((prev) => ({
      ...prev,
      nickname: null,
    }))
  }

  // 로그아웃
  const logout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem(NICKNAME_STORAGE_KEY)
      setSession({
        user: null,
        nickname: null,
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '로그아웃 실패'
      )
    }
  }

  return {
    session,
    isLoading,
    error,
    setNickname,
    clearNickname,
    logout,
    isAuthenticated: !!session.user,
    hasNickname: !!session.nickname,
  }
}
