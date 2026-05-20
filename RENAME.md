# RENAME.md — 변경 이력 요약

## 2026-05-20 (4차)

### feat: 카카오톡 공지창 스타일 공지 배너 추가 (14단계)

**변경 파일**:
- `collab-tool/types/index.ts` — `NoticeData` 타입, Widget type에 `'notice'` 추가
- `collab-tool/components/NoticeBanner.tsx` — 신규 생성 (공지 배너 + 공지 등록 바)
- `collab-tool/hooks/useWidgets.ts` — `upsertNotice` 함수 추가 (없으면 생성, 있으면 업데이트)
- `collab-tool/app/room/[id]/page.tsx` — 탭 바 아래에 NoticeBanner/NoticeAddBar 삽입

**DB 변경 (1회 실행 필요)**:
```sql
ALTER TABLE widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('checklist','expense','member','vote','memo','schedule','roles','poll','ledger','fee','tab-config','notice'));
```

**동작**:
- 공지 없을 때: 탭 바 아래 "공지 등록하기" 바 표시 → 탭 → 인라인 에디터로 등록
- 공지 있을 때: 노란 배너에 내용 한 줄 표시 (카카오톡 공지 스타일)
- 배너 탭 → 전체 내용 펼치기 / 작성자·시간 표시
- ✏️ 수정, 🗑️ 삭제, ✕ 세션 중 숨기기 지원
- notice 위젯은 탭 필터에서 제외 (전역 공지)

---

## 2026-05-20 (3차)

### feat: 일정 탭 및 달력 위젯 추가 (13단계)

**변경 파일**:
- `collab-tool/types/index.ts` — `ScheduleItem`에 `endTime`, `memo`, `color`, `created_at` 필드 추가, `ScheduleColor` 타입 추가
- `collab-tool/hooks/useWidgets.ts` — `updateScheduleData` 함수 추가, schedule defaultData 추가
- `collab-tool/components/Widgets/ScheduleWidget.tsx` — 신규 생성 (달력 그리드, 일정 CRUD, 색상 구분)
- `collab-tool/app/room/[id]/page.tsx` — `ActiveSection`에 `'schedule'` 추가, 일정 탭 버튼 및 섹션 렌더링, 자동 위젯 생성 로직
- `collab-tool/CONTEXT.md` — 13단계 내용 반영

**주요 기능**:
- 탭 바 오른쪽 끝에 [일정] [장부] 고정 탭 배치
- 월별 달력 그리드 (7×6), 오늘 날짜 하이라이트, 월 이동 네비게이션
- 일정 있는 날짜에 색상 dot 표시 (최대 3개)
- 날짜 선택 시 해당 날짜 일정 목록 표시 (시간순 정렬)
- 일정 추가/수정: 제목·날짜·시작/종료시간·장소·메모·색상(6가지) 입력
- 일정 삭제, 월 전체 일정 미리보기 리스트
- 일정 탭 진입 시 `schedule` 위젯 자동 생성 (장부 탭과 동일 패턴)

**DB**: 기존 constraint에 `schedule` 이미 포함됨 — 추가 SQL 불필요

---

## 2026-05-20 (2차)

### feat: 위젯 탭 분류 시스템 추가

**변경 파일**:
- `collab-tool/types/index.ts` — Widget에 `tab_id`, `tab-config` 타입, `TabConfig`/`TabConfigData` 인터페이스 추가
- `collab-tool/hooks/useWidgets.ts` — `tabs`, `createTab`, `deleteTab`, `setWidgetTab` 추가
- `collab-tool/app/room/[id]/page.tsx` — 탭 바 UI 전면 교체, 커스텀 탭 CRUD, 위젯 필터링

**DB 변경 (1회 실행)**:
```sql
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS tab_id TEXT;
ALTER TABLE widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('checklist','expense','member','vote','memo','schedule','roles','poll','ledger','fee','tab-config'));
```

**동작**:
- [전체] [커스텀탭] [+] — [장부] 탭 바
- "+" 클릭 → 탭 이름 인풋 → Enter로 생성
- 커스텀 탭의 X 버튼으로 탭 삭제 (소속 위젯들 tab_id 초기화)
- 커스텀 탭에서 위젯 추가 시 자동 배속

---

## 2026-05-20 (1차)

### fix: 멤버 관리 위젯 UX 개선 (메모 제거 · 행 높이 축소)

**변경 파일**: `collab-tool/components/Widgets/MemberWidget.tsx`

**변경 내용**:
- 이름 아래 메모 입력/표시 UI 완전 제거 (`editingNote` state, `handleEditMemberNote` 함수 포함)
- 멤버 행 상하 패딩 축소: `py-2.5` → `py-1.5`
- 상태 뱃지 크기 축소: `px-2.5 py-1 rounded-lg` → `px-2 py-0.5 rounded-md`
- 아이템 간 gap 축소: `gap-3` → `gap-2`

**목적**: 한 화면에 더 많은 멤버를 표시해 카카오톡처럼 스크롤 없이 한눈에 파악 가능하도록 개선
