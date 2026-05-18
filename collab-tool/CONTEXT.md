# Collab 프로젝트 컨텍스트

## 프로젝트 개요
카카오톡 채팅방 공지에 링크 하나를 걸면, 참여자 전원이 로그인 없이 즉시 협업할 수 있는 실시간 위젯 보드.
**핵심 가치**: 카톡 대화를 스크롤하지 않아도 현재 상황을 한눈에 확인·수정 가능.

## 기술 스택
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Realtime)
- **UI 라이브러리**: lucide-react, vaul (Bottom Sheet), class-variance-authority, clsx
- **배포 예정**: Vercel

## 진행 단계 현황

| 단계 | 내용 | 상태 |
|------|------|------|
| 1단계 | DB 스키마 설계, 프로젝트 초기 설정, Supabase 클라이언트 | ✅ 완료 |
| 2단계 | 익명 로그인(Anonymous Auth), 닉네임 저장, 방 입장 로직 | ✅ 완료 |
| 3단계 | 실시간 위젯 엔진 (Checklist, Optimistic UI, Realtime 구독) | ✅ 완료 + 버그 수정 |
| 4단계 | 모바일 최적화 레이아웃, Bottom Sheet, 공유 기능, 햅틱 | ✅ 완료 |
| 5단계 | 정산(N빵) 위젯 추가 및 최종 폴리싱 | ✅ 완료 + 버그 수정 |

## 파일 구조

```
collab-tool/
├── app/
│   ├── layout.tsx              # PWA 메타태그, viewport 설정
│   ├── globals.css             # safe-area, tap highlight 제거
│   ├── page.tsx                # 홈 페이지
│   ├── room/[id]/page.tsx      # 방 페이지 - 모바일 최적화, Checklist+Expense 렌더링
│   └── api/
│       ├── rooms/route.ts      # POST /api/rooms - 방 생성
│       ├── rooms/[id]/route.ts # GET(방 조회) / POST(참여자 추가 - 중복 방지 포함)
│       ├── widgets/route.ts    # GET(위젯 목록) / POST(위젯 생성 - expense 기본값 포함)
│       └── widgets/[id]/route.ts # GET/PATCH/DELETE 특정 위젯
├── components/
│   ├── Auth/
│   │   └── SetNicknameModal.tsx   # 닉네임 입력 모달
│   ├── Shared/
│   │   └── Button.tsx             # 공용 버튼 (cva 기반)
│   └── Widgets/
│       ├── ChecklistWidget.tsx    # 체크리스트 위젯
│       ├── ExpenseWidget.tsx      # 정산(N빵) 위젯 (5단계 신규)
│       ├── AddWidgetDrawer.tsx    # vaul Bottom Sheet 위젯 추가 (checklist + expense)
│       └── AddWidgetModal.tsx     # (구버전, 사용 안 함)
├── hooks/
│   ├── useAuth.ts      # 익명 로그인, 닉네임 localStorage 관리
│   ├── useWidgets.ts   # 위젯 CRUD + Realtime 구독 + Optimistic UI
│   └── useRoom.ts      # 방/위젯/참여자 일괄 조회 (보조용)
├── lib/
│   ├── supabase.ts     # Supabase 클라이언트
│   ├── utils.ts        # generateId, generateShareUrl, copyToClipboard 등
│   └── constants.ts    # 위젯 타입, 라우트, 제한값 상수
└── types/
    └── index.ts        # Room, Participant, Widget, ChecklistData, ExpenseData 등 타입 정의
```

## DB 스키마 (Supabase)

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  share_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checklist','expense','vote','memo','schedule','roles','poll')),
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  color TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE widgets;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
```

## 핵심 설계 결정

### 실시간 동기화
- `useWidgets` 훅에서 `postgres_changes` Realtime 구독
- **Optimistic UI**: 체크/납부 클릭 → 즉시 UI 반영 → 서버 업데이트 → 실패 시 롤백
- `optimisticUpdates` Set으로 낙관적 업데이트 중인 위젯의 Realtime 이벤트 무시 (덮어쓰기 방지)
- **LWW (Last Write Wins)**: 충돌 해결은 단순 마지막 쓰기 우선

### 인증
- Supabase Anonymous Auth로 로그인 없이 즉시 세션 생성
- 닉네임만 `localStorage`에 저장 (`collab_nickname` 키)
- 방 입장 시 `participants` 테이블에 닉네임 등록
- **재방문 시 중복 방지**: 같은 닉네임이 이미 있으면 `last_active`만 업데이트 후 기존 participant 반환

### 위젯 데이터 구조 (JSONB)
```ts
// 체크리스트
{ items: [{ id, title, completed, assignee, created_at }] }

