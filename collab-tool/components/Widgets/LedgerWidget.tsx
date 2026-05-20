'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  BookOpen, Plus, Trash2, Download, Settings2, X, Edit2, ChevronDown, ChevronUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type {
  Widget, LedgerData, LedgerEntry, LedgerEntryType, TaxType, PaymentMethod, VoucherType,
} from '@/types'
import { generateId, getCurrentTimestamp } from '@/lib/utils'

// ── 계정과목 목록 ─────────────────────────────────────────
const INCOME_CATEGORIES = [
  '매출액', '이자수입', '임대수입', '배당수입', '잡수익', '기타수입',
]
const EXPENSE_CATEGORIES = [
  '급여/인건비', '4대보험료', '복리후생비', '교통비/여비', '통신비',
  '임차료', '소모품비', '광고선전비', '접대비', '수수료',
  '세금과공과', '보험료', '수도광열비', '수선비', '감가상각비',
  '지급이자', '잡비', '기타지출',
]
const TAX_TYPES: TaxType[] = ['과세', '면세', '비과세', '영세율']
const PAYMENT_METHODS: PaymentMethod[] = ['현금', '카드', '계좌이체', '어음', '기타']
const VOUCHER_TYPES: VoucherType[] = ['세금계산서', '계산서', '영수증', '카드매출전표', '없음']

// ── Props ─────────────────────────────────────────────────
interface LedgerWidgetProps {
  widget: Widget
  onUpdateData: (widgetId: string, data: LedgerData) => Promise<boolean>
  onDeleteWidget?: (widgetId: string) => Promise<boolean>
}

// ── 입력 폼 상태 ──────────────────────────────────────────
interface EntryForm {
  date: string
  type: LedgerEntryType
  category: string
  description: string
  amount: string
  taxType: TaxType
  paymentMethod: PaymentMethod
  voucherType: VoucherType
  memo: string
}

const makeDefaultForm = (): EntryForm => ({
  date: new Date().toISOString().split('T')[0],
  type: 'income',
  category: '',
  description: '',
  amount: '',
  taxType: '과세',
  paymentMethod: '계좌이체',
  voucherType: '없음',
  memo: '',
})

