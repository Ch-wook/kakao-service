# Collab 프로젝트 컨텍스트 (AI 인수인계용)

## 프로젝트 개요
카카오톡 채팅방 공지에 링크 하나를 걸면, 참여자 전원이 **로그인 없이** 즉시 협업할 수 있는 실시간 위젯 보드.

**GitHub**: `https://github.com/Ch-wook/kakao-service` (브랜치: main)  
**Vercel Root Directory**: `collab-tool`  
**배포 URL**: Vercel 대시보드에서 확인 (프로젝트 재생성 이력 있음)

---

## 기술 스택
- **Frontend**: Next.js 16.2.6 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Realtime)
- **UI**: lucide-react, vaul (Bottom Sheet), class-variance-authority, clsx
- **엑셀 내보내기**: SheetJS (xlsx)
- **배포**: Vercel (Node.js 20.x)

---

## 진행 단계 현황

| 단계 | 내용 | 상태 |
|------|------|------|
| 1단계 | DB 스키마 설계, 프로젝트 초기 설정, Supabase 클라이언트 | ✅ |
| 2단계 | 익명 로그인, 닉네임 저장, 방 입장 로직 | ✅ |
| 3단계 | 실시간 위젯 엔진 (Optimistic UI, Realtime 구독) | ✅ |
| 4단계 | 모바일 최적화, Bottom Sheet, 공유 기능, 햅틱 | ✅ |
| 5단계 | 정산(N빵) 위젯, 전체 버그 수정 | ✅ |
| 6단계 | 멤버 관리 위젯 (그룹별 인원·상태 관리, 이름 수정) | ✅ |
| 7단계 | 관리자 페이지, 에러 바운더리, 방 생성 제한, 보안 강화 | ✅ |
| 8단계 | 회계장부 위젯 (수입·지출 거래 기록, 엑셀 현금출납장 다운로드) | ✅ |
| 10단계 | 회계장부 항목 단순화 (회비·식대·지원금·물품구매·기타 직접입력), 과세구분 제거, 엑셀 스타일링 | ✅ |
| 11단계 | 멤버 관리 위젯 UX 개선 (메모 제거, 행 높이 축소, 뱃지 소형화) | ✅ |
| 12단계 | 위젯 탭 분류 시스템 (커스텀 탭 추가·삭제, 위젯 자동 배속, 전체/장부 탭 유지) | ✅ |
| 13단계 | 일정 탭 추가 (달력 뷰, 일정 CRUD, 색상 구분, 시간·장소·메모 입력) | ✅ |
| 14단계 | 공지 배너 (탭 바 아래 고정, 공지 등록·수정·삭제·펼치기·숨기기) | ✅ |
| 배포 | Vercel 배포 완료 | ✅ |

---

## 파일 구조

```
kakao-service/
├── CLAUDE.md                         # AI 보안 규칙 (공동 계정 개인정보 보호)
└── collab-tool/
    ├── app/
    │   ├── layout.tsx                # PWA 메타태그, viewport 설정
    │   ├── globals.css               # safe-area, tap highlight 제거
    │   ├── page.tsx                  # 홈 페이지 (모바일 우선)
    │   ├── error.tsx                 # 전역 에러 바운더리
    │   ├── create/page.tsx           # 방 만들기 폼
    │   ├── collab-manage/page.tsx    # 관리자 페이지 (비밀번호 보호)
    │   ├── room/[id]/
    │   │   ├── page.tsx              # 방 페이지 - 위젯 렌더링
    │   │   └── error.tsx             # 방 에러 바운더리
    │   └── api/
    │       ├── rooms/route.ts        # GET(공유코드조회) / POST(방 생성+제한)
    │       ├── rooms/[id]/route.ts   # GET(방 조회) / POST(참여자 추가)
    │       ├── widgets/route.ts      # GET(위젯목록) / POST(위젯 생성)
    │       ├── widgets/[id]/route.ts # GET / PATCH / DELETE
    │       └── admin/rooms/
    │           ├── route.ts          # GET: 전체 방 목록 (관리자 전용)
    │           └── [id]/route.ts     # DELETE: 방 삭제 (관리자 전용)
    ├── components/
    │   ├── Auth/SetNicknameModal.tsx
    │   ├── Shared/Button.tsx
    │   └── Widgets/
    │       ├── ChecklistWidget.tsx
    │       ├── ExpenseWidget.tsx
    │       ├── MemberWidget.tsx      # 멤버 관리 위젯
    │       ├── LedgerWidget.tsx      # 회계장부 위젯 (SheetJS 엑셀 내보내기)
    │       ├── ScheduleWidget.tsx    # 일정 위젯 (달력, 일정 CRUD, 색상 구분)
    │       └── AddWidgetDrawer.tsx   # vaul Bottom Sheet
    ├── hooks/
    │   ├── useAuth.ts                # 익명 로그인, 닉네임 localStorage
    │   ├── useWidgets.ts             # 위젯 CRUD + Realtime + Optimistic UI
    │   └── useRoom.ts
    ├── lib/
    │   ├── supabase.ts               # Supabase 클라이언트 (lazy 초기화)
    │   ├── supabase-admin.ts         # Service Role 클라이언트 (관리자용)
    │   ├── utils.ts
    │   └── constants.ts
    ├── public/manifest.json
    ├── types/index.ts                # 모든 타입 정의
    └── next.config.ts                # ignoreBuildErrors: true
```

