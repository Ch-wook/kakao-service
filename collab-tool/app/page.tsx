'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, Copy, CheckCircle2, Users, Zap } from 'lucide-react'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    if (roomCode) {
      navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <h1 className="text-xl font-bold text-gray-900">Collab</h1>
          </div>
          <nav className="text-sm text-gray-600">
            <span>메신저 협업 도구</span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            카톡방에서 협업하세요
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            채팅만으로는 복잡한 준비물, 역할 분담, 일정 조율을 실시간으로 관리하는 도구.
            <br />
            링크 하나로 모두가 함께 수정할 수 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg transition-shadow"
            >
              <Plus size={20} />
              새 협업 만들기
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-500 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              초대 링크로 참여
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">체크리스트</h3>
            <p className="text-gray-600 text-sm">
              준비물, 할 일을 실시간으로 관리하고 함께 체크하세요.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">역할 분담</h3>
            <p className="text-gray-600 text-sm">
              누가 무엇을 할 것인지 명확하게 정하고 진행 상황을 추적하세요.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">실시간 동기화</h3>
            <p className="text-gray-600 text-sm">
              모든 변경사항이 즉시 모두에게 반영됩니다. 로그인 불필요.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-6">이런 모임에서 활용하세요</h3>
          <ul className="grid grid-cols-2 gap-4 text-gray-700">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span> 여행 준비
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span> 동아리 활동
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span> 스터디 그룹
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span> 친구 모임
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span> 교회 사역
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span> 프로젝트 팀
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-gray-600">
          <p>© 2026 Collab. 메신저와 함께하는 가벼운 협업 도구.</p>
        </div>
      </footer>
    </div>
  )
}
