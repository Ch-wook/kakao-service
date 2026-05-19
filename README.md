# Collab - 카카오톡 메신저 협업 도구

> 카톡방에 링크 하나를 공유하면, 모두가 **로그인 없이** 실시간으로 협업할 수 있는 위젯 보드

[![Vercel](https://img.shields.io/badge/Vercel-배포중-black?logo=vercel)](https://kakao-service.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase)](https://supabase.com)

---

## 프로젝트 소개

카카오톡 채팅방에서 중요한 정보가 대화에 묻혀버리는 문제를 해결합니다.  
방장이 링크를 채팅방에 공유하면, 참여자 전원이 즉시 협업 도구를 사용할 수 있습니다.

**핵심 가치**: 카톡 대화를 스크롤하지 않아도 현재 상황을 한눈에 확인·수정 가능

---

## 주요 기능

### 위젯 탭

| 위젯 | 설명 |
|------|------|
| ✅ 체크리스트 | 항목 추가·수정·삭제·체크, 진행률 바, 담당자 표시 |
| 💰 정산 (N빵) | 총액 입력 → 1인당 자동 계산 → 납부 토글, 납부 현황 요약, 개인별 금액 편집 |
| 👥 멤버 관리 | 그룹별 멤버 추가, 상태 탭으로 출석 현황 실시간 관리, 멤버별 메모(도착시간 등) |
| 💳 납부 체크 | 개인별 등록비·항목 납부 현황 관리, 비고 입력, 수령액 요약 |

> **일괄 입력**: 정산·납부 체크·멤버 관리 위젯 모두 이름 입력란에 쉼표로 여러 명을 한 번에 추가할 수 있습니다.  
> 예) `홍길동,김철수,이영희` → Enter → 3명 동시 추가 (이미 있는 이름은 자동 제외)

**멤버 관리 위젯 상태 사이클**  
`미확인` → `참석` → `도착` → `준비중` → `불참` → `가정` → `미확인`

### 회계 장부 탭 (별도 보호)

방 페이지 상단 탭으로 분리된 전용 회계 장부. 위젯과 달리 삭제 불가, 탭 진입 시 자동 생성.

| 기능 | 설명 |
|------|------|
| 월별 네비게이션 | ← 년/월 → 탭으로 과거·미래 이동, 이번 달 버튼 |
| 수입 / 지출 구분 | 항목별 수입·지출 입력, 이달 수지 요약 |
| 카테고리 태그 | 식비·교통비·숙박비·입장료·쇼핑·기타 + 직접 입력 |
| 날짜별 그룹 | 날짜 소제목 + 당일 소계, 내림차순 정렬 |

### 서비스 기능

| 기능 | 설명 |
|------|------|
| 익명 참여 | 로그인 없이 닉네임만 입력하면 즉시 입장 |
| 실시간 동기화 | 한 명이 수정하면 모두의 화면에 즉시 반영 (WebSocket) |
| 공유 | 버튼 한 번으로 링크 복사, 모바일에서 Web Share API 지원 |
| 모바일 최적화 | iOS 카카오 인앱 브라우저 대응, safe-area, 햅틱 피드백 |
| PWA | 홈 화면 추가 가능 (manifest.json) |
| 관리자 페이지 | `/collab-manage` — 전체 방 목록 조회·삭제, 비밀번호 보호 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Realtime) |
| 인증 | Supabase Anonymous Auth |
| UI | lucide-react, vaul (Bottom Sheet), class-variance-authority |
| 배포 | Vercel (Serverless, 무중단) |

---

## 기술적 구현 포인트

### Optimistic UI
사용자가 버튼을 누르면 서버 응답을 기다리지 않고 **즉시 UI에 반영**합니다.  
서버 업데이트 실패 시 자동 롤백하며, `optimisticUpdates` Set으로 낙관적 업데이트 중인 위젯의 Realtime 이벤트를 무시합니다.

```ts
optimisticUpdates.current.add(widgetId)
setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, data: newData } : w))
// 서버 업데이트 후 finally에서 제거
```

### Supabase Realtime
`postgres_changes` 구독으로 DB 변경사항을 WebSocket으로 실시간 수신합니다.  
충돌 해결은 **LWW(Last Write Wins)** 방식을 적용합니다.