---

## 환경변수

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 삭제용 (서버 전용, NEXT_PUBLIC 붙이면 안됨) |
| `ADMIN_PASSWORD` | 관리자 페이지 비밀번호 |
| `MAX_ROOMS` | 최대 방 개수 (기본값: 300) |

---

## 탭 시스템 (12단계)

- `widgets` 테이블에 `tab_id TEXT` 컬럼 추가 (어느 탭에 속하는지)
- `widgets` type constraint에 `tab-config` 추가
- `tab-config` 타입 위젯: `{ tabs: [{ id, name }] }` — 방 단위로 1개 존재, 탭 목록 저장
- 위젯 추가 시 현재 탭 자동 배속, 탭 삭제 시 해당 위젯들 tab_id 초기화
- 탭 바: [전체] [커스텀탭...] [+] — [일정] [장부]

### SQL (최초 1회 실행 필요)
```sql
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS tab_id TEXT;
ALTER TABLE widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('checklist','expense','member','vote','memo','schedule','roles','poll','ledger','fee','tab-config','notice'));
```

---

## Supabase 설정 (전체)

```sql
-- RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 방 조회 가능" ON rooms FOR SELECT USING (true);
CREATE POLICY "누구나 방 생성 가능" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "관리자 방 삭제 가능" ON rooms FOR DELETE USING (true);

ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 위젯 조회 가능" ON widgets FOR SELECT USING (true);
CREATE POLICY "누구나 위젯 생성 가능" ON widgets FOR INSERT WITH CHECK (true);
CREATE POLICY "누구나 위젯 수정 가능" ON widgets FOR UPDATE USING (true);
CREATE POLICY "누구나 위젯 삭제 가능" ON widgets FOR DELETE USING (true);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 참여자 조회 가능" ON participants FOR SELECT USING (true);
CREATE POLICY "누구나 참여 가능" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "last_active 업데이트 가능" ON participants FOR UPDATE USING (true);

-- 위젯 타입 constraint 업데이트 (최신)
ALTER TABLE widgets DROP CONSTRAINT IF EXISTS widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('checklist','expense','member','vote','memo','schedule','roles','poll','ledger','fee','tab-config','notice'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE widgets;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
```

**Authentication → Providers → Anonymous → Enable 필수**

---

## 위젯 데이터 구조 (JSONB)

```ts
// 체크리스트
{ items: [{ id, title, completed, assignee?, created_at? }] }

// 정산 (N빵)
{ totalAmount: number, description: string, payers: [{ name, paid }] }

// 멤버 관리
{
  groups: [{
    id: string,
    name: string,
    targetCount?: number,
    members: [{ id, name, status: 'unknown'|'attending'|'arrived'|'preparing'|'absent'|'home' }]
  }]
}

// 일정
{
  items: [{
    id: string,
    title: string,
    date: string,           // YYYY-MM-DD
    time?: string,          // HH:MM
    endTime?: string,       // HH:MM
    location?: string,
    memo?: string,
    participants: string[], // 작성자 닉네임
    color?: 'blue'|'green'|'red'|'orange'|'purple'|'pink',
    created_at: string
  }]
}

// 회계장부
{
  entries: [{
    id: string,
    date: string,           // YYYY-MM-DD
    type: 'income'|'expense',
    category: string,       // 항목 (회비|식대|지원금|물품구매|기타 직접입력)
    description: string,    // 상세내역
    amount: number,
    taxType?: '과세'|'면세'|'비과세'|'영세율',  // 구버전 호환용, 신규 미사용
    paymentMethod?: '현금'|'카드'|'계좌이체'|'어음'|'기타',
    voucherType?: '세금계산서'|'계산서'|'영수증'|'카드매출전표'|'없음',
    memo?: string,
    created_at: string
  }],
  openingBalance: number,   // 기초잔액
  companyName: string,      // 상호
  businessNumber: string,   // 사업자등록번호
  fiscalYear: string        // 회계연도
}
```

---

## useWidgets 훅 API

