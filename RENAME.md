# RENAME.md — 변경 이력 요약

## 2026-05-20

### fix: 멤버 관리 위젯 UX 개선 (메모 제거 · 행 높이 축소)

**변경 파일**: `collab-tool/components/Widgets/MemberWidget.tsx`

**변경 내용**:
- 이름 아래 메모 입력/표시 UI 완전 제거 (`editingNote` state, `handleEditMemberNote` 함수 포함)
- 멤버 행 상하 패딩 축소: `py-2.5` → `py-1.5`
- 상태 뱃지 크기 축소: `px-2.5 py-1 rounded-lg` → `px-2 py-0.5 rounded-md`
- 아이템 간 gap 축소: `gap-3` → `gap-2`

**목적**: 한 화면에 더 많은 멤버를 표시해 카카오톡처럼 스크롤 없이 한눈에 파악 가능하도록 개선