### 회계 장부 보호 전략
ledger 위젯은 일반 위젯 목록에서 제외하고 별도 탭에서만 노출합니다.  
탭 첫 진입 시 자동 생성, 삭제 버튼 없음으로 실수로 데이터가 사라지는 것을 방지합니다.

```ts
const ledgerWidget = widgets.find(w => w.type === 'ledger')
const displayWidgets = widgets.filter(w => w.type !== 'ledger')
```

### 익명 인증
Supabase Anonymous Auth로 로그인 없이 즉시 세션을 생성합니다.  
닉네임은 `localStorage`에 저장하며, 재방문 시 `last_active`만 업데이트해 중복 삽입을 방지합니다.

### 모바일 레이아웃
`h-dvh flex flex-col` 구조로 전체 화면을 고정합니다.  
iOS `env(safe-area-inset-bottom)` 대응 및 카카오 인앱 브라우저 뷰포트 이슈 처리.

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
6. 위젯 탭: 체크리스트 / 정산 / 멤버 관리 / 납부 체크 선택 → 실시간 협업
7. 장부 탭: 월별 수입·지출 기록
```

---

## 프로젝트 구조

```
collab-tool/
├── app/
│   ├── page.tsx                  # 홈 페이지
│   ├── create/page.tsx           # 방 만들기
│   ├── collab-manage/page.tsx    # 관리자 페이지 (비밀번호 보호)
│   ├── room/[id]/page.tsx        # 협업 방 (위젯/장부 탭)
│   └── api/
│       ├── rooms/route.ts        # 방 생성 / 공유코드 조회
│       ├── rooms/[id]/route.ts   # 방 조회 / 참여자 추가
│       ├── widgets/route.ts      # 위젯 목록 / 생성
│       ├── widgets/[id]/route.ts # 위젯 조회 / 수정 / 삭제
│       └── admin/rooms/
│           ├── route.ts          # 전체 방 목록 (관리자)
│           └── [id]/route.ts     # 방 삭제 (관리자)
├── components/
│   ├── Auth/SetNicknameModal.tsx
│   ├── Shared/Button.tsx
│   └── Widgets/
│       ├── ChecklistWidget.tsx
│       ├── ExpenseWidget.tsx     # 정산(N빵) + 납부 현황 요약
│       ├── MemberWidget.tsx      # 멤버 관리 + 멤버별 메모
│       ├── LedgerWidget.tsx      # 회계 장부 (장부 탭 전용)
│       ├── FeeWidget.tsx         # 납부 체크 위젯
│       └── AddWidgetDrawer.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useWidgets.ts             # 위젯 CRUD + Realtime + Optimistic UI
│   └── useRoom.ts
├── lib/
│   ├── supabase.ts
│   ├── supabase-admin.ts
│   ├── utils.ts
│   └── constants.ts
├── public/manifest.json
└── types/index.ts
```

---

## DB 스키마

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  share_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'checklist','expense','member','ledger','fee',
    'vote','memo','schedule','roles','poll'
  )),
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
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 로컬 실행

```bash
cd collab-tool
npm install

# 환경변수 설정
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# ADMIN_PASSWORD=your_admin_password
# MAX_ROOMS=300

npm run dev
# http://localhost:3000
```

---

## 개발 과정

| 단계 | 내용 |
|------|------|
| 1단계 | DB 스키마 설계, Supabase 클라이언트 초기 설정 |
| 2단계 | 익명 로그인(Anonymous Auth), 닉네임 저장, 방 입장 로직 |
| 3단계 | 실시간 위젯 엔진 — Optimistic UI, Realtime 구독 |
| 4단계 | 모바일 최적화, Bottom Sheet(vaul), 공유 기능, 햅틱 피드백 |
| 5단계 | 정산(N빵) 위젯, 전체 버그 수정, API 안정화 |
| 6단계 | 멤버 관리 위젯 — 그룹별 인원·상태 실시간 관리 |
| 7단계 | 관리자 페이지, 에러 바운더리, 방 생성 제한, 보안 강화 |
| 8단계 | 정산 위젯 납부 현황 강화, 회계 장부 탭, 납부 체크 위젯, 멤버 메모 |
| 9단계 | 이름 쉼표 일괄 입력 지원 (정산·납부 체크·멤버 관리) |
| 배포 | Vercel 배포, PWA manifest, Node.js 20.x |