// 정산 (N빵)
{ totalAmount: number, description: string, payers: [{ name: string, paid: boolean }] }
```

### 정산(N빵) 위젯 기능
- 총 금액 탭하여 인라인 편집
- 설명 탭하여 인라인 편집 (예: "저녁 회식")
- 1인당 금액 자동 계산 (올림 적용)
- 납부자 추가/제거
- 납부 완료 토글 → Optimistic UI + 햅틱 피드백
- "나 추가" 버튼 (현재 닉네임 즉시 추가)
- "참여자 전체 추가" 버튼 (방 참여자 일괄 추가)
- 납부 진행률 바 표시

### useWidgets 훅 API
```ts
// 체크리스트
addChecklistItem(widgetId, text, user?)
toggleChecklistItem(widgetId, itemId)
updateChecklistItem(widgetId, itemId, newText)
deleteChecklistItem(widgetId, itemId)

// 정산
updateExpenseData(widgetId, data: ExpenseData)  // 전체 데이터 교체 (낙관적)
togglePayerStatus(widgetId, payerName)           // 납부 토글 (낙관적)

// 공통
createWidget(type, title, initialData?)
deleteWidget(widgetId)
```

### 모바일 레이아웃
- `h-dvh flex flex-col` — 전체 화면 고정
- 헤더 sticky + 콘텐츠 `flex-1 overflow-y-auto` + 하단 바 fixed
- `vaul` Drawer로 위젯 추가 Bottom Sheet
- Web Share API(`navigator.share`) → 카톡 공유, fallback 클립보드 복사
- `navigator.vibrate()` 햅틱 피드백
- iOS safe-area `env(safe-area-inset-bottom)` 대응

## 환경 변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxxxxxx...
```

## 실행 명령
```bash
npm run dev    # 개발 서버 (localhost:3000)
npm run build  # 프로덕션 빌드
npm run lint   # ESLint
```

## 알려진 이슈
- `.next/dev/types/validator.ts` TypeScript 오류: Next.js 16이 `[id]` 동적 라우트 폴더를 파싱하는 버그. 소스 코드 문제 아님, 빌드/실행에 영향 없음.
- `/create` 페이지 미구현 (홈에서 "새 협업 만들기" 링크가 있으나 페이지 없음). Supabase SQL로 직접 INSERT해서 테스트 가능.
- `npm run lint` 명령이 Next.js 16에서 정상 동작하지 않을 수 있음 (버전 이슈). `npx eslint .` 으로 대체 가능.

## 수정된 버그 이력

| 버그 | 수정 위치 | 내용 |
|------|----------|------|
| participant 중복 삽입 | `api/rooms/[id]/route.ts` | 같은 닉네임으로 재방문 시 매번 새 row 추가되던 문제. `maybeSingle()`로 기존 확인 후 `last_active`만 업데이트 |
| joinRoom 에러 분기 오류 | `room/[id]/page.tsx` | 중복 닉네임 에러 분기를 서버에서 처리하도록 이동. `currentParticipant` 항상 설정 |
| expense 기본 데이터 누락 | `api/widgets/route.ts`, `useWidgets.ts` | expense 위젯 생성 시 `{}` 대신 `{ totalAmount: 0, description: '', payers: [] }` |
| lint 스크립트 오류 | `package.json` | `next lint --fix` → `next lint` (`--fix` Next.js 16 미지원) |

## 현재 구현된 위젯
| 위젯 | 파일 | 상태 |
|------|------|------|
| 체크리스트 | `ChecklistWidget.tsx` | ✅ 완료 |
| 정산(N빵) | `ExpenseWidget.tsx` | ✅ 완료 |
| 투표, 메모, 일정, 역할 등 | - | ⏳ placeholder만 표시 |
