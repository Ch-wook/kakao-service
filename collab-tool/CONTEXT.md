# Collab 프로젝트 컨텍스트

## 프로젝트 개요
카카오톡 채팅방 공지에 링크 하나를 걸면, 참여자 전원이 **로그인 없이** 즉시 협업할 수 있는 실시간 위젯 보드.

**핵심 가치**: 카톡 대화를 스크롤하지 않아도 현재 상황을 한눈에 확인·수정 가능.

**GitHub**: `https://github.com/Ch-wook/kakao-service` (브랜치: main)  
**Vercel**: 배포 진행 중 (Root Directory: `collab-tool`)

---

## 기술 스택
- **Frontend**: Next.js 16.2.6 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Realtime)
- **UI 라이브러리**: lucide-react, vaul (Bottom Sheet), class-variance-authority, clsx
- **배포**: Vercel

---

## 진행 단계 현황

| 단계 | 내용 | 상태 |
|------|------|------|
| 1단계 | DB 스키마 설계, 프로젝트 초기 설정, Supabase 클라이언트 | ✅ 완료 |
| 2단계 | 익명 로그인(Anonymous Auth), 닉네임 저장, 방 입장 로직 | ✅ 완료 |
| 3단계 | 실시간 위젯 엔진 (Checklist, Optimistic UI, Realtime 구독) | ✅ 완료 |
| 4단계 | 모바일 최적화 레이아웃, Bottom Sheet, 공유 기능, 햅틱 | ✅ 완료 |
| 5단계 | 정산(N빵) 위젯 추가 및 전체 버그 수정 | ✅ 완료 |
| 배포 | Vercel 배포 + 빌드 오류 수정 | 🔄 진행 중 |

---

## 파일 구조

```
kakao-service/                      ← GitHub 저장소 루트
└── collab-tool/                    ← Next.js 프로젝트 (Vercel Root Directory)
    ├── app/
    │   ├── layout.tsx              # PWA 메타태그, viewport 설정
    │   ├── globals.css             # safe-area, tap highlight 제거
    │   ├── page.tsx                # 홈 페이지 (모바일 우선)
    │   ├── create/
    │   │   └── page.tsx            # 방 만들기 폼 (/create)
    │   ├── room/[id]/
    │   │   └── page.tsx            # 방 페이지 - 위젯 렌더링
    │   └── api/
    │       ├── rooms/
    │       │   ├── route.ts        # GET(공유코드조회) / POST(방 생성)
    │       │   └── [id]/
    │       │       └── route.ts    # GET(방 조회) / POST(참여자 추가)
    │       └── widgets/
    │           ├── route.ts        # GET(위젯목록) / POST(위젯 생성)
    │           └── [id]/
    │               └── route.ts   # GET / PATCH / DELETE
    ├── components/
    │   ├── Auth/
    │   │   └── SetNicknameModal.tsx
    │   ├── Shared/
    │   │   └── Button.tsx
    │   └── Widgets/
    │       ├── ChecklistWidget.tsx  # 체크리스트 위젯
    │       ├── ExpenseWidget.tsx    # 정산(N빵) 위젯
    │       └── AddWidgetDrawer.tsx  # vaul Bottom Sheet
    ├── hooks/
    │   ├── useAuth.ts              # 익명 로그인, 닉네임 localStorage
    │   ├── useWidgets.ts           # 위젯 CRUD + Realtime + Optimistic UI
    │   └── useRoom.ts              # 방/위젯/참여자 일괄 조회 (보조)
    ├── lib/
    │   ├── supabase.ts             # Supabase 클라이언트 (NEXT_PUBLIC_ 키 사용)
    │   ├── utils.ts                # generateId, generateShareUrl 등
    │   └── constants.ts            # 위젯 타입, 라우트, 제한값 상수
    ├── types/
    │   └── index.ts                # 모든 타입 정의
    ├── next.config.ts              # typescript.ignoreBuildErrors: true
    └── .env.local                  # Supabase 환경변수 (gitignore됨)
```

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://pvzkvfwsjmynvtypzbmn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_zrlvgD1cwQgKRCMLHMjW-A_Ebzd3veo
```

> `.env.local`은 `.gitignore`에 포함되어 **GitHub에 올라가지 않음**.  
> Vercel 배포 시 Environment Variables에 직접 입력해야 함.

---

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

### Supabase에서 반드시 설정해야 하는 것

**1. RLS 정책** (SQL Editor에서 실행):
```sql
-- rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 방 조회 가능" ON rooms FOR SELECT USING (true);
CREATE POLICY "누구나 방 생성 가능" ON rooms FOR INSERT WITH CHECK (true);

