'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trash2, RefreshCw, LogOut, Shield, Users, LayoutGrid, Clock } from 'lucide-react'

interface RoomWithStats {
  id: string
  title: string
  created_at: string
  participantCount: number
  widgetCount: number
  lastActivity: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [inputPassword, setInputPassword] = useState('')
  const [rooms, setRooms] = useState<RoomWithStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [bulkDays, setBulkDays] = useState(30)

  const fetchRooms = useCallback(async (pw: string) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/rooms', {
        headers: { 'x-admin-password': pw },
      })
      if (res.status === 401) { setError('비밀번호가 틀렸습니다'); setPassword(''); return }
      if (!res.ok) throw new Error('조회 실패')
      const data = await res.json()
      setRooms(data)
    } catch {
      setError('방 목록을 불러오지 못했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pw')
    if (saved) { setPassword(saved); fetchRooms(saved) }
  }, [fetchRooms])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    sessionStorage.setItem('admin_pw', inputPassword)
    setPassword(inputPassword)
    await fetchRooms(inputPassword)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_pw')
    setPassword('')
    setRooms([])
    setInputPassword('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 방을 삭제하시겠습니까? 위젯과 참여자도 모두 삭제됩니다.')) return
    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      })
      if (!res.ok) throw new Error()
      setRooms((prev) => prev.filter((r) => r.id !== id))
    } catch {
      alert('삭제에 실패했습니다')
    } finally {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const handleBulkDelete = async () => {
    const targets = rooms.filter((r) => daysSince(r.lastActivity) >= bulkDays)
    if (targets.length === 0) { alert(`최근 ${bulkDays}일 이상 비활성 방이 없습니다`); return }
    if (!confirm(`${targets.length}개의 방을 삭제하시겠습니까?`)) return
    for (const room of targets) await handleDelete(room.id)
  }

  // 로그인 화면
  if (!password) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">관리자 로그인</h1>
              <p className="text-gray-500 text-xs">Collab Admin</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="관리자 비밀번호"
              autoFocus
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!inputPassword}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    )
  }

  const totalParticipants = rooms.reduce((s, r) => s + r.participantCount, 0)
  const totalWidgets = rooms.reduce((s, r) => s + r.widgetCount, 0)
  const inactiveRooms = rooms.filter((r) => daysSince(r.lastActivity) >= bulkDays).length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-indigo-400" />
            <span className="font-bold text-lg">Collab 관리자</span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => fetchRooms(password)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: LayoutGrid, label: '전체 방', value: rooms.length, color: 'text-indigo-400' },
            { icon: Users, label: '전체 참여자', value: totalParticipants, color: 'text-blue-400' },
            { icon: LayoutGrid, label: '전체 위젯', value: totalWidgets, color: 'text-purple-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <Icon size={18} className={`${color} mb-3`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-gray-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* 일괄 삭제 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Clock size={16} className="text-amber-400" />
            <span className="text-sm text-gray-300">비활성 방 일괄 삭제</span>
            <select
              value={bulkDays}
              onChange={(e) => setBulkDays(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {[7, 14, 30, 60, 90].map((d) => (
                <option key={d} value={d}>최근 {d}일 이상 미사용</option>
              ))}
            </select>
            <span className="text-amber-400 text-sm font-medium">{inactiveRooms}개 해당</span>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={inactiveRooms === 0}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            일괄 삭제
          </button>
        </div>

        {/* 방 목록 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold">방 목록</h2>
            <span className="text-gray-500 text-sm">{rooms.length}개</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={24} className="animate-spin text-gray-600" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-20 text-gray-600">방이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {/* 테이블 헤더 */}
              <div className="hidden md:grid grid-cols-[1fr_120px_80px_80px_160px_60px] gap-4 px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">
                <span>방 제목</span>
                <span>생성일</span>
                <span>참여자</span>
                <span>위젯</span>
                <span>마지막 활동</span>
                <span></span>
              </div>
              {rooms.map((room) => {
                const inactive = daysSince(room.lastActivity)
                const isOld = inactive >= bulkDays
                return (
                  <div
                    key={room.id}
                    className={`flex flex-col md:grid md:grid-cols-[1fr_120px_80px_80px_160px_60px] gap-3 md:gap-4 px-5 py-4 items-start md:items-center text-sm transition-colors hover:bg-gray-800/50 ${isOld ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-start w-full md:w-auto md:min-w-0">
                      <div className="min-w-0">
                        <Link 
                          href={`/room/${room.id}`}
                          className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline truncate block"
                        >
                          {room.title}
                        </Link>
                        <p className="text-gray-600 text-xs mt-0.5 truncate">{room.id}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(room.id)}
                        disabled={deletingIds.has(room.id)}
                        className="md:hidden flex items-center justify-center p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-40"
                        aria-label="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:contents">
                      <div className="flex items-center gap-1.5 md:block">
                        <span className="md:hidden text-gray-500 text-xs">생성일:</span>
                        <span className="text-gray-400 text-xs">{formatDate(room.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:block">
                        <span className="md:hidden text-gray-500 text-xs">참여자:</span>
                        <span className="text-gray-300">{room.participantCount}명</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:block">
                        <span className="md:hidden text-gray-500 text-xs">위젯:</span>
                        <span className="text-gray-300">{room.widgetCount}개</span>
                      </div>
                      <div className="w-full md:w-auto flex items-center gap-1.5 md:block mt-1 md:mt-0">
                        <span className="md:hidden text-gray-500 text-xs">마지막 활동:</span>
                        <div className="flex flex-wrap items-center">
                          <span className="text-gray-400 text-xs">{formatDate(room.lastActivity)}</span>
                          {inactive > 0 && (
                            <span className={`ml-1 text-xs ${isOld ? 'text-red-400' : 'text-gray-600'}`}>
                              ({inactive}일 전)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(room.id)}
                      disabled={deletingIds.has(room.id)}
                      className="hidden md:flex items-center justify-center p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-40"
                      aria-label="삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
