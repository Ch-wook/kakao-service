# Collab - 메신저 협업 도구

카카오톡 채팅방의 흐름은 유지하면서, 협업 데이터를 구조화해서 관리하는 초경량 웹 서비스입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + API)
- **Real-time**: Supabase Realtime
- **UI**: lucide-react (아이콘), shadcn/ui (컴포넌트)
- **Deployment**: Vercel

## 핵심 아이디어

- 🔗 카톡방에 링크 하나만 공유
- ⚡ 로그인 불필요, 링크만 눌러 바로 참여
- 📱 모바일 최적화된 가벼운 UI
- 🔄 모든 변경사항 실시간 동기화
- 💬 채팅 흐름을 방해하지 않는 구조

## 프로젝트 구조

```
collab-tool/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── create/                  # 협업 만들기
│   ├── room/[id]/              # 협업 페이지
│   └── api/                     # API routes
├── components/                   # React components
│   ├── Widgets/                 # 위젯 컴포넌트
│   ├── Participants/           # 참여자 관리
│   └── shared/                 # 공용 컴포넌트
├── lib/
│   └── supabase.ts             # Supabase client
├── types/
│   └── index.ts                # TypeScript types
├── docs/
│   └── SUPABASE_DDL.sql        # 데이터베이스 스키마
├── .env.local                   # 환경 변수
├── package.json
└── tsconfig.json
```

## Supabase 설정

### 1. Supabase 프로젝트 생성
- https://supabase.com 접속
- 새 프로젝트 생성
- 프로젝트 URL과 Anon Key 복사

### 2. 데이터베이스 초기화
Supabase 대시보드의 SQL Editor에서 `docs/SUPABASE_DDL.sql` 파일의 쿼리를 실행합니다.

생성되는 테이블:
- **rooms**: 협업 공간
- **participants**: 참여자
- **widgets**: 협업 도구 (체크리스트, 투표, 일정 등)
- **activity_log**: 변경 로그 (실시간 동기화)

### 3. 환경 변수 설정

`.env.local` 파일에 다음을 추가합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 3. 프로덕션 빌드
```bash
npm run build
npm run start
```

## 지원하는 위젯 타입

| 타입 | 설명 | 사용 사례 |
|------|------|---------|
| `checklist` | 체크리스트 | 준비물, 할 일 목록 |
| `expense` | 회비 관리 | 누가 얼마를 냈는지 추적 |
| `vote` | 투표 | 장소/시간 투표 |
| `memo` | 공동 메모 | 자유로운 메모 작성 |
| `schedule` | 일정 조율 | 날짜/시간 관리 |
| `roles` | 역할 분담 | 역할 및 담당자 지정 |
| `poll` | 실시간 투표 | 의견 수렴 |

## 개발 로드맵

### Phase 1 (현재): 프로젝트 초기 설정 ✅
- ✅ Next.js 프로젝트 구조
- ✅ Supabase 설정
- ✅ TypeScript 타입 정의
- ✅ 기본 UI 디자인

### Phase 2: 핵심 기능 (예정)
- [ ] 협업 만들고 초대 링크 생성
- [ ] 참여자 실시간 관리
- [ ] 체크리스트 CRUD

### Phase 3: 위젯 기능 (예정)
- [ ] 회비 관리
- [ ] 투표
- [ ] 일정 조율
- [ ] 역할 분담

### Phase 4: 고도화 (예정)
- [ ] 실시간 커서 추적
- [ ] 댓글 기능
- [ ] 알림 시스템
- [ ] 모바일 앱 (React Native)