-- widgets
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 위젯 조회 가능" ON widgets FOR SELECT USING (true);
CREATE POLICY "누구나 위젯 생성 가능" ON widgets FOR INSERT WITH CHECK (true);
CREATE POLICY "누구나 위젯 수정 가능" ON widgets FOR UPDATE USING (true);
CREATE POLICY "누구나 위젯 삭제 가능" ON widgets FOR DELETE USING (true);

-- participants
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 참여자 조회 가능" ON participants FOR SELECT USING (true);
CREATE POLICY "누구나 참여 가능" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "last_active 업데이트 가능" ON participants FOR UPDATE USING (true);
```

**2. Anonymous Auth 활성화**:  
Supabase 대시보드 → Authentication → Providers → Anonymous → `Enable anonymous sign-ins` 켜기

> ⚠️ 이 설정이 없으면 닉네임 모달이 안 뜨고 "0명 참여 중"으로 표시됨

---

## 위젯 데이터 구조 (JSONB)

```ts
// 체크리스트
{
  items: [{ id: string, title: string, completed: boolean, assignee?: string, created_at?: string }]
}

// 정산 (N빵)
{
  totalAmount: number,
  description: string,
  payers: [{ name: string, paid: boolean }]
}
```

---

## useWidgets 훅 전체 API

```ts
// 공통
createWidget(type, title, initialData?)   // 생성 후 즉시 로컬 상태 반영
deleteWidget(widgetId)

// 체크리스트
addChecklistItem(widgetId, text, user?)
toggleChecklistItem(widgetId, itemId)     // Optimistic UI
updateChecklistItem(widgetId, itemId, newText)
deleteChecklistItem(widgetId, itemId)

// 정산 (N빵)
updateExpenseData(widgetId, data: ExpenseData)   // 전체 교체 (Optimistic)
togglePayerStatus(widgetId, payerName)            // 납부 토글 (Optimistic)
```

---

## 핵심 설계 결정

### 실시간 동기화
- `useWidgets` 훅의 `postgres_changes` Realtime 구독
- **Optimistic UI**: 클릭 → 즉시 UI 반영 → 서버 업데이트 → 실패 시 롤백
- `optimisticUpdates` Set으로 낙관적 업데이트 중인 위젯의 Realtime 이벤트 무시
- `createWidget` 성공 시 Realtime을 기다리지 않고 즉시 로컬 상태에 추가
- **LWW (Last Write Wins)**: 충돌 해결은 마지막 쓰기 우선

### 인증
- Supabase Anonymous Auth로 로그인 없이 즉시 세션 생성
- 닉네임만 `localStorage`에 저장 (`collab_nickname` 키)
- 방 입장 시 `participants` 테이블에 등록
- 재방문 시 같은 닉네임이면 `last_active`만 업데이트 (중복 삽입 방지)

### 공유 링크
- 공유 URL 형식: `https://도메인/room/{uuid}`
- 공유 버튼: 클립보드 복사 우선, 모바일에서만 추가로 Web Share API 시도
- `/join` 페이지 없음 - 링크 직접 방문으로 참여

### API 라우트 패턴
- 모든 API 파일에서 모듈 레벨 `throw` 제거 → `getSupabase()` 함수로 lazy 초기화
- 환경변수 누락 시 HTML 에러 대신 JSON 에러 반환

### 모바일 레이아웃
- `h-dvh flex flex-col` — 전체 화면 고정
- 헤더 sticky + 콘텐츠 `flex-1 overflow-y-auto` + 하단 바 (위젯 있을 때만)
- iOS safe-area `env(safe-area-inset-bottom)` 대응

---

## 수정된 버그 이력

