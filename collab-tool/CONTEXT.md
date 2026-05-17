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
| 5단계 | 정산(N빵) 위젯 추가 및 최종 폴리싱 | ⏳ 미구현 |

## 파일 구조

```
collab-tool/
├── app/
│   ├── layout.tsx              # PWA 메타태그, viewport 설정 (완료)
│   ├── globals.css             # safe-area, tap highlight 제거 (완료)
│   ├── page.tsx                # 홈 페이지 (완료)
│   ├── room/[id]/page.tsx      # 방 페이지 - 모바일 최적화 (완료)
│   └── api/
│       ├── rooms/route.ts      # POST /api/rooms - 방 생성
│       ├── rooms/[id]/route.ts # GET(방 조회) / POST(참여자 추가)
│       ├── widgets/route.ts    # GET(위젯 목록) / POST(위젯 생성)
│       └── widgets/[id]/route.ts
├── components/
│   ├── Auth/
│   │   └── SetNicknameModal.tsx   # 닉네임 입력 모달
│   ├── Shared/
│   │   └── Button.tsx             # 공용 버튼 (cva 기반)
│   └── Widgets/
│       ├── ChecklistWidget.tsx    # 체크리스트 위젯 (완료, 모바일 수정)
│       ├── AddWidgetDrawer.tsx    # vaul Bottom Sheet 위젯 추가 (완료)
│       └── AddWidgetModal.tsx     # (구버전, 더 이상 사용 안 함)
├── hooks/
│   ├── useAuth.ts      # 익명 로그인, 닉네임 localStorage 관리
│   ├── useWidgets.ts   # 위젯 CRUD + Realtime 구독 + Optimistic UI
│   └── useRoom.ts      # 방/위젯/참여자 일괄 조회 (보조용)
├── lib/
│   ├── supabase.ts     # Supabase 클라이언트
│   ├── utils.ts        # generateId, generateShareUrl, copyToClipboard 등
│   └── constants.ts    # 위젯 타입, 라우트, 제한값 상수
└── types/
    └── index.ts        # Room, Participant, Widget, ChecklistData 등 타입 정의
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
- **Optimistic UI**: 체크 클릭 → 즉시 UI 반영 → 서버 업데이트 → 실패 시 롤백
- `optimisticUpdates` Set으로 낙관적 업데이트 중인 위젯의 Realtime 이벤트 무시 (덮어쓰기 방지)
- **LWW (Last Write Wins)**: 충돌 해결은 단순 마지막 쓰기 우선

### 인증
- Supabase Anonymous Auth로 로그인 없이 즉시 세션 생성
- 닉네임만 `localStorage`에 저장 (`collab_nickname` 키)
- 방 입장 시 `participants` 테이블에 닉네임 등록

### 위젯 데이터 구조 (JSONB)
```ts
// 체크리스트
{ items: [{ id, title, completed, assignee, created_at }] }

// 정산 (5단계 미구현)
{ totalAmount: number, payers: [{ name, amount, paid }] }
```

### 모바일 레이아웃 (4단계)
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

## 다음 할 일 (5단계)
정산(N빵) 위젯 구현:
- `components/Widgets/ExpenseWidget.tsx` 생성
- 총금액 입력 → N빵 자동 계산
- 각 참여자별 납부 여부 체크 (실시간 동기화)
- `AddWidgetDrawer.tsx`에 expense 타입 옵션 추가
- `useWidgets.ts`에 expense 관련 함수 추가
  - `updateExpenseData(widgetId, data)`
  - `togglePayerStatus(widgetId, payerName)`