```ts
createWidget(type, title, initialData?)
deleteWidget(widgetId)

// 체크리스트
addChecklistItem(widgetId, text, user?)
toggleChecklistItem(widgetId, itemId)      // Optimistic UI
updateChecklistItem(widgetId, itemId, newText)
deleteChecklistItem(widgetId, itemId)

// 정산
updateExpenseData(widgetId, data: ExpenseData)   // Optimistic
togglePayerStatus(widgetId, payerName)            // Optimistic

// 멤버 관리
updateMemberData(widgetId, data: MemberData)     // Optimistic
toggleMemberStatus(widgetId, groupId, memberId)  // Optimistic, 상태 순환

// 회계장부
updateLedgerData(widgetId, data: LedgerData)     // Optimistic, 거래 추가·수정·삭제·설정 변경 통합

// 일정
updateScheduleData(widgetId, data: ScheduleData) // Optimistic, 일정 추가·수정·삭제 통합
```

---

## 핵심 설계 결정

### Optimistic UI
클릭 → 즉시 UI 반영 → 서버 업데이트 → 실패 시 롤백  
`optimisticUpdates` Set으로 낙관적 업데이트 중인 위젯의 Realtime 이벤트 무시

### 관리자 인증
- 헤더 `x-admin-password` vs 환경변수 `ADMIN_PASSWORD` 비교
- `SUPABASE_SERVICE_ROLE_KEY`로 RLS 우회해 방 삭제
- 삭제 시 `.select()` 체이닝으로 silent fail 감지 (0행 삭제 = 에러 반환)
- sessionStorage에 비밀번호 저장 (탭 닫으면 자동 로그아웃)
- 관리자 URL: `/collab-manage` (추측 방지)

### 방 생성 제한
POST /api/rooms에서 현재 방 개수 확인 → `MAX_ROOMS` 초과 시 503 반환

### 에러 바운더리
- `app/error.tsx`: 전역 (다시 시도 / 홈으로)
- `app/room/[id]/error.tsx`: 방 전용 (다시 시도 / 홈으로)

---

## 수정된 버그 이력

| 버그 | 수정 위치 | 내용 |
|------|----------|------|
| participant 중복 삽입 | `api/rooms/[id]/route.ts` | `maybeSingle()`로 재방문 감지 |
| API HTML 에러 반환 | 모든 API route.ts | 모듈 레벨 throw → getSupabase() lazy |
| widget 새로고침 필요 | `useWidgets.ts` | createWidget 후 즉시 로컬 상태 반영 |
| 공유 버튼 오작동 | `room/[id]/page.tsx` | 클립보드 복사 우선, 모바일만 Web Share |
| Supabase 빌드 crash | `lib/supabase.ts` | 모듈 레벨 → lazy 초기화 함수로 변경 |
| manifest.json 누락 | `public/manifest.json` | 파일 생성 |
| 관리자 방 삭제 silent fail | `api/admin/rooms/[id]/route.ts` | `.select()` 추가로 0행 삭제 감지 |
| rooms DELETE RLS 없음 | Supabase SQL | `CREATE POLICY "관리자 방 삭제 가능"` 추가 필요 |

---

## Vercel 배포 설정

| 항목 | 값 |
|------|-----|
| Repository | `Ch-wook/kakao-service` |
| Branch | `main` |
| **Root Directory** | **`collab-tool`** ← 반드시 지정 |
| Framework | Next.js (자동 감지) |
| Node.js Version | 20.x |

### 과거 배포 실패 원인 (해결됨)
1. Root Directory 미설정 → `collab-tool` 지정
2. 환경변수 미설정 → Vercel 대시보드 수동 입력
3. Node.js 24.x → 20.x 변경
4. Supabase 모듈 레벨 초기화 → lazy 초기화
5. Vercel 프로젝트 상태 꼬임 → 프로젝트 삭제 후 재생성

---

## 알려진 이슈

- **Next.js 16 TypeScript 오류**: `.next/types/validator.ts`에서 `[id]` 동적 라우트 관련 오류. 소스 문제 아님. `ignoreBuildErrors: true`로 우회 중.
- **Supabase 7일 일시정지**: 프리 티어는 7일 비활성 시 DB 자동 일시정지. 재접속 시 대시보드에서 재개 필요.
- **Anonymous Auth 미설정 시**: 닉네임 모달 안 뜨고 "0명 참여 중" 표시.

---

## 다음 할 일 (미구현)

- [ ] 투표(vote) 위젯 구현
- [ ] 공동 메모(memo) 위젯 구현
- [ ] Supabase pg_cron으로 비활성 방 자동 만료
- [ ] Realtime 연결 끊김 시 재연결 UI
- [ ] 위젯 순서 변경 (드래그)
- [ ] 방 제목 수정 기능
- [ ] 회계장부 엑셀 셀 스타일링 (색상·테두리, SheetJS Pro 또는 ExcelJS 전환 시 가능)
