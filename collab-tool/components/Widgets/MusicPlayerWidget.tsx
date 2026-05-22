'use client'

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  Trash2, Upload, X, Music, Check, Download,
} from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'
import type { Widget, MusicTrack } from '@/types'

interface MusicPlayerWidgetProps {
  widget: Widget
  nickname?: string
  onUploadTrack: (
    widgetId: string,
    file: File,
    nickname: string | undefined,
    onProgress: (pct: number) => void
  ) => Promise<boolean>
  onDeleteTrack: (widgetId: string, trackId: string) => Promise<boolean>
  onUpdateTrackName: (widgetId: string, trackId: string, newName: string) => Promise<boolean>
  onDeleteWidget: (widgetId: string) => Promise<boolean>
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MusicPlayerWidget({
  widget,
  nickname,
  onUploadTrack,
  onDeleteTrack,
  onUpdateTrackName,
  onDeleteWidget,
}: MusicPlayerWidgetProps) {
  const tracks: MusicTrack[] = (widget.data?.tracks as MusicTrack[]) || []

  // ── 재생 상태 (로컬 전용) ────────────────────────────────
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // ── UI 상태 ──────────────────────────────────────────────
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)

  const handleSaveTrack = useCallback(async (track: MusicTrack) => {
    if (savingId) return
    setSavingId(track.id)
    try {
      const response = await fetch(track.url)
      const blob = await response.blob()

      // 오디오 파일은 Web Share Files API가 지원되지 않는 경우 많으므로 blob 다운로드 우선
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = track.originalFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(track.url, '_blank')
    } finally {
      setSavingId(null)
    }
  }, [savingId])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  // ── 언마운트 시 오디오 정리 ──────────────────────────────
  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) { audio.pause(); audio.src = '' }
    }
  }, [])

  // ── 트랙 목록이 줄었을 때 인덱스 리셋 ──────────────────
  useEffect(() => {
    if (currentTrackIndex !== null && currentTrackIndex >= tracks.length) {
      setCurrentTrackIndex(null)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [tracks.length, currentTrackIndex])

  // ── 현재 트랙 변경 시 오디오 소스 교체 ──────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (currentTrackIndex === null) {
      audio.pause()
      audio.src = ''
      setCurrentTime(0)
      setDuration(0)
      return
    }
    const track = tracks[currentTrackIndex]
    if (!track) return
    audio.src = track.url
    audio.load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex])

  // ── 오디오 이벤트 등록 ──────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0)
    const onEnded = () => {
      if (currentTrackIndex !== null && currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex((i) => (i !== null ? i + 1 : null))
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }
    const onCanPlay = () => {
      if (isPlaying) audio.play().catch(() => setIsPlaying(false))
    }
    const onError = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [currentTrackIndex, isPlaying, tracks.length])

  // ── 자동 재생 (다음 트랙으로 이동 시) ───────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || currentTrackIndex === null || !isPlaying) return
    if (audio.src && audio.readyState >= 3) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [currentTrackIndex, isPlaying])

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (currentTrackIndex === null) {
      if (tracks.length === 0) return
      setCurrentTrackIndex(0)
      setIsPlaying(true)
      return
    }

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }, [currentTrackIndex, isPlaying, tracks.length])

  const handleSelectTrack = (index: number) => {
    if (currentTrackIndex === index) {
      handlePlayPause()
    } else {
      setCurrentTrackIndex(index)
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const handlePrev = () => {
    if (currentTrackIndex === null || currentTrackIndex === 0) return
    setCurrentTrackIndex((i) => (i !== null ? i - 1 : null))
  }

  const handleNext = () => {
    if (currentTrackIndex === null || currentTrackIndex >= tracks.length - 1) return
    setCurrentTrackIndex((i) => (i !== null ? i + 1 : null))
  }

  const startEdit = (track: MusicTrack) => {
    setEditingTrackId(track.id)
    setEditingName(track.name)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const saveEdit = async () => {
    if (!editingTrackId) return
    const trimmed = editingName.trim()
    if (trimmed) {
      await onUpdateTrackName(widget.id, editingTrackId, trimmed)
    }
    setEditingTrackId(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploadError(null)
    setUploadProgress(0)
    try {
      await onUploadTrack(widget.id, file, nickname, setUploadProgress)
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '업로드에 실패했습니다'
      setUploadError(msg)
    }
    setUploadProgress(null)
  }

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 숨겨진 오디오 엘리먼트 */}
      <audio ref={audioRef} preload="metadata" />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🎵</span>
          <span className="text-sm font-semibold text-gray-800 truncate">
            {widget.title || '음악 플레이어'}
          </span>
          {tracks.length > 0 && (
            <span className="text-xs text-gray-400 flex-none">{tracks.length}곡</span>
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

      {/* 현재 재생 중 플레이어 바 */}
      {currentTrack && (
        <div className="px-4 py-3 bg-gradient-to-b from-blue-50/60 to-white border-b border-blue-100/60">
          <p className="text-xs font-semibold text-blue-700 truncate mb-2">
            {currentTrack.name}
          </p>
          {/* Seek bar */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {/* 컨트롤 버튼 */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handlePrev}
              disabled={currentTrackIndex === 0}
              className="text-gray-400 disabled:opacity-25 p-1.5 active:text-blue-500 transition-colors"
              aria-label="이전 트랙"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-11 h-11 bg-blue-500 text-white rounded-full flex items-center justify-center active:bg-blue-600 shadow-md shadow-blue-200 transition-colors"
              aria-label={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={handleNext}
              disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}
              className="text-gray-400 disabled:opacity-25 p-1.5 active:text-blue-500 transition-colors"
              aria-label="다음 트랙"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 트랙 목록 */}
      {tracks.length === 0 && uploadProgress === null ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Music size={28} className="text-gray-200" />
          <p className="text-sm text-gray-400 font-medium">음악을 추가해보세요</p>
          <p className="text-xs text-gray-300">MP3 · M4A · WAV · OGG, 최대 50MB</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                currentTrackIndex === i ? 'bg-blue-50/40' : 'active:bg-gray-50'
              }`}
            >
              {/* 재생/정지 아이콘 */}
              <button
                onClick={() => handleSelectTrack(i)}
                className="flex-none w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                aria-label={currentTrackIndex === i && isPlaying ? '정지' : '재생'}
              >
                {currentTrackIndex === i && isPlaying ? (
                  <Pause size={16} className="text-blue-500" />
                ) : (
                  <Play size={16} className={currentTrackIndex === i ? 'text-blue-400 ml-0.5' : 'text-gray-300 ml-0.5'} />
                )}
              </button>

              {/* 트랙 정보 */}
              <div className="flex-1 min-w-0">
                {editingTrackId === track.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') setEditingTrackId(null)
                      }}
                      onBlur={saveEdit}
                      maxLength={50}
                      className="flex-1 text-sm border-b border-blue-400 bg-transparent focus:outline-none py-0.5 min-w-0"
                    />
                    <button onClick={saveEdit} className="flex-none text-blue-500 p-0.5">
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <p
                    className={`text-sm font-medium truncate cursor-pointer select-none ${
                      currentTrackIndex === i ? 'text-blue-600' : 'text-gray-800'
                    }`}
                    onDoubleClick={() => startEdit(track)}
                    onClick={() => handleSelectTrack(i)}
                  >
                    {track.name}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {track.uploaderNickname ?? '익명'} · {getRelativeTime(track.uploadedAt)}
                </p>
              </div>

              {/* 저장 버튼 */}
              <button
                onClick={() => handleSaveTrack(track)}
                disabled={!!savingId}
                className="flex-none p-1.5 text-gray-300 active:text-blue-400 rounded-lg transition-colors disabled:opacity-40"
                aria-label="트랙 저장"
              >
                {savingId === track.id
                  ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
                  : <Download size={13} />}
              </button>

              {/* 삭제 버튼 */}
              {confirmDeleteId === track.id ? (
                <div className="flex gap-1 flex-none">
                  <button
                    onClick={async () => {
                      setConfirmDeleteId(null)
                      await onDeleteTrack(widget.id, track.id)
                    }}
                    className="text-[11px] text-red-500 font-semibold px-1.5 py-0.5 rounded active:bg-red-50"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-[11px] text-gray-400 px-1.5 py-0.5 rounded active:bg-gray-100"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(track.id)}
                  className="flex-none p-1.5 text-gray-200 active:text-red-400 rounded-lg transition-colors"
                  aria-label="트랙 삭제"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
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
        <p className="text-xs text-red-500 px-4 pt-1.5">{uploadError}</p>
      )}

      {/* 업로드 버튼 */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept=".mp3,.m4a,.wav,.ogg,audio/*"
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
          음악 추가
        </label>
        <span className="text-xs text-gray-300">· 트랙명 더블탭으로 수정</span>
      </div>
    </div>
  )
}
