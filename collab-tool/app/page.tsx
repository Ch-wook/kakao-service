'use client'

import Link from 'next/link'
import { Plus, CheckCircle2, Zap, Wallet } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <h1 className="text-xl font-bold text-gray-900">Collab</h1>
          </div>
          <span className="text-sm text-gray-500">메신저 협업 도구</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            로그인 없이 바로 시작
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            카톡방에서<br />바로 협업하세요
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            링크 하나를 카톡방에 공유하면<br />
            모두가 실시간으로 함께 수정할 수 있어요
          </p>
        </div>

        {/* CTA */}
        <div className="mb-10">
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-500 text-white font-semibold rounded-2xl text-base active:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus size={20} />
            새 협업 만들기
          </Link>

          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              초대를 받으셨나요?
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              카톡방에서 공유된 링크를 탭하면 바로 참여할 수 있어요
            </p>
          </div>
        </div>

        {/* 사용 방법 */}
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 text-center">사용 방법</h3>
          <div className="space-y-3">
            {[
              { step: '1', text: '협업 이름을 입력하고 만들기', sub: '로그인 없이 바로 시작' },
              { step: '2', text: '링크를 카톡방에 공유', sub: '상단 공유 버튼 탭' },
              { step: '3', text: '팀원이 링크 탭으로 참여', sub: '닉네임만 입력하면 끝' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-none">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.text}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 기능 소개 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-4 text-center">지원하는 위젯</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <CheckCircle2 size={20} className="text-blue-500 mb-2" />
              <p className="text-sm font-semibold text-gray-800">체크리스트</p>
              <p className="text-xs text-gray-400 mt-0.5">준비물, 할 일 관리</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <Wallet size={20} className="text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-gray-800">정산 (N빵)</p>
              <p className="text-xs text-gray-400 mt-0.5">1인당 금액 자동 계산</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 col-span-2">
              <Zap size={20} className="text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-gray-800">실시간 동기화</p>
              <p className="text-xs text-gray-400 mt-0.5">모든 변경사항이 즉시 모두에게 반영돼요</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-lg mx-auto px-6 py-6 text-center text-xs text-gray-400">
          © 2026 Collab · 메신저와 함께하는 가벼운 협업 도구
        </div>
      </footer>
    </div>
  )
}
