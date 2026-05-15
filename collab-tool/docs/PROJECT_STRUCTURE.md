# 프로젝트 구조 및 개발 가이드

## 디렉토리 구조

```
collab-tool/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                   # Root layout (모든 페이지의 기본 레이아웃)
│   ├── page.tsx                     # 홈페이지 (/)
│   │
│   ├── create/                      # 협업 만들기 페이지
│   │   └── page.tsx                # 새 협업 생성 폼
│   │
│   ├── room/
│   │   └── [id]/                   # 협업 상세 페이지 ([id]는 동적 라우트)
│   │       ├── layout.tsx          # 협업 페이지 레이아웃
│   │       └── page.tsx            # 협업 상세 페이지
│   │
│   ├── api/                         # API Routes
│   │   ├── rooms/
│   │   │   ├── route.ts            # POST: 협업 생성
│   │   │   └── [id]/
│   │   │       ├── route.ts        # GET: 협업 조회
│   │   │       ├── participants/
│   │   │       │   └── route.ts    # POST: 참여자 추가
│   │   │       └── widgets/
│   │   │           └── route.ts    # POST: 위젯 생성
│   │   │
│   │   └── widgets/
│   │       └── [id]/
│   │           └── route.ts        # PATCH: 위젯 업데이트
│   │
│   ├── globals.css                 # 글로벌 스타일
│   └── favicon.ico
│
├── components/                       # React 컴포넌트
│   ├── Widgets/                     # 위젯 컴포넌트
│   │   ├── ChecklistWidget.tsx      # 체크리스트
│   │   ├── ExpenseWidget.tsx        # 회비 관리
│   │   ├── VoteWidget.tsx           # 투표
│   │   ├── ScheduleWidget.tsx       # 일정 조율
│   │   ├── RolesWidget.tsx          # 역할 분담
│   │   ├── MemoWidget.tsx           # 공동 메모
│   │   └── PollWidget.tsx           # 실시간 투표
│   │
│   ├── Participants/                # 참여자 관리
│   │   ├── ParticipantList.tsx      # 참여자 목록
│   │   └── AddParticipant.tsx       # 참여자 추가 모달
│   │
│   ├── Shared/                      # 공용 컴포넌트
│   │   ├── Button.tsx               # 버튼
│   │   ├── Input.tsx                # 입력 필드
│   │   ├── Card.tsx                 # 카드 레이아웃
│   │   ├── Modal.tsx                # 모달
│   │   ├── Toast.tsx                # 토스트 메시지
│   │   └── Loading.tsx              # 로딩 스피너
│   │
│   ├── Layout/                      # 레이아웃 컴포넌트
│   │   ├── Header.tsx               # 헤더
│   │   └── Footer.tsx               # 푸터
│   │
│   └── Home/                        # 홈페이지 컴포넌트
│       ├── Hero.tsx
│       ├── Features.tsx
│       └── CTA.tsx
│
├── lib/                             # 유틸리티 및 설정
│   ├── supabase.ts                 # Supabase 클라이언트 설정
│   ├── constants.ts                # 상수 정의
│   └── utils.ts                    # 유틸리티 함수
│
├── types/                           # TypeScript 타입 정의
│   └── index.ts                    # 모든 타입 정의 (Room, Widget, Participant 등)
│
├── hooks/                           # Custom React Hooks (예정)
│   ├── useRoom.ts                  # 협업 상태 관리
│   ├── useWidgets.ts               # 위젯 상태 관리
│   └── useParticipants.ts          # 참여자 상태 관리
│
├── public/                          # 정적 파일
│   ├── favicon.ico
│   └── robots.txt
│
├── docs/                            # 문서
│   ├── SUPABASE_SETUP.md           # Supabase 설정 가이드
│   ├── SUPABASE_DDL.sql            # 데이터베이스 스키마
│   ├── API_SPEC.md                 # API 명세 (예정)
│   └── ARCHITECTURE.md             # 아키텍처 설명 (예정)
│
├── .env.local                       # 환경 변수 (로컬)
├── .gitignore
├── package.json                     # 의존성 및 스크립트
├── tsconfig.json                    # TypeScript 설정
├── tailwind.config.ts               # Tailwind CSS 설정
├── postcss.config.mjs               # PostCSS 설정
├── next.config.ts                   # Next.js 설정
├── README.md                        # 프로젝트 README
└── AGENTS.md                        # Vercel AI SDK 설정 (자동 생성)
```

## 핵심 파일 설명

### lib/supabase.ts
Supabase 클라이언트를 초기화하고 내보냅니다.
다른 파일에서 `import { supabase } from '@/lib/supabase'`로 사용 가능합니다.

