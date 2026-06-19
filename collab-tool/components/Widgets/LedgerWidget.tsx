'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  BookOpen, Plus, Trash2, Download, Settings2, X, Edit2, ChevronDown, ChevronUp, Upload, FileText
} from 'lucide-react'
import XLSX from 'xlsx-js-style'
import type {
  Widget, LedgerData, LedgerEntry, LedgerEntryType, TaxType, PaymentMethod, VoucherType,
} from '@/types'
import { generateId, getCurrentTimestamp } from '@/lib/utils'

// ── 항목 목록 ─────────────────────────────────────────────
const CATEGORIES = ['회비', '식대', '지원금', '물품구매', '기타']
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
  categorySelect: string  // 드롭다운 선택값
  category: string        // 실제 저장값 (기타 직접입력 시 커스텀 텍스트)
  description: string
  amount: string
  paymentMethod: PaymentMethod
  voucherType: VoucherType
  memo: string
}

const makeDefaultForm = (): EntryForm => ({
  date: new Date().toISOString().split('T')[0],
  type: 'income',
  categorySelect: '',
  category: '',
  description: '',
  amount: '',
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
  const [excelGuide, setExcelGuide] = useState(false)
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

  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteLoading, setPasteLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

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
                description: form.description, amount,
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
    const isKnown = CATEGORIES.filter((c) => c !== '기타').includes(entry.category)
    setForm({
      date: entry.date, type: entry.type,
      categorySelect: isKnown ? entry.category : '기타',
      category: entry.category,
      description: entry.description, amount: String(entry.amount),
      paymentMethod: entry.paymentMethod ?? '현금',
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

    // ── 스타일 정의 ──────────────────────────────────────────
    const borderThin = {
      top:    { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left:   { style: 'thin', color: { rgb: '999999' } },
      right:  { style: 'thin', color: { rgb: '999999' } },
    }
    const borderMedium = {
      top:    { style: 'medium', color: { rgb: '444444' } },
      bottom: { style: 'medium', color: { rgb: '444444' } },
      left:   { style: 'medium', color: { rgb: '444444' } },
      right:  { style: 'medium', color: { rgb: '444444' } },
    }

    const sTitle = {
      font:      { name: '맑은 고딕', sz: 16, bold: true, color: { rgb: '1A1A2E' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill:      { fgColor: { rgb: 'EDE9FE' } },
      border:    borderMedium,
    }
    const sInfo = {
      font:      { name: '맑은 고딕', sz: 10, color: { rgb: '374151' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      fill:      { fgColor: { rgb: 'F5F3FF' } },
      border:    { bottom: { style: 'thin', color: { rgb: 'C4B5FD' } } },
    }
    const sUnit = {
      font:      { name: '맑은 고딕', sz: 9, color: { rgb: '6B7280' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill:      { fgColor: { rgb: 'F5F3FF' } },
    }
    const sHeader = {
      font:      { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill:      { fgColor: { rgb: '7C3AED' } },
      border:    borderMedium,
    }
    const sOpeningLabel = {
      font:      { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: '4B5563' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill:      { fgColor: { rgb: 'EDE9FE' } },
      border:    borderThin,
    }
    const sOpeningNum = {
      font:      { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: '4B5563' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill:      { fgColor: { rgb: 'EDE9FE' } },
      border:    borderThin,
      numFmt:    '#,##0',
    }
    const sOpeningEmpty = {
      fill:   { fgColor: { rgb: 'EDE9FE' } },
      border: borderThin,
    }
    const sDataText = {
      font:      { name: '맑은 고딕', sz: 9, color: { rgb: '111827' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border:    borderThin,
    }
    const sDataLeft = {
      font:      { name: '맑은 고딕', sz: 9, color: { rgb: '111827' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border:    borderThin,
    }
    const sIncome = {
      font:      { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: '1D4ED8' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border:    borderThin,
      numFmt:    '#,##0',
    }
    const sExpense = {
      font:      { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: 'DC2626' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border:    borderThin,
      numFmt:    '#,##0',
    }
    const sBalance = {
      font:      { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: '111827' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border:    borderThin,
      numFmt:    '#,##0',
    }
    const sEmpty = { border: borderThin }
    const sTotalLabel = {
      font:      { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: '1A1A2E' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill:      { fgColor: { rgb: 'DDD6FE' } },
      border:    borderMedium,
    }
    const sTotalIncome = {
      font:      { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: '1D4ED8' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill:      { fgColor: { rgb: 'DBEAFE' } },
      border:    borderMedium,
      numFmt:    '#,##0',
    }
    const sTotalExpense = {
      font:      { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: 'DC2626' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill:      { fgColor: { rgb: 'FEE2E2' } },
      border:    borderMedium,
      numFmt:    '#,##0',
    }
    const sTotalBalance = {
      font:      { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: '111827' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      fill:      { fgColor: { rgb: 'DDD6FE' } },
      border:    borderMedium,
      numFmt:    '#,##0',
    }

    // ── 셀 생성 헬퍼 ──────────────────────────────────────────
    type CellStyle = Record<string, unknown>
    const c = (v: string | number, s: CellStyle, t?: string) => ({
      v, s, t: t ?? (typeof v === 'number' ? 'n' : 's'),
    })

    // ── 행 구성 ───────────────────────────────────────────────
    const today = new Date().toLocaleDateString('ko-KR')
    const COLS = 11 // A~K

    // 행 0: 제목 (병합)
    const rowTitle = [c('현금출납장', sTitle)]
    for (let i = 1; i < COLS; i++) rowTitle.push(c('', sTitle))

    // 행 1: 회사 정보 (셀 병합으로 3구역)
    const rowInfo = [
      c(`상호: ${data.companyName || '(미입력)'}`, sInfo),
      c('', sInfo), c('', sInfo),
      c(`사업자번호: ${data.businessNumber || '(미입력)'}`, sInfo),
      c('', sInfo), c('', sInfo),
      c(`회계연도: ${data.fiscalYear}`, sInfo),
      c('', sInfo),
      c(`작성일: ${today}`, sInfo),
      c('', sInfo), c('', sInfo),
    ]

    // 행 2: 단위
    const rowUnit = [c('(단위: 원)', sUnit)]
    for (let i = 1; i < COLS; i++) rowUnit.push(c('', sUnit))

    // 행 3: 헤더
    const rowHeader = [
      c('No.', sHeader), c('날짜', sHeader), c('구분', sHeader),
      c('항목', sHeader), c('상세내역', sHeader),
      c('결제수단', sHeader), c('증빙서류', sHeader),
      c('수입금액(+)', sHeader), c('지출금액(-)', sHeader), c('잔액', sHeader), c('비고', sHeader),
    ]

    // 행 4: 기초잔액
    const rowOpening = [
      c('', sOpeningEmpty), c('', sOpeningEmpty),
      c('기초', sOpeningLabel), c('전기이월', sOpeningLabel),
      c('', sOpeningEmpty), c('', sOpeningEmpty), c('', sOpeningEmpty),
      c(data.openingBalance, sOpeningNum),
      c('', sOpeningEmpty),
      c(data.openingBalance, sOpeningNum),
      c('', sOpeningEmpty),
    ]

    // 거래 행
    const dataRows = entriesWithBalance.map((e, i) => {
      const isIncome = e.type === 'income'
      const typeStyle = isIncome
        ? { ...sDataText, font: { ...sDataText.font, color: { rgb: '1D4ED8' }, bold: true } }
        : { ...sDataText, font: { ...sDataText.font, color: { rgb: 'DC2626' }, bold: true } }
      return [
        c(i + 1,       sDataText),
        c(e.date,      sDataText),
        c(isIncome ? '수입' : '지출', typeStyle),
        c(e.category,  sDataText),
        c(e.description, sDataLeft),
        c(e.paymentMethod ?? '',  sDataText),
        c(e.voucherType ?? '',    sDataText),
        isIncome ? c(e.amount, sIncome)  : c('', sEmpty),
        isIncome ? c('', sEmpty) : c(e.amount, sExpense),
        c(e.calculatedBalance, sBalance),
        c(e.memo ?? '', sDataLeft),
      ]
    })

    // 합계 행
    const rowTotal = [
      c('', sTotalLabel), c('', sTotalLabel),
      c('합계', sTotalLabel), c('', sTotalLabel),
      c('', sTotalLabel), c('', sTotalLabel), c('', sTotalLabel),
      c(totalIncome,   sTotalIncome),
      c(totalExpense,  sTotalExpense),
      c(currentBalance, sTotalBalance),
      c('', sTotalLabel),
    ]

    const allRows = [rowTitle, rowInfo, rowUnit, rowHeader, rowOpening, ...dataRows, rowTotal]

    const ws = XLSX.utils.aoa_to_sheet(allRows)

    // 셀 병합
    const lastDataRow = 4 + entriesWithBalance.length
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },                // 제목
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },                 // 상호
      { s: { r: 1, c: 3 }, e: { r: 1, c: 5 } },                 // 사업자번호
      { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },                 // 회계연도
      { s: { r: 1, c: 8 }, e: { r: 1, c: 10 } },                // 작성일
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },                // 단위
      { s: { r: lastDataRow + 1, c: 0 }, e: { r: lastDataRow + 1, c: 1 } }, // 합계 No.+날짜
      { s: { r: lastDataRow + 1, c: 2 }, e: { r: lastDataRow + 1, c: 6 } }, // 합계 레이블
    ]

    // 행 높이
    ws['!rows'] = [
      { hpt: 30 },  // 제목
      { hpt: 20 },  // 회사정보
      { hpt: 16 },  // 단위
      { hpt: 28 },  // 헤더
      { hpt: 20 },  // 기초잔액
      ...entriesWithBalance.map(() => ({ hpt: 18 })),
      { hpt: 22 },  // 합계
    ]

    // 열 너비
    ws['!cols'] = [
      { wch: 5  }, // No.
      { wch: 12 }, // 날짜
      { wch: 7  }, // 구분
      { wch: 14 }, // 항목
      { wch: 28 }, // 상세내역
      { wch: 10 }, // 결제수단
      { wch: 14 }, // 증빙서류
      { wch: 15 }, // 수입금액
      { wch: 15 }, // 지출금액
      { wch: 15 }, // 잔액
      { wch: 20 }, // 비고
    ]

    XLSX.utils.book_append_sheet(wb, ws, '현금출납장')

    const fileName = `회계장부_${data.fiscalYear}_${data.companyName || '미입력'}.xlsx`
    const ua = navigator.userAgent
    const isKakao   = /KAKAOTALK/i.test(ua)
    const isIOS     = /iPhone|iPad|iPod/i.test(ua)

    // 카카오톡 인앱 브라우저: WebView는 파일 저장 불가 → 외부 브라우저 안내
    if (isKakao) {
      setExcelGuide(true)
      return
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)

    if (isIOS) {
      // iOS Safari: download 속성 미지원 → 새 탭으로 열어 파일 앱 저장 유도
      window.open(url, '_blank')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  // ── 엑셀/CSV 가져오기 (업로드 - EUC-KR & HTML 지원) ─────────────────
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1단계: 국내 은행 파일(EUC-KR 인코딩된 HTML/CSV) 파싱 시도
    const textReader = new FileReader()
    textReader.onload = async (textEvt) => {
      let jsonData: any[][] = []
      let parseSuccess = false

      try {
        const textData = textEvt.target?.result as string
        
        // HTML 테이블 엑셀인 경우
        if (textData.toLowerCase().includes('<table') || textData.toLowerCase().includes('<html')) {
          const parser = new DOMParser()
          const doc = parser.parseFromString(textData, 'text/html')
          const rows = doc.querySelectorAll('tr')
          if (rows.length > 2) {
            rows.forEach((tr) => {
              const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent?.trim() || '')
              jsonData.push(cells)
            })
            parseSuccess = true
          }
        } 
        // CSV인 경우
        else if (textData.includes(',') && textData.split('\n').length > 2 && !file.name.endsWith('.xlsx')) {
           const lines = textData.split(/\r?\n/)
           lines.forEach(line => {
             const cells = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
             jsonData.push(cells)
           })
           parseSuccess = true
        }

        if (!parseSuccess) {
          await fallbackToXLSX()
          return
        }

        await processJsonData(jsonData)

      } catch (err) {
        console.error('EUC-KR 텍스트 파싱 오류:', err)
        await fallbackToXLSX()
      }
    }

    // 2단계: 텍스트 파싱 실패 시 일반 바이너리 엑셀(.xlsx) 파싱 시도
    const fallbackToXLSX = async () => {
      const bufferReader = new FileReader()
      bufferReader.onload = async (bufEvt) => {
        try {
          const fileData = new Uint8Array(bufEvt.target?.result as ArrayBuffer)
          const workbook = XLSX.read(fileData, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' })
          await processJsonData(jsonData)
        } catch (err) {
          console.error('XLSX 파싱 오류:', err)
          alert('엑셀 파일을 읽을 수 없습니다. 지원되지 않는 포맷입니다.')
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }
      bufferReader.readAsArrayBuffer(file)
    }

    // 3단계: 추출된 2차원 배열 데이터(jsonData)를 분석하여 장부 내역으로 변환
    const processJsonData = async (jsonData: any[][]) => {
      try {
        if (jsonData.length < 2) return

        // 휴리스틱: 헤더 행 찾기 (상위 20줄 이내 탐색)
        let headerRowIndex = -1
        let colMap = { date: -1, desc: -1, income: -1, expense: -1, amount: -1, type: -1 }

        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
          const row = jsonData[i]
          if (!Array.isArray(row)) continue
          
          let foundDate = -1, foundDesc = -1, foundIncome = -1, foundExpense = -1, foundAmount = -1, foundType = -1
          
          row.forEach((cell, idx) => {
            if (typeof cell !== 'string') return
            const text = cell.replace(/\s+/g, '').toLowerCase()
            if (text.includes('날짜') || text.includes('일시') || text.includes('거래일')) foundDate = idx
            if (text.includes('적요') || text.includes('내용') || text.includes('기재') || text.includes('거래명') || text.includes('가맹점')) foundDesc = idx
            if (text === '입금' || text.includes('입금액') || text.includes('수입')) foundIncome = idx
            if (text === '출금' || text.includes('출금액') || text.includes('지출')) foundExpense = idx
            if (text === '금액' || text === '거래금액') foundAmount = idx
            if (text === '구분' || text.includes('거래구분')) foundType = idx
          })

          if (foundDate !== -1 && (foundDesc !== -1 || foundAmount !== -1 || foundIncome !== -1 || foundExpense !== -1)) {
            headerRowIndex = i
            colMap = { date: foundDate, desc: foundDesc, income: foundIncome, expense: foundExpense, amount: foundAmount, type: foundType }
            break
          }
        }

        if (headerRowIndex === -1 || colMap.date === -1) {
          alert('엑셀 파일에서 [날짜]나 [금액] 관련 열을 자동으로 찾을 수 없습니다. 양식을 확인해주세요.')
          return
        }

        const newEntries: LedgerEntry[] = []

        // 데이터 행 순회
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!Array.isArray(row)) continue

          const rawDate = row[colMap.date]
          if (!rawDate) continue

          let parsedDate = String(rawDate).trim()
          // 엑셀 날짜 숫자 포맷 처리
          if (typeof rawDate === 'number') {
            const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000))
            parsedDate = dateObj.toISOString().split('T')[0]
          } else {
             // YYYY-MM-DD 비스무리한 텍스트 추출 (YYYY.MM.DD, YYYY/MM/DD 등)
             const match = parsedDate.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
             if (match) {
                const [_, y, m, d] = match
                parsedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
             } else if (parsedDate.length >= 8) {
               // 대충 YYYY-MM-DD로 잘라봄 (숫자 8자리인 경우 등은 복잡하므로 일단 대시 변환 시도)
               parsedDate = parsedDate.substring(0, 10).replace(/\./g, '-')
             }
          }
          if (parsedDate.length !== 10) continue // 10자리가 아니면 파싱 실패로 간주

          let desc = colMap.desc !== -1 ? String(row[colMap.desc]) : '내역 없음'
          
          let amount = 0
          let type: LedgerEntryType = 'expense'

          if (colMap.income !== -1 || colMap.expense !== -1) {
            const inAmt = parseInt(String(row[colMap.income] || '0').replace(/[^0-9]/g, ''), 10) || 0
            const outAmt = parseInt(String(row[colMap.expense] || '0').replace(/[^0-9]/g, ''), 10) || 0
            
            if (inAmt > 0) {
              amount = inAmt
              type = 'income'
            } else if (outAmt > 0) {
              amount = outAmt
              type = 'expense'
            } else {
              continue // 둘 다 0이면 무시
            }
          } else if (colMap.amount !== -1) {
             const amtStr = String(row[colMap.amount]).replace(/,/g, '').trim()
             amount = Math.abs(parseInt(amtStr.replace(/[^0-9-]/g, ''), 10) || 0)
             if (amount === 0) continue

             if (amtStr.startsWith('-')) {
               type = 'expense'
             } else if (colMap.type !== -1) {
                const typeStr = String(row[colMap.type])
                if (typeStr.includes('입금') || typeStr.includes('수입')) type = 'income'
                else type = 'expense'
             } else {
               type = 'expense' // 기본 지출 처리
             }
          } else {
            continue
          }

          newEntries.push({
            id: generateId(),
            date: parsedDate,
            type,
            category: '기타', // 일괄 '기타' 처리
            description: desc,
            amount,
            paymentMethod: '계좌이체',
            voucherType: '없음',
            memo: '',
            created_at: getCurrentTimestamp(),
          })
        }

        if (newEntries.length > 0) {
          // 암호화 문서(보안문서) 감지 방어 로직
          const sampleText = JSON.stringify(newEntries).replace(/\s+/g, '')
          if (newEntries.length <= 3 && (sampleText.includes('보안') || sampleText.includes('비밀번호') || sampleText.includes('암호') || sampleText.includes('보호'))) {
            alert('비밀번호가 설정되어 있거나 특수 보안이 적용된 은행 문서입니다.\n암호를 해제하고 다시 시도하거나, [텍스트] 붙여넣기 기능을 이용해주세요.')
            return
          }

          const updatedEntries = [...data.entries, ...newEntries]
          await update({ ...data, entries: updatedEntries })
          alert(`${newEntries.length}건의 거래 내역이 성공적으로 장부에 추가되었습니다.`)
        } else {
          alert('가져올 유효한 거래 내역이 없습니다.')
        }

      } catch (err) {
        console.error('데이터 분석 오류:', err)
        alert('엑셀 데이터를 분석하는 중 오류가 발생했습니다.')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    // 시작: 파일을 EUC-KR 텍스트로 읽기 시도
    textReader.readAsText(file, 'euc-kr')
  }

  // ── 스마트 텍스트 붙여넣기 ───────────────────────────────
  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return
    setPasteLoading(true)

    try {
      const lines = pasteText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      const newEntries: LedgerEntry[] = []
      
      // 날짜 포맷 매칭 정규식 (2024-03-15, 03/15, 3월 15일 등)
      const dateRegex = /(20\d{2}[-./년]\s*\d{1,2}[-./월]\s*\d{1,2}[일]?)|(\d{1,2}[-./월]\s*\d{1,2}[일]?)/
      // 금액 포맷 매칭 정규식 (숫자 뒤에 원, KRW, 달러가 붙은 경우만 인정)
      const amtRegex = /([0-9]{1,3}(,[0-9]{3})+|[0-9]+)\s*(원|KRW|달러)/
      
      const todayDate = new Date()
      let currentDate = todayDate.toISOString().split('T')[0]
      let lastTextLine = ''

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // 잔액, 조회기간, 계좌번호 등 불필요한 줄은 무조건 무시 (lastTextLine에도 안 넣음)
        if (line.includes('잔액') || line.includes('조회') || line.includes('계좌') || line.includes('합계')) {
          continue
        }

        // 1. 날짜 확인 (이 줄에 날짜가 있으면, 이후 거래들은 이 날짜를 따름)
        const dateMatch = line.match(dateRegex)
        let foundDateInLine = false
        if (dateMatch) {
          const dStr = dateMatch[0].replace(/[^0-9]/g, ' ')
          const parts = dStr.trim().split(/\s+/).map(Number)
          if (parts.length === 3) {
            currentDate = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
          } else if (parts.length === 2) {
            currentDate = `${todayDate.getFullYear()}-${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`
          }
          foundDateInLine = true
        }

        // 2. 금액 추출 ('원' 등 화폐단위가 있는 경우만 인정)
        const amtMatch = line.match(amtRegex)
        if (amtMatch) {
          const amount = parseInt(amtMatch[1].replace(/,/g, ''), 10)
          
          if (amount > 0) {
            let type: LedgerEntryType = 'expense' // 기본 지출
            // 현재 줄이나 이전 줄(상호명)에 입금 관련 키워드가 있으면 수입으로 분류
            if (line.includes('입금') || line.includes('수입') || line.includes('캐시백') || line.includes('환불')) type = 'income'
            else if (lastTextLine.includes('입금') || lastTextLine.includes('수입') || lastTextLine.includes('환불')) type = 'income'

            // 적요(Description) 만들기: 현재 줄에서 금액 부분을 지운 글자.
            let desc = line.replace(amtMatch[0], '').trim()
            // 지웠더니 글자가 너무 짧으면(예: '출금'만 남은 경우), 윗줄(상호명) 글자를 합쳐줌.
            if (desc.length < 3 && lastTextLine) {
              desc = lastTextLine + ' ' + desc
            }
            if (!desc.trim()) desc = '내역 없음'

            newEntries.push({
              id: generateId(),
              date: currentDate,
              type,
              category: '기타',
              description: desc.substring(0, 40).trim(),
              amount,
              paymentMethod: '계좌이체',
              voucherType: '없음',
              memo: '스마트 입력됨',
              created_at: getCurrentTimestamp(),
            })
            
            // 하나의 거래가 끝났으므로 이전 줄 텍스트 초기화
            lastTextLine = ''
            continue
          }
        }

        // 날짜도 아니고 금액도 아니면서, 무시할 단어도 아닌 줄은 '적요 후보(상호명 등)'로 저장
        if (!foundDateInLine && !amtMatch) {
           // 이전 줄과 누적하지 않고 덮어씀 (보통 금액 바로 윗줄이 상호명임)
           lastTextLine = line
        }
      }

      if (newEntries.length > 0) {
        const updatedEntries = [...data.entries, ...newEntries]
        const ok = await update({ ...data, entries: updatedEntries })
        if (ok) {
           setShowPasteModal(false)
           setPasteText('')
           alert(`${newEntries.length}건이 성공적으로 장부에 추가되었습니다.`)
        }
      } else {
        alert('텍스트에서 금액을 찾을 수 없습니다. (예: 15,000원)\n계좌번호나 잔액은 등록되지 않습니다.')
      }
    } finally {
      setPasteLoading(false)
    }
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
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-100 rounded-lg transition-colors"
              title="텍스트 알림 붙여넣기로 입력"
            >
              <FileText size={13} />
              텍스트
            </button>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImportExcel}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-100 rounded-lg transition-colors"
              title="엑셀/CSV 내역 올리기"
            >
              <Upload size={13} />
              업로드
            </button>
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
                      <Detail label="항목" value={entry.category} />
                      <Detail label="상세내역" value={entry.description} />
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

              {/* 항목 */}
              <FormField label="항목 *">
                <select
                  value={form.categorySelect}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((f) => ({
                      ...f,
                      categorySelect: v,
                      category: v === '기타' ? '' : v,
                    }))
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="">선택하세요</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {form.categorySelect === '기타' && (
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="항목을 직접 입력하세요"
                    maxLength={30}
                    autoFocus
                    className="mt-2 w-full px-3 py-2.5 border border-violet-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                )}
              </FormField>

              {/* 상세내역 */}
              <FormField label="상세내역 *">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="예: 3월 정기 회비, 워크숍 식사"
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

              {/* 결제수단 */}
              <FormField label="결제수단">
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>

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

      {/* ── 카카오톡 엑셀 저장 안내 모달 ─────────────────── */}
      {excelGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl px-6 pt-6 pb-8">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Download size={24} className="text-yellow-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">엑셀 저장 안내</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                카카오톡 내 브라우저에서는<br />파일 저장이 제한됩니다.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-4 text-sm text-gray-700 space-y-2 mb-5">
              <p className="font-semibold text-gray-800">외부 브라우저로 열기</p>
              <p>① 화면 우측 하단 <span className="font-bold">⋮</span> 또는 우측 상단 메뉴 탭</p>
              <p>② <span className="font-bold">"다른 앱으로 열기"</span> 또는 <span className="font-bold">"외부 브라우저로 열기"</span> 선택</p>
              <p>③ Chrome / Safari 에서 엑셀 버튼 다시 누르기</p>
            </div>
            <button
              onClick={() => setExcelGuide(false)}
              className="w-full py-3.5 bg-violet-500 text-white rounded-2xl font-bold text-sm active:bg-violet-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 스마트 텍스트 붙여넣기 모달 ─────────────────── */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">텍스트 붙여넣기</h2>
              <button onClick={() => { setShowPasteModal(false); setPasteText(''); }} className="p-2 text-gray-400 active:bg-gray-100 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                카카오페이, 토스, 은행 결제/입금 알림 텍스트를 복사해서 아래에 붙여넣으세요. 여러 개를 한 번에 넣어도 모두 분석해 줍니다.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="예: 03/16 홍길동 송금 50,000원&#13;&#10;예: 2024-03-15 스타벅스 15,000 출금"
                className="w-full h-36 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={handlePasteSubmit}
                disabled={pasteLoading || !pasteText.trim()}
                className="w-full py-3.5 bg-blue-500 text-white rounded-2xl font-bold text-sm active:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {pasteLoading ? '분석 중...' : '자동 분석해서 추가하기'}
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
