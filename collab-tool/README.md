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

### 위젯

| 위젯 | 설명 |
|------|------|
| ✅ 체크리스트 | 항목 추가·수정·삭제·체크, 진행률 바, 담당자 표시 |
| 💰 정산 (N빵) | 총액 입력 → 1인당 자동 계산 → 납부 토글 |
| 👥 멤버 관리 | 그룹별 멤버 추가·이름 수정, 상태 탭으로 출석 현황 실시간 관리 |

**멤버 관리 위젯 상태 사이클**  
`미확인` → `참석` → `도착` → `준비중` → `불참` → `가정` → `미확인`

### 서비스 기능

| 기능 | 설명 |
|------|------|
| 익명 참여 | 로그인 없이 닉네임만 입력하면 즉시 입장 |
| 실시간 동기화 | 한 명이 수정하면 모두의 화면에 즉시 반영 (WebSocket) |
| 공유 | 버튼 한 번으로 링크 복사, 모바일에서 Web Share API 지원 |
| 모바일 최적화 | iOS 카카오 인앱 브라우저 대응, safe-area, 햅틱 피드백 |
| PWA | 홈 화면 추가 가능 (manifest.json) |
| 에러 바운더리 | 런타임 오류 시 화이트스크린 대신 안내 화면 표시 |

### 관리자 기능 (`/collab-manage`)

| 기능 | 설명 |
|------|------|
| 비밀번호 인증 | 환경변수 `ADMIN_PASSWORD`로 접근 제한 |
| 방 목록 조회 | 전체 방, 참여자 수, 위젯 수, 마지막 활동일 표시 |
| 방 삭제 | 개별 삭제 및 N일 이상 비활성 방 일괄 삭제 |
| 방 생성 제한 | `MAX_ROOMS` 환경변수로 최대 방 개수 설정 (기본 300) |

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

### 익명 인증
Supabase Anonymous Auth로 로그인 없이 즉시 세션을 생성합니다.  
닉네임은 `localStorage`에 저장하며, 재방문 시 `last_active`만 업데이트해 중복 삽입을 방지합니다.

### Supabase 클라이언트 Lazy 초기화
빌드 시 환경변수 미설정으로 인한 crash를 방지하기 위해 lazy 초기화 패턴을 적용합니다.

```ts
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, key)
}
export const supabase = createSupabaseClient()
```

### 관리자 인증 (서버사이드)
API 라우트에서 `x-admin-password` 헤더와 `ADMIN_PASSWORD` 환경변수를 비교합니다.  
삭제 시 `.select()`로 실제 삭제 여부를 확인해 silent fail을 방지합니다.

### 방 생성 제한
방 생성 API에서 현재 방 개수를 확인 후 `MAX_ROOMS` 초과 시 503 반환합니다.

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
6. 위젯 추가 → 체크리스트 / 정산 / 멤버 관리 선택 → 실시간 협업

[관리자]
7. /collab-manage 접속 → 비밀번호 입력
8. 방 목록 확인 → 오래된 방 일괄 삭제
```

---

## 프로젝트 구조

```
kakao-service/
├── CLAUDE.md                         # AI 보안 규칙
└── collab-tool/
    ├── app/
    │   ├── page.tsx                  # 홈 페이지
    │   ├── error.tsx                 # 전역 에러 바운더리
    │   ├── create/page.tsx           # 방 만들기
    │   ├── collab-manage/page.tsx    # 관리자 페이지
    │   ├── room/[id]/
    │   │   ├── page.tsx              # 협업 방 (위젯 렌더링)
    │   │   └── error.tsx             # 방 에러 바운더리
    │   └── api/
    │       ├── rooms/route.ts        # 방 생성(제한 포함) / 공유코드 조회
    │       ├── rooms/[id]/route.ts   # 방 조회 / 참여자 추가
    │       ├── widgets/route.ts      # 위젯 목록 / 생성
    │       ├── widgets/[id]/route.ts # 위젯 조회 / 수정 / 삭제
    │       └── admin/rooms/
    │           ├── route.ts          # 관리자: 전체 방 조회
    │           └── [id]/route.ts     # 관리자: 방 삭제
    ├── components/
    │   ├── Auth/SetNicknameModal.tsx
    │   ├── Shared/Button.tsx
    │   └── Widgets/
    │       ├── ChecklistWidget.tsx
    │       ├── ExpenseWidget.tsx
    │       ├── MemberWidget.tsx      # 멤버 관리 (이름 인라인 수정 포함)
    │       └── AddWidgetDrawer.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useWidgets.ts             # 위젯 CRUD + Realtime + Optimistic UI
    │   └── useRoom.ts
    ├── lib/
    │   ├── supabase.ts               # Supabase 클라이언트 (lazy 초기화)
    │   ├── supabase-admin.ts         # 관리자용 Service Role 클라이언트
    │   ├── utils.ts
    │   └── constants.ts
    ├── public/manifest.json
    └── types/index.ts
```

---

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 관리자 삭제용 서비스 롤 키 (서버 전용) |
| `ADMIN_PASSWORD` | ✅ | 관리자 페이지 비밀번호 |
| `MAX_ROOMS` | ☑️ | 최대 방 개수 (기본값: 300) |

---

## Supabase 필수 SQL

```sql
-- 1. RLS 정책
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

-- 2. member 위젯 타입 추가
ALTER TABLE widgets DROP CONSTRAINT widgets_type_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_type_check
  CHECK (type IN ('checklist','expense','member','vote','memo','schedule','roles','poll'));

-- 3. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE widgets;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
```

**Authentication → Providers → Anonymous → Enable anonymous sign-ins 활성화 필요**

---

## 로컬 실행

```bash
cd collab-tool
npm install
# .env.local 파일에 환경변수 설정 후
npm run dev   # http://localhost:3000
```

---

## 개발 과정

| 단계 | 내용 |
|------|------|
| 1단계 | DB 스키마 설계, Supabase 클라이언트 초기 설정 |
| 2단계 | 익명 로그인(Anonymous Auth), 닉네임 저장, 방 입장 로직 |
| 3단계 | 실시간 위젯 엔진 — Optimistic UI, Realtime 구독, Lazy 초기화 |
| 4단계 | 모바일 최적화, Bottom Sheet(vaul), 공유 기능, 햅틱 피드백 |
| 5단계 | 정산(N빵) 위젯, 전체 버그 수정, API 안정화 |
| 6단계 | 멤버 관리 위젯 — 그룹별 인원·상태 실시간 관리, 이름 인라인 수정 |
| 7단계 | 관리자 페이지, 에러 바운더리, 방 생성 제한, 보안 강화 |
| 배포 | Vercel 배포, PWA manifest, Node.js 20.x, 환경변수 설정 |