```typescript
import { supabase } from '@/lib/supabase'

// 예시: 방 조회
const { data, error } = await supabase
  .from('rooms')
  .select()
  .eq('id', roomId)
```

### types/index.ts
모든 TypeScript 타입을 정의합니다.
각 데이터 모델 (Room, Widget, Participant)의 인터페이스가 정의되어 있습니다.

```typescript
import type { Room, Widget, Participant } from '@/types'

const room: Room = {
  id: '...',
  title: 'Trip Planning',
  created_at: '2026-05-16T...',
}
```

### lib/constants.ts
앱 전체에서 사용되는 상수를 정의합니다.
위젯 타입, 에러 메시지, API 경로 등이 정의되어 있습니다.

### lib/utils.ts
자주 사용되는 유틸리티 함수들을 정의합니다.
- `generateShareUrl()`: 공유 URL 생성
- `getRelativeTime()`: 상대 시간 표시
- `copyToClipboard()`: 클립보드 복사
- `isValidNickname()`: 닉네임 검증

## 데이터 흐름

```
브라우저
  ↓
Next.js API Route (/api/rooms, /api/widgets, ...)
  ↓
Supabase Client (lib/supabase.ts)
  ↓
PostgreSQL Database (via Supabase)
  ↓
Realtime (변경사항 브라우드캐스트)
  ↓
모든 클라이언트에서 감지 & 화면 업데이트
```

## 컴포넌트 계층

### 페이지 컴포넌트
- `app/page.tsx` (Home)
- `app/create/page.tsx` (Create Room)
- `app/room/[id]/page.tsx` (Room Detail)

### 레이아웃 컴포넌트
- `components/Layout/Header.tsx`
- `components/Layout/Footer.tsx`

### 기능 컴포넌트
- `components/Widgets/*` (위젯)
- `components/Participants/*` (참여자 관리)

### 공용 컴포넌트
- `components/Shared/Button.tsx`
- `components/Shared/Card.tsx`
- `components/Shared/Modal.tsx`

## 개발 워크플로우

### 새 페이지 추가
1. `app/[path]/page.tsx` 생성
2. 필요한 컴포넌트 작성 (`components/`)
3. 레이아웃 필요시 `layout.tsx` 생성
4. Tailwind CSS로 스타일링

### 새 API 엔드포인트 추가
1. `app/api/[resource]/route.ts` 생성
2. `GET`, `POST` 등의 함수 정의
3. Supabase 클라이언트로 데이터 조회/수정
4. 에러 처리 및 응답 포맷팅

### 새 위젯 추가
1. `types/index.ts`에 타입 정의
2. `components/Widgets/NewWidget.tsx` 생성
3. 렌더링 로직 구현
4. `lib/constants.ts`에 레이블 추가
5. 위젯 레지스트리에 등록

## 스타일링

- **Tailwind CSS**: 유틸리티 클래스 기반 스타일링
- **Mobile First**: 모바일 먼저 설계 (`sm:`, `md:`, `lg:` 반응형 클래스)
- **컬러 팔레트**: `blue-500`, `gray-900` 등 기본 팔레트 사용

```tsx
<div className="flex flex-col gap-4 p-4 sm:p-6 md:gap-8">
  <h1 className="text-lg md:text-2xl font-bold text-gray-900">Title</h1>
</div>
```

## 상태 관리 (예정)

현재는 React 내장 상태 관리 (`useState`, `useEffect`)를 사용합니다.
향후 필요시:
- `Zustand` (간단한 전역 상태)
- `TanStack Query` (서버 상태 관리)
- `Context API` (인증 상태)

## 테스트 (예정)

- Unit Tests: `Jest` + `React Testing Library`
- E2E Tests: `Playwright`
- 테스트 파일: `__tests__/` 또는 `*.test.tsx`

## 배포

### 개발
```bash
npm run dev
```

### 프로덕션
```bash
npm run build
npm run start
```

### Vercel 배포
1. GitHub 저장소 연동
2. Vercel 프로젝트 생성
3. 환경 변수 설정
4. 자동 배포

## 성능 최적화

- 동적 import로 코드 분할
- Next.js Image로 이미지 최적화
- Supabase 쿼리 최적화 (인덱스, 한 번에 필요한 데이터만)
- 실시간 업데이트로 폴링 최소화

## 보안

- Supabase RLS로 행 수준 보안
- 환경 변수로 민감 정보 보호
- HTTPS 전송 (Vercel)
- 입력값 검증 (클라이언트 & 서버)
