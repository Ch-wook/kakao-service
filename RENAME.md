# RENAME.md — 변경 이력 요약

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
