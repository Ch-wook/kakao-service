'use client'

import { useState, useRef, useCallback, useId } from 'react'
import { Image as ImageIcon, Upload, X, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'
import type { Widget, GalleryImage } from '@/types'

interface ImageGalleryWidgetProps {
  widget: Widget
  nickname?: string
  onUploadImage: (
    widgetId: string,
    file: File,
    nickname: string | undefined,
    onProgress: (pct: number) => void
  ) => Promise<boolean>
  onDeleteImage: (widgetId: string, imageId: string) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

export default function ImageGalleryWidget({
  widget,
  nickname,
  onUploadImage,
  onDeleteImage,
  onDeleteWidget,
}: ImageGalleryWidgetProps) {
  const images: GalleryImage[] = (widget.data?.images as GalleryImage[]) || []

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const inputId = useId()

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setIsDragging(true)
  }
  const handleDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  const handleSaveImage = useCallback(async (img: GalleryImage) => {
    if (savingId) return
    setSavingId(img.id)
    try {
      const response = await fetch(img.url)
      const blob = await response.blob()

      // iOS: Web Share API로 사진 앱에 저장
      if (navigator.share) {
        const file = new File([blob], img.filename, { type: blob.type || 'image/jpeg' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: img.filename })
          return
        }
      }

      // Android/PC: blob URL 다운로드
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = img.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // 최종 fallback: 새 탭에서 열기
      window.open(img.url, '_blank')
    } finally {
      setSavingId(null)
    }
  }, [savingId])

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return
      setUploadError(null)

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError('10MB 이하의 파일만 업로드할 수 있습니다')
          continue
        }
        if (!file.type.startsWith('image/')) {
          setUploadError('이미지 파일만 업로드할 수 있습니다')
          continue
        }
        setUploadProgress(0)
        try {
          await onUploadImage(widget.id, file, nickname, setUploadProgress)
        } catch (err) {
          const msg = (err as { message?: string })?.message ?? '업로드에 실패했습니다'
          setUploadError(msg)
        }
        setUploadProgress(null)
      }
    },
    [widget.id, nickname, onUploadImage]
  )

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files) await handleFiles(e.dataTransfer.files)
  }

  const handleDeleteImage = async (imageId: string) => {
    setConfirmDeleteId(null)
    await onDeleteImage(widget.id, imageId)
  }

  const moveLightbox = (dir: -1 | 1) => {
    setLightboxIndex((prev) => {
      if (prev === null) return prev
      const next = prev + dir
      if (next < 0 || next >= images.length) return prev
      return next
    })
  }

  // 키보드 네비게이션 (라이트박스)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (lightboxIndex === null) return
    if (e.key === 'ArrowLeft') moveLightbox(-1)
    if (e.key === 'ArrowRight') moveLightbox(1)
    if (e.key === 'Escape') setLightboxIndex(null)
  }

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
        isDragging ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'
      }`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🖼️</span>
          <span className="text-sm font-semibold text-gray-800 truncate">
            {widget.title || '이미지 갤러리'}
          </span>
          {images.length > 0 && (
            <span className="text-xs text-gray-400 flex-none">{images.length}장</span>
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
      {images.length === 0 && uploadProgress === null && !isDragging && (
        <div className="mx-3 my-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center py-8 gap-2">
          <ImageIcon size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400 font-medium">사진을 업로드해보세요</p>
          <p className="text-xs text-gray-300">JPG · PNG · GIF · WebP, 최대 10MB</p>
        </div>
      )}

      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="mx-3 my-2 rounded-xl border-2 border-blue-400 bg-blue-50 flex flex-col items-center justify-center py-5 gap-1 pointer-events-none">
          <Upload size={22} className="text-blue-400" />
          <p className="text-sm text-blue-500 font-semibold">놓으면 업로드됩니다</p>
        </div>
      )}

      {/* 이미지 그리드 */}
      {images.length > 0 && !isDragging && (
        <div className="grid grid-cols-3 gap-0.5">
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-square overflow-hidden bg-gray-100 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.filename}
                className="w-full h-full object-cover cursor-pointer transition-transform active:scale-95"
                onClick={() => { setConfirmDeleteId(null); setLightboxIndex(i) }}
                loading="lazy"
              />
              {/* 업로더·날짜 오버레이 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 pointer-events-none">
                <p className="text-[9px] text-white/80 truncate leading-tight">
                  {img.uploaderNickname ?? '익명'}
                </p>
              </div>
              {/* 저장 버튼 (좌상단) */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSaveImage(img) }}
                className="absolute top-1 left-1 p-1 bg-black/30 text-white rounded-md opacity-0 group-active:opacity-100 transition-opacity"
                aria-label="이미지 저장"
              >
                {savingId === img.id
                  ? <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin block" />
                  : <Download size={11} />}
              </button>

              {/* 삭제 버튼 */}
              {confirmDeleteId === img.id ? (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5">
                  <p className="text-[11px] text-white font-semibold">삭제할까요?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="bg-red-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg active:bg-red-600"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="bg-white/20 text-white text-[11px] px-2.5 py-1 rounded-lg active:bg-white/30"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(img.id) }}
                  className="absolute top-1 right-1 p-1 bg-black/30 text-white rounded-md opacity-0 group-active:opacity-100 transition-opacity"
                  aria-label="이미지 삭제"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 업로드 진행 바 */}
      {uploadProgress !== null && (
        <div className="px-4 pt-3 pb-1">
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
        <p className="text-xs text-red-500 px-4 pt-2">{uploadError}</p>
      )}

      {/* 업로드 버튼 영역 */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={uploadProgress !== null}
        />
        <label
          htmlFor={inputId}
          className={`flex items-center gap-1.5 text-sm text-blue-500 font-semibold cursor-pointer transition-colors active:text-blue-700 ${
            uploadProgress !== null ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          <Upload size={14} />
          사진 추가
        </label>
        <span className="text-xs text-gray-300">· 드래그 앤 드롭도 가능</span>
      </div>

      {/* 라이트박스 */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          {/* 상단 바 */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/60 text-xs flex-none">
              {lightboxIndex + 1} / {images.length}
            </p>
            <p className="text-white/80 text-xs truncate mx-3 flex-1 text-center">
              {images[lightboxIndex].filename}
            </p>
            <div className="flex items-center gap-1 flex-none">
              <button
                onClick={() => handleSaveImage(images[lightboxIndex])}
                disabled={!!savingId}
                className="p-2 text-white/70 active:text-white rounded-lg disabled:opacity-40"
                aria-label="저장"
              >
                {savingId === images[lightboxIndex].id
                  ? <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin block" />
                  : <Download size={18} />}
              </button>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 text-white/60 active:text-white rounded-lg"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 이미지 영역 */}
          <div
            className="flex-1 flex items-center justify-center px-2 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 이전 버튼 */}
            <button
              onClick={() => moveLightbox(-1)}
              disabled={lightboxIndex === 0}
              className="absolute left-1 z-10 p-2 text-white/60 disabled:opacity-20 active:text-white rounded-xl transition-colors"
              aria-label="이전"
            >
              <ChevronLeft size={28} />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].filename}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              draggable={false}
            />

            {/* 다음 버튼 */}
            <button
              onClick={() => moveLightbox(1)}
              disabled={lightboxIndex === images.length - 1}
              className="absolute right-1 z-10 p-2 text-white/60 disabled:opacity-20 active:text-white rounded-xl transition-colors"
              aria-label="다음"
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* 하단 정보 */}
          <div
            className="px-4 py-4 flex-none text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/50 text-xs">
              {images[lightboxIndex].uploaderNickname ?? '익명'} ·{' '}
              {getRelativeTime(images[lightboxIndex].uploadedAt)}
            </p>
            {/* 썸네일 스트립 */}
            {images.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    onClick={() => setLightboxIndex(i)}
                    className={`w-9 h-9 object-cover rounded-md flex-none cursor-pointer transition-all ${
                      i === lightboxIndex
                        ? 'ring-2 ring-white opacity-100'
                        : 'opacity-50 active:opacity-80'
                    }`}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