// ── 숫자 포맷 ─────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ko-KR')

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function LedgerWidget({ widget, onUpdateData, onDeleteWidget }: LedgerWidgetProps) {
  const raw = widget.data as unknown as Partial<LedgerData>
  const data: LedgerData = {
    entries: raw.entries ?? [],
    openingBalance: raw.openingBalance ?? 0,
    companyName: raw.companyName ?? '',
    businessNumber: raw.businessNumber ?? '',
    fiscalYear: raw.fiscalYear ?? new Date().getFullYear().toString(),
  }

  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<EntryForm>(makeDefaultForm())
  const [isSaving, setIsSaving] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    companyName: data.companyName,
    businessNumber: data.businessNumber,
    fiscalYear: data.fiscalYear,
    openingBalance: String(data.openingBalance),
  })

  const update = useCallback(
    (newData: LedgerData) => onUpdateData(widget.id, newData),
    [widget.id, onUpdateData]
  )

  // 날짜순 정렬 후 잔액 누적 계산 (구버전 데이터 호환: created_at 없을 수 있음)
  const entriesWithBalance = useMemo(() => {
    const sorted = [...data.entries].sort((a, b) => {
      const d = (a.date ?? '').localeCompare(b.date ?? '')
      return d !== 0 ? d : (a.created_at ?? '').localeCompare(b.created_at ?? '')
    })
    let balance = data.openingBalance
    return sorted.map((e) => {
      balance = e.type === 'income' ? balance + (e.amount ?? 0) : balance - (e.amount ?? 0)
      return { ...e, calculatedBalance: balance }
    })
  }, [data.entries, data.openingBalance])

  const totalIncome = useMemo(
    () => data.entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [data.entries]
  )
  const totalExpense = useMemo(
    () => data.entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [data.entries]
  )
  const currentBalance = data.openingBalance + totalIncome - totalExpense

  // ── 거래 저장 (추가 / 수정) ──────────────────────────────
  const handleSaveEntry = async () => {
    if (!form.category || !form.description || !form.amount || !form.date) return
    const amount = parseInt(form.amount.replace(/[^0-9]/g, ''), 10)
    if (isNaN(amount) || amount < 0) return

    setIsSaving(true)
    try {
      let updatedEntries: LedgerEntry[]
      if (editingId) {
        updatedEntries = data.entries.map((e) =>
          e.id === editingId
            ? { ...e, date: form.date, type: form.type, category: form.category,
                description: form.description, amount, taxType: form.taxType,
                paymentMethod: form.paymentMethod, voucherType: form.voucherType,
                memo: form.memo }
            : e
        )
      } else {
        const newEntry: LedgerEntry = {
          id: generateId(),
          date: form.date,
          type: form.type,
          category: form.category,
          description: form.description,
          amount,
          taxType: form.taxType,
          paymentMethod: form.paymentMethod,
          voucherType: form.voucherType,
          memo: form.memo,
          created_at: getCurrentTimestamp(),
        }
        updatedEntries = [...data.entries, newEntry]
      }
      const ok = await update({ ...data, entries: updatedEntries })
      if (ok) {
        setShowModal(false)
        setEditingId(null)
        setForm(makeDefaultForm())
      }
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (entry: LedgerEntry) => {
    setForm({
      date: entry.date, type: entry.type, category: entry.category,
      description: entry.description, amount: String(entry.amount),
      taxType: entry.taxType ?? '과세', paymentMethod: entry.paymentMethod ?? '현금',
      voucherType: entry.voucherType ?? '없음', memo: entry.memo ?? '',
    })
    setEditingId(entry.id)
    setExpandedId(null)
    setShowModal(true)
  }

  const handleDelete = async (entryId: string) => {
    await update({ ...data, entries: data.entries.filter((e) => e.id !== entryId) })
    if (expandedId === entryId) setExpandedId(null)
  }

  const handleSaveSettings = async () => {
    const ob = parseInt(settingsForm.openingBalance.replace(/[^0-9-]/g, ''), 10)
    await update({
      ...data,
      companyName: settingsForm.companyName,
      businessNumber: settingsForm.businessNumber,
      fiscalYear: settingsForm.fiscalYear,
      openingBalance: isNaN(ob) ? 0 : ob,
    })
    setShowSettings(false)
  }

  // ── 엑셀 내보내기 ─────────────────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const rows: (string | number)[][] = []

    // ① 제목 / 회사 정보
    rows.push(['현금출납장'])
    rows.push([
      `상호: ${data.companyName || '(미입력)'}`, '', '',
      `사업자번호: ${data.businessNumber || '(미입력)'}`, '', '',
      `회계연도: ${data.fiscalYear}`, '', '',
      `작성일: ${new Date().toLocaleDateString('ko-KR')}`, '', '',
    ])
    rows.push(['(단위: 원)'])
    rows.push([])

    // ② 컬럼 헤더
    rows.push([
      'No.', '날짜', '구분', '계정과목', '적요',
      '과세구분', '결제수단', '증빙서류',
      '수입금액(+)', '지출금액(-)', '잔액', '비고',
    ])

    // ③ 기초잔액 행
    rows.push(['', '', '기초', '전기이월', '', '', '', '',
      data.openingBalance, '', data.openingBalance, ''])

    // ④ 거래 행
    entriesWithBalance.forEach((e, i) => {
      rows.push([
        i + 1,
        e.date,
        e.type === 'income' ? '수입' : '지출',
        e.category,
        e.description,
        e.taxType,
        e.paymentMethod,
        e.voucherType,
        e.type === 'income' ? e.amount : 0,
        e.type === 'expense' ? e.amount : 0,
        e.calculatedBalance,
        e.memo,
      ])
    })

    // ⑤ 합계 행
    rows.push(['', '', '합계', '', '', '', '', '',
      totalIncome, totalExpense, currentBalance, ''])

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // 셀 병합 (제목·단위 행)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
    ]

    // 열 너비
    ws['!cols'] = [
      { wch: 5 },  // No.
      { wch: 12 }, // 날짜
      { wch: 6 },  // 구분
      { wch: 16 }, // 계정과목
      { wch: 28 }, // 적요
      { wch: 10 }, // 과세구분
      { wch: 10 }, // 결제수단
      { wch: 14 }, // 증빙서류
      { wch: 16 }, // 수입금액
      { wch: 16 }, // 지출금액
      { wch: 16 }, // 잔액
      { wch: 22 }, // 비고
    ]

    XLSX.utils.book_append_sheet(wb, ws, '현금출납장')
    XLSX.writeFile(wb, `회계장부_${data.fiscalYear}_${data.companyName || '미입력'}.xlsx`)
  }

  // ── 렌더링 ────────────────────────────────────────────────
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={17} className="text-violet-500 flex-none" />
            <h3 className="font-semibold text-gray-900 text-sm">
              {widget.title || '회계장부'}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {data.entries.length}건
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSettingsForm({
                  companyName: data.companyName,
                  businessNumber: data.businessNumber,
                  fiscalYear: data.fiscalYear,
                  openingBalance: String(data.openingBalance),
                })
                setShowSettings(true)
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-lg transition-colors"
              aria-label="장부 설정"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 active:bg-violet-100 rounded-lg transition-colors"
            >
              <Download size={13} />
              엑셀
            </button>
            {onDeleteWidget && (
              <button
                onClick={() => onDeleteWidget(widget.id)}
                className="p-1.5 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors rounded-lg"
                aria-label="위젯 삭제"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 요약 패널 */}
        <div className="px-4 py-4 bg-violet-50 border-b border-gray-100">
          <p className="text-xs text-violet-600 font-medium">현재 잔액</p>
          <p className={`text-2xl font-bold mt-0.5 ${currentBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {currentBalance < 0 ? '-' : ''}₩{fmt(Math.abs(currentBalance))}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-gray-400 font-medium">기초잔액</p>
              <p className="text-xs font-bold text-gray-700 mt-0.5">₩{fmt(data.openingBalance)}</p>
            </div>
            <div className="bg-white rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-blue-500 font-medium">총 수입</p>
              <p className="text-xs font-bold text-blue-600 mt-0.5">+{fmt(totalIncome)}</p>
            </div>
            <div className="bg-white rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-red-500 font-medium">총 지출</p>
              <p className="text-xs font-bold text-red-600 mt-0.5">-{fmt(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* 거래 목록 */}
        <div className="divide-y divide-gray-50">
          {entriesWithBalance.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">거래 내역이 없습니다</p>
              <p className="text-xs text-gray-300 mt-1">아래 버튼으로 첫 거래를 추가하세요</p>
            </div>
          ) : (
            entriesWithBalance.map((entry) => (
              <div key={entry.id}>
                {/* 거래 행 */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className={`flex-none w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold leading-tight ${
                    entry.type === 'income'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    <span>{entry.type === 'income' ? '수' : '지'}</span>
                    <span>{entry.type === 'income' ? '입' : '출'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{entry.category}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {entry.date} · {entry.description}
                    </p>
                  </div>

                  <div className="text-right flex-none">
                    <p className={`text-sm font-bold tabular-nums ${
                      entry.type === 'income' ? 'text-blue-600' : 'text-red-500'
                    }`}>
                      {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                      잔 {fmt(entry.calculatedBalance)}원
                    </p>
                  </div>

                  <div className="flex-none text-gray-300">
                    {expandedId === entry.id
                      ? <ChevronUp size={14} />
                      : <ChevronDown size={14} />}
                  </div>
                </button>

                {/* 상세 확장 */}
                {expandedId === entry.id && (
                  <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-3">
                      <Detail label="계정과목" value={entry.category} />
                      <Detail label="적요" value={entry.description} />
                      <Detail label="과세구분" value={entry.taxType ?? '-'} />
                      <Detail label="결제수단" value={entry.paymentMethod ?? '-'} />
                      <Detail label="증빙서류" value={entry.voucherType ?? '-'} />
                      <Detail
                        label={entry.type === 'income' ? '수입금액' : '지출금액'}
                        value={`${fmt(entry.amount)}원`}
                      />
                      <Detail label="잔액" value={`${fmt(entry.calculatedBalance)}원`} />
                      {entry.memo && <Detail label="비고" value={entry.memo} span />}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(entry)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 rounded-lg active:bg-violet-100"
                      >
                        <Edit2 size={11} /> 수정
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg active:bg-red-100"
                      >
                        <Trash2 size={11} /> 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 하단 추가 버튼 */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => { setForm(makeDefaultForm()); setEditingId(null); setShowModal(true) }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-violet-600 active:opacity-70 transition-opacity"
          >
            <Plus size={16} />
            거래 추가
          </button>
        </div>
      </div>

      {/* ── 거래 입력/수정 모달 ─────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92dvh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-none">
              <h2 className="text-base font-bold text-gray-900">
                {editingId ? '거래 수정' : '거래 추가'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingId(null); setForm(makeDefaultForm()) }}
                className="p-2 text-gray-400 active:bg-gray-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* 구분 토글 */}
              <div>
                <Label>구분 *</Label>
                <div className="flex gap-2 mt-1.5">
                  <TypeBtn
                    active={form.type === 'income'}
                    color="blue"
                    onClick={() => setForm((f) => ({ ...f, type: 'income', category: '' }))}
                  >
                    수입 (+)
                  </TypeBtn>
                  <TypeBtn
                    active={form.type === 'expense'}
                    color="red"
                    onClick={() => setForm((f) => ({ ...f, type: 'expense', category: '' }))}
                  >
                    지출 (-)
                  </TypeBtn>
                </div>
              </div>

              {/* 날짜 */}
              <FormField label="날짜 *">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </FormField>

              {/* 계정과목 */}
              <FormField label="계정과목 *">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="">선택하세요</option>
                  {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </FormField>

              {/* 적요 */}
              <FormField label="적요 (상세내역) *">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="예: 1월 납품대금, 사무용품 구매"
                  maxLength={80}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </FormField>

              {/* 금액 */}
              <FormField label="금액 (원) *">
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </FormField>

              {/* 과세구분 / 결제수단 */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="과세구분">
                  <select
                    value={form.taxType}
                    onChange={(e) => setForm((f) => ({ ...f, taxType: e.target.value as TaxType }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="결제수단">
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FormField>
              </div>

              {/* 증빙서류 */}
              <FormField label="증빙서류">
                <select
                  value={form.voucherType}
                  onChange={(e) => setForm((f) => ({ ...f, voucherType: e.target.value as VoucherType }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {VOUCHER_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </FormField>

              {/* 비고 */}
              <FormField label="비고">
                <input
                  type="text"
                  value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                  placeholder="선택사항"
                  maxLength={100}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </FormField>
            </div>

            {/* 모달 푸터 */}
            <div className="px-5 py-4 border-t border-gray-100 flex-none">
              <button
                onClick={handleSaveEntry}
                disabled={isSaving || !form.category || !form.description || !form.amount}
                className="w-full py-3.5 bg-violet-500 text-white rounded-2xl font-bold text-sm active:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      저장 중...
                    </span>
                  : editingId ? '수정 완료' : '추가하기'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 장부 설정 모달 ───────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">장부 기본 정보</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-gray-400 active:bg-gray-100 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <FormField label="상호/회사명">
                <input type="text" value={settingsForm.companyName}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="예: 홍길동 개인사업" maxLength={50}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </FormField>
              <FormField label="사업자등록번호">
                <input type="text" value={settingsForm.businessNumber}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, businessNumber: e.target.value }))}
                  placeholder="000-00-00000" maxLength={12}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="회계연도">
                  <input type="text" value={settingsForm.fiscalYear}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                    placeholder="2024" maxLength={4}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </FormField>
                <FormField label="기초잔액 (원)">
                  <input type="number" value={settingsForm.openingBalance}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, openingBalance: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </FormField>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={handleSaveSettings}
                className="w-full py-3.5 bg-violet-500 text-white rounded-2xl font-bold text-sm active:bg-violet-600 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── 소형 UI 헬퍼 컴포넌트들 ───────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-600 mb-1.5">{children}</p>
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function TypeBtn({
  active, color, onClick, children,
}: {
  active: boolean
  color: 'blue' | 'red'
  onClick: () => void
  children: React.ReactNode
}) {
  const activeClass = color === 'blue'
    ? 'border-blue-500 bg-blue-500 text-white'
    : 'border-red-500 bg-red-500 text-white'
  const inactiveClass = 'border-gray-200 bg-gray-50 text-gray-500'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? activeClass : inactiveClass}`}
    >
      {children}
    </button>
  )
}

function Detail({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-gray-400">{label}</p>
      <p className="text-gray-800 font-medium mt-0.5">{value || '-'}</p>
    </div>
  )
}
