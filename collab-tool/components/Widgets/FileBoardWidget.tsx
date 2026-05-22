'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Paperclip, Upload, X, Trash2, Download,
  FileText, FileImage, FileVideo, FileAudio,
  FileArchive, FileSpreadsheet, Presentation,
} from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'
import type { Widget, SharedFile } from '@/types'

interface FileBoardWidgetProps {
  widget: Widget
  nickname?: string
  onUploadFile: (
    widgetId: string,
    file: File,
    nickname: string | undefined,
    onProgress: (pct: number) => void
  ) => Promise<boolean>
  onDeleteFile: (widgetId: string, fileId: string) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mimeType.startsWith('image/'))
    return { Icon: FileImage, color: 'text-blue-400', bg: 'bg-blue-50' }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mimeType.startsWith('video/'))
    return { Icon: FileVideo, color: 'text-purple-400', bg: 'bg-purple-50' }
  if (['mp3', 'm4a', 'wav', 'ogg', 'flac'].includes(ext) || mimeType.startsWith('audio/'))
    return { Icon: FileAudio, color: 'text-pink-400', bg: 'bg-pink-50' }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return { Icon: FileArchive, color: 'text-amber-400', bg: 'bg-amber-50' }
  if (['xlsx', 'xls', 'csv'].includes(ext))
    return { Icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-50' }
  if (['ppt', 'pptx'].includes(ext))
    return { Icon: Presentation, color: 'text-orange-400', bg: 'bg-orange-50' }
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext))
    return { Icon: FileText, color: 'text-red-400', bg: 'bg-red-50' }
  return { Icon: Paperclip, color: 'text-gray-400', bg: 'bg-gray-100' }
}

export default function FileBoardWidget({
  widget,
  nickname,
  onUploadFile,
  onDeleteFile,
  onDeleteWidget,
}: FileBoardWidgetProps) {
  const files: SharedFile[] = (widget.data?.files as SharedFile[]) || []

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return
      setUploadError(null)

      for (const file of Array.from(fileList)) {
        if (file.size > 100 * 1024 * 1024) {
          setUploadError(`${file.name}: 100MB 이하 파일만 업로드할 수 있습니다`)
          continue
        }
        setUploadProgress(0)
        try {
          await onUploadFile(widget.id, file, nickname, setUploadProgress)
        } catch (err) {
          const msg = (err as { message?: string })?.message ?? '업로드에 실패했습니다'
          setUploadError(msg)
        }
        setUploadProgress(null)
      }
    },
    [widget.id, nickname, onUploadFile]
  )

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) await handleFiles(e.dataTransfer.files)
  }

  const handleDownload = useCallback(async (file: SharedFile) => {
    if (savingId) return
    setSavingId(file.id)
    try {
      const response = await fetch(file.url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(file.url, '_blank')
    } finally {
      setSavingId(null)
    }
  }, [savingId])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">📁</span>
          <span className="text-sm font-semibold text-gray-800 truncate">
            {widget.title || '파일 공유'}
          </span>
          {files.length > 0 && (
            <span className="text-xs text-gray-400 flex-none">{files.length}개</span>
          )}
        </div>
        <button
          onClick={() => onDeleteWidget(widget.id)}
          className="flex-none p-1.5 text-gray-300 active:text-red-400 rounded-lg transition-colors"
          aria-label="위젯 삭제"
        >
          <X size={15} />
        </button>
      </div>

      {/* 빈 상태 */}
      {files.length === 0 && uploadProgress === null && (
        <div
          className={`mx-3 my-3 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center py-8 gap-2 ${
            isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Paperclip size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400 font-medium">파일을 업로드해보세요</p>
          <p className="text-xs text-gray-300">모든 형식 지원 · 최대 100MB</p>
        </div>
      )}

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div
          className="divide-y divide-gray-50"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {files.map((file) => {
            const { Icon, color, bg } = getFileIcon(file.filename, file.mimeType)
            return (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                {/* 파일 타입 아이콘 */}
                <div className={`flex-none w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.filename}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatFileSize(file.size)} · {file.uploaderNickname ?? '익명'} · {getRelativeTime(file.uploadedAt)}
                  </p>
                </div>

                {/* 다운로드 버튼 */}
                <button
                  onClick={() => handleDownload(file)}
                  disabled={!!savingId}
                  className="flex-none p-1.5 text-gray-300 active:text-blue-500 rounded-lg transition-colors disabled:opacity-40"
                  aria-label="다운로드"
                >
                  {savingId === file.id
                    ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin block" />
                    : <Download size={15} />}
                </button>

                {/* 삭제 버튼 */}
                {confirmDeleteId === file.id ? (
                  <div className="flex gap-1 flex-none">
                    <button
                      onClick={async () => { setConfirmDeleteId(null); await onDeleteFile(widget.id, file.id) }}
                      className="text-[11px] text-red-500 font-semibold px-1.5 py-0.5 rounded active:bg-red-50"
                    >삭제</button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[11px] text-gray-400 px-1.5 py-0.5 rounded active:bg-gray-100"
                    >취소</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(file.id)}
                    className="flex-none p-1.5 text-gray-200 active:text-red-400 rounded-lg transition-colors"
                    aria-label="파일 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 업로드 진행 바 */}
      {uploadProgress !== null && (
        <div className="px-4 py-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">업로드 중... {uploadProgress}%</p>
        </div>
      )}

      {/* 에러 */}
      {uploadError && (
        <p className="text-xs text-red-500 px-4 pt-1.5 pb-1">{uploadError}</p>
      )}

      {/* 업로드 버튼 */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadProgress !== null}
          className="flex items-center gap-1.5 text-sm text-blue-500 font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:text-blue-700 transition-colors"
        >
          <Upload size={14} />
          파일 추가
        </button>
        <span className="text-xs text-gray-300">· 여러 파일 동시 업로드 가능</span>
      </div>
    </div>
  )
}
