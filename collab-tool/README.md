# Collab - 카카오톡 메신저 협업 도구

> 카톡방에 링크 하나를 공유하면, 모두가 **로그인 없이** 실시간으로 협업할 수 있는 위젯 보드

[![Vercel](https://img.shields.io/badge/Vercel-배포중-black?logo=vercel)](https://kakao-service.vercel.app)

---

## 프로젝트 소개

카카오톡 채팅방에서 중요한 정보가 대화에 묻혀버리는 문제를 해결합니다.  
방장이 링크를 채팅방에 공유하면, 참여자 전원이 즉시 체크리스트·정산 등 협업 도구를 사용할 수 있습니다.

**핵심 가치**: 카톡 대화를 스크롤하지 않아도 현재 상황을 한눈에 확인·수정 가능

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 익명 참여 | 로그인 없이 닉네임만 입력하면 즉시 입장 |
| 실시간 동기화 | 한 명이 수정하면 모두의 화면에 즉시 반영 |
| 체크리스트 위젯 | 항목 추가·수정·삭제·체크, 진행률 바, 담당자 표시 |
| 정산(N빵) 위젯 | 총액 입력 → 1인당 자동 계산 → 납부 토글 |
| 공유 기능 | 버튼 클릭 한 번으로 링크 복사 (Web Share API 지원) |
| 모바일 최적화 | iOS 카카오 인앱 브라우저 대응, safe-area, 햅틱 피드백 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Realtime) |
| 인증 | Supabase Anonymous Auth |
| UI | lucide-react, vaul (Bottom Sheet), class-variance-authority |
| 배포 | Vercel |

---

## 기술적 구현 포인트

### Optimistic UI
사용자가 체크박스를 누르면 서버 응답을 기다리지 않고 **즉시 UI에 반영**합니다.  
서버 업데이트 실패 시 자동으로 롤백하며, `optimisticUpdates` Set으로 낙관적 업데이트 중인 위젯의 Realtime 이벤트를 무시합니다.

### Supabase Realtime
`postgres_changes` 구독으로 DB 변경사항을 WebSocket으로 실시간 수신합니다.  
충돌 해결은 **LWW(Last Write Wins)** 방식을 적용합니다.

### 익명 인증
Supabase Anonymous Auth로 로그인 없이 즉시 세션을 생성합니다.  
닉네임은 `localStorage`에 저장하며, 재방문 시 `last_active`만 업데이트해 중복 삽입을 방지합니다.

### 모바일 레이아웃
`h-dvh flex flex-col` 구조로 전체 화면을 고정합니다.  
iOS `env(safe-area-inset-bottom)`을 대응하고, 카카오 인앱 브라우저의 뷰포트 이슈를 처리합니다.

---

## 서비스 흐름

```
[방장]
1. 앱 접속 → "새 협업 만들기" → 제목 입력 → 생성
2. 방 페이지에서 "공유" → 링크가 클립보드에 복사됨
3. 링크를 카톡방에 붙여넣기

[참여자]
4. 카톡방에서 링크 탭
5. 닉네임 입력 → 입장 완료
6. 위젯 추가 → 체크리스트 / 정산 선택 → 실시간 협업
```

---

## 프로젝트 구조

```
collab-tool/
├── app/
│   ├── page.tsx              # 홈 페이지
│   ├── create/page.tsx       # 방 만들기
│   ├── room/[id]/page.tsx    # 협업 방 (위젯 렌더링)
│   └── api/                  # REST API routes
│       ├── rooms/
│       └── widgets/
├── components/
│   ├── Auth/                 # 닉네임 모달
│   ├── Shared/               # 공용 버튼
│   └── Widgets/              # 체크리스트, 정산, Bottom Sheet
├── hooks/
│   ├── useAuth.ts            # 익명 로그인, 닉네임 관리
│   ├── useWidgets.ts         # 위젯 CRUD + Realtime + Optimistic UI
│   └── useRoom.ts            # 방/위젯/참여자 조회
├── lib/
│   ├── supabase.ts           # Supabase 클라이언트
│   ├── utils.ts              # 유틸리티 함수
│   └── constants.ts          # 상수
└── types/index.ts            # TypeScript 타입 정의
```

---

## 로컬 실행

```bash
# 1. 의존성 설치
cd collab-tool
npm install

# 2. 환경변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 3. 개발 서버 실행
npm run dev
# http://localhost:3000
```

---

## 개발 과정

| 단계 | 내용 |
|------|------|
| 1단계 | DB 스키마 설계, Supabase 클라이언트 초기 설정 |
| 2단계 | 익명 로그인, 닉네임 저장, 방 입장 로직 |
| 3단계 | 실시간 위젯 엔진 (Optimistic UI, Realtime 구독) |
| 4단계 | 모바일 최적화, Bottom Sheet, 공유 기능, 햅틱 |
| 5단계 | 정산(N빵) 위젯 추가 및 전체 버그 수정 |
| 배포 | Vercel 배포 (Root Directory, 환경변수, Node.js 버전 설정) |