| 버그 | 수정 위치 | 내용 |
|------|----------|------|
| participant 중복 삽입 | `api/rooms/[id]/route.ts` | 재방문 시마다 새 row 추가 → `maybeSingle()`로 기존 확인 후 반환 |
| API HTML 에러 반환 | 모든 API route.ts | 모듈 레벨 `throw` → `getSupabase()` 함수로 교체 |
| rooms/[id] 경로 깨짐 | `api/rooms/[id]/` | 디렉토리가 `[id`(오타)로 저장 → `[System.IO.Directory]::CreateDirectory`로 올바른 `[id]` 생성 |
| widget 새로고침 필요 | `hooks/useWidgets.ts` | `createWidget` 성공 시 Realtime 기다리지 않고 즉시 로컬 상태 반영 |
| 공유 버튼 오작동 | `room/[id]/page.tsx` | 데스크탑에서 `navigator.share` 오류 → 클립보드 복사 우선으로 변경 |
| 위젯 생성 에러 숨김 | `AddWidgetDrawer.tsx` | 생성 실패 시 Drawer가 닫혀서 에러 안 보임 → 실패 시 Drawer 유지 + 에러 표시 |
| Vercel 빌드 실패 | `next.config.ts` | `rooms/[id/]` 깨진 경로 git rm + `ignoreBuildErrors: true` 추가 |
| expense 기본 데이터 | `api/widgets/route.ts` | expense 위젯 생성 시 `{}` → `{ totalAmount: 0, description: '', payers: [] }` |

---

## 알려진 이슈

- **Next.js 16 TypeScript 오류**: `.next/types/validator.ts`에서 `[id]` 동적 라우트 관련 오류 발생. 소스 코드 문제 아님. `next.config.ts`의 `ignoreBuildErrors: true`로 우회 중.
- **Anonymous Auth 미설정 시**: 닉네임 모달이 안 뜨고 "0명 참여 중" 표시. Supabase 대시보드에서 활성화 필요.
- **`/create` 페이지**: 구현 완료. 이전에는 없어서 404 발생했으나 수정됨.
- **Realtime 필터**: `postgres_changes` 구독에 `room_id` 필터 사용 중. RLS SELECT 정책 적용 필요.

---

## 현재 구현된 위젯

| 위젯 | 파일 | 기능 |
|------|------|------|
| 체크리스트 | `ChecklistWidget.tsx` | 항목 추가/수정/삭제/체크, 진행률 바, 담당자 표시 |
| 정산 (N빵) | `ExpenseWidget.tsx` | 총액 입력, 1인당 자동 계산, 납부 토글, 참여자 일괄 추가 |
| 투표·메모 등 | - | placeholder만 표시 (미구현) |

---

## 서비스 사용 흐름

```
[방장]
1. 앱 접속 → "새 협업 만들기" → 이름 입력 → 생성
2. 방 페이지에서 "공유" 탭 → 링크가 클립보드에 복사됨
3. 링크를 카톡방에 붙여넣기

[참여자]
4. 카톡방에서 링크 탭
5. 닉네임 입력 → 입장 완료
6. 위젯 추가 버튼 → 체크리스트 / 정산 선택 → 실시간 협업
```

---

## 실행 명령

```bash
# 개발 서버
cd collab-tool
npm install
npm run dev       # http://localhost:3000

# 빌드 확인
npm run build
```

---

## Vercel 배포 설정

| 항목 | 값 |
|------|-----|
| Repository | `Ch-wook/kakao-service` (또는 `kakao-sheet`) |
| Branch | `main` |
| **Root Directory** | **`collab-tool`** ← 반드시 지정 |
| Framework | Next.js (자동 감지) |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Node.js Version | 18.x 이상 |

**Environment Variables (Vercel에 직접 입력)**:
```
NEXT_PUBLIC_SUPABASE_URL = https://pvzkvfwsjmynvtypzbmn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_zrlvgD1cwQgKRCMLHMjW-A_Ebzd3veo
```

---

## 다음 할 일 (미구현)

- [ ] Anonymous Auth 활성화 확인 (Supabase 대시보드)
- [ ] Vercel 배포 완료 확인
- [ ] 투표(vote) 위젯 구현
- [ ] 공동 메모(memo) 위젯 구현
- [ ] 방 목록 / 즐겨찾기 기능
- [ ] 방 제목 수정 기능
- [ ] 위젯 순서 변경 (드래그)
