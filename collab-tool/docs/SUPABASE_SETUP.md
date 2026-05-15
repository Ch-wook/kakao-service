# Supabase 설정 가이드

## 1단계: Supabase 계정 및 프로젝트 생성

### 1.1 회원가입
- https://supabase.com 접속
- "Start your project" 클릭
- 이메일 또는 GitHub로 회원가입
- 프로젝트 이름 설정 (예: "collab")
- 비밀번호 설정 (복잡한 비밀번호 권장)
- 데이터 센터 선택 (가장 가까운 지역 선택)

### 1.2 프로젝트 생성 완료
프로젝트 생성 후 다음 정보를 확인할 수 있습니다:
- **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
- **Anon Public Key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## 2단계: 데이터베이스 초기화

### 2.1 SQL 쿼리 실행
1. Supabase 대시보드에 로그인
2. 좌측 메뉴에서 "SQL Editor" 선택
3. "+ New Query" 클릭
4. 아래 SQL DDL을 복사하여 실행

### 2.2 SQL DDL (docs/SUPABASE_DDL.sql)
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms 테이블
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  share_code TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Participants 테이블
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, nickname)
);

-- Widgets 테이블
CREATE TABLE widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checklist', 'expense', 'vote', 'memo', 'schedule', 'roles', 'poll')),
  title TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log 테이블 (실시간 동기화용)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_participants_room_id ON participants(room_id);
CREATE INDEX idx_widgets_room_id ON widgets(room_id);
CREATE INDEX idx_widgets_order ON widgets(room_id, "order");
CREATE INDEX idx_activity_log_room_id ON activity_log(room_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Row Level Security 활성화
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Rooms are viewable by everyone" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Participants are viewable by everyone" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Widgets are viewable by everyone" ON widgets
  FOR SELECT USING (true);

CREATE POLICY "Activity logs are viewable by everyone" ON activity_log
  FOR SELECT USING (true);
```

## 3단계: 환경 변수 설정

`.env.local` 파일 생성 (프로젝트 루트):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 주의사항
- **NEXT_PUBLIC_** 접두사가 있는 변수는 브라우저에 노출됩니다 (민감한 정보 X)
- `.env.local`은 `.gitignore`에 포함되어 있으므로 안전합니다
- 프로덕션 배포 시 Vercel 프로젝트 설정에서 환경 변수를 추가해야 합니다

## 4단계: Realtime 활성화 (선택)

### 4.1 Realtime 설정
1. Supabase 대시보드
2. "Realtime" 탭 선택
3. "Enable" 클릭
4. Supabase 재시작

### 4.2 테이블별 Realtime 활성화
각 테이블에 대해:
1. 테이블명 선택
2. "Replication" 설정에서 "Enable Replication" 체크
3. INSERT, UPDATE, DELETE 권한 설정

## 5단계: RLS (Row Level Security) 정책 수정

현재 설정은 모두 읽기 가능하도록 되어 있습니다.
프로덕션에서는 더 엄격한 정책이 필요합니다:

### 5.1 INSERT/UPDATE 정책 추가 (선택)
```sql
-- 인증된 사용자만 참여자 생성 가능
CREATE POLICY "Authenticated users can insert participants" ON participants
  FOR INSERT 
  WITH CHECK (true);

-- 인증된 사용자만 위젯 생성 가능
CREATE POLICY "Authenticated users can insert widgets" ON widgets
  FOR INSERT 
  WITH CHECK (true);
```

## 6단계: 연결 테스트

### 6.1 개발 환경 테스트
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속하여 페이지가 로드되는지 확인합니다.

### 6.2 Supabase 연결 확인
브라우저 개발자 도구 > Console에서:
```javascript
import { supabase } from '@/lib/supabase'
const { data, error } = await supabase.from('rooms').select('count()')
console.log(data, error)
```

## 7단계: Vercel 배포 (선택)

### 7.1 GitHub 연동
1. 프로젝트를 GitHub으로 푸시
2. Vercel 대시보드에서 New Project 클릭
3. GitHub 저장소 선택
4. Import

### 7.2 환경 변수 설정
Vercel Project Settings > Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL` = (Supabase URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase Anon Key)

### 7.3 배포
자동 배포 또는 수동 배포 (git push 시 자동 배포)

## 문제 해결

### CORS 에러
Supabase 프로젝트 설정 > API > CORS Settings에서 localhost:3000 추가

### 환경 변수 인식 안 됨
1. 개발 서버 재시작: `npm run dev`
2. 브라우저 캐시 삭제
3. `.env.local` 파일 확인

### Realtime 작동 안 함
1. Realtime 설정 확인
2. WebSocket 연결 상태 확인 (Network 탭)
3. Supabase 대시보드 Status 페이지 확인

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase + Next.js 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Realtime 설명서](https://supabase.com/docs/guides/realtime)
- [RLS 정책 가이드](https://supabase.com/docs/guides/auth/row-level-security)
