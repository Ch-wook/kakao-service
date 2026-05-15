# Supabase Anonymous Auth 설정 가이드

## Anonymous Auth란?

Anonymous Auth는 사용자가 이메일/비밀번호로 로그인하지 않고도 임시 인증 세션을 만들 수 있는 기능입니다.

**장점:**
- 로그인 없이 앱 사용 가능
- 로그인 수고 제거
- 익명 사용자도 데이터베이스에 접근 가능
- RLS 정책으로 데이터 보호 가능

**사용 사례:**
- Collab의 방 입장 (로그인 없이 링크만 눌러 참여)
- 설문조사 참여
- 임시 협업 도구
- 게스트 사용자

---

## 1단계: Supabase에서 Anonymous Auth 활성화

### 1.1 인증 설정 페이지 접속
1. Supabase 대시보드 로그인
2. 프로젝트 선택
3. 좌측 메뉴: **Authentication** → **Providers**

### 1.2 Anonymous 활성화
1. "Anonymous" 찾기
2. **Enable** 토글 켜기
3. **Save** 클릭

![Anonymous Auth Enable](./images/anonymous-auth-enable.png)

### 1.3 설정 확인
- Authentication 페이지 → Users 탭
- 사용자들의 email이 "NULL"이면 익명 사용자

---

## 2단계: 코드에서 사용하기

### 2.1 익명 로그인 (useAuth 훅에서 자동 처리)

```typescript
import { supabase } from '@/lib/supabase'

// 익명 로그인
const { data, error } = await supabase.auth.signInAnonymously()

if (!error) {
  console.log('익명 로그인 성공:', data.session?.user.id)
}
```

### 2.2 현재 세션 확인

```typescript
const { data: session, error } = await supabase.auth.getSession()

if (session?.user) {
  console.log('현재 사용자 ID:', session.user.id)
}
```

### 2.3 로그아웃

```typescript
await supabase.auth.signOut()
```

### 2.4 useAuth 훅 사용

```typescript
import { useAuth } from '@/hooks/useAuth'

export default function MyComponent() {
  const { session, isLoading, setNickname } = useAuth()

  if (isLoading) return <div>로딩...</div>

  return (
    <div>
      <p>사용자 ID: {session.user?.id}</p>
      <p>닉네임: {session.nickname}</p>
      <button onClick={() => setNickname('준호')}>
        닉네임 설정
      </button>
    </div>
  )
}
```

---

## 3단계: 닉네임 저장 전략

### localStorage 활용 (현재 구현)

```typescript
const NICKNAME_STORAGE_KEY = 'collab_nickname'

// 저장
localStorage.setItem(NICKNAME_STORAGE_KEY, 'John')

// 불러오기
const nickname = localStorage.getItem(NICKNAME_STORAGE_KEY)
```

**장점:**
- 빠른 조회
- 서버 요청 불필요
- 오프라인 작동

**단점:**
- 다른 기기에서 동기화 안 됨
- 브라우저 캐시 삭제 시 손실

### 대안: Supabase에 저장 (향후 개선)

```typescript
// profiles 테이블 추가
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname TEXT,
  updated_at TIMESTAMP
)

// 저장
await supabase
  .from('profiles')
  .upsert({ user_id, nickname })
```

---

## 4단계: RLS 정책 설정

익명 사용자도 데이터에 접근하되, RLS로 보호해야 합니다.

### 4.1 참여자 테이블 정책

```sql
-- 모든 사용자가 읽을 수 있음
CREATE POLICY "Participants are viewable by everyone" ON participants
  FOR SELECT USING (true);

-- 인증된 사용자만 삽입 가능
CREATE POLICY "Authenticated users can insert participants" ON participants
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- 자신의 정보만 업데이트 가능 (향후)
CREATE POLICY "Users can update their own participants" ON participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 4.2 방 테이블 정책

```sql
-- 모든 사용자가 읽을 수 있음
CREATE POLICY "Rooms are viewable by everyone" ON rooms
  FOR SELECT USING (true);
```

---

## 5단계: 테스트

### 5.1 개발 환경에서 테스트

```bash
npm run dev
```

1. http://localhost:3000 접속
2. "새 협업 만들기" 클릭 (3단계에서 구현)
3. 링크 복사 후 새 탭에서 접속
4. 닉네임 입력 후 "입장하기" 클릭
5. 참여자 목록에 표시되는지 확인

### 5.2 Supabase 대시보드 확인

1. Authentication → Users
   - 익명 사용자 목록 확인
2. SQL Editor
   - participants 테이블에서 사용자 확인

```sql
SELECT * FROM participants;
```

---

## 6단계: 보안 체크리스트

- [ ] Anonymous Auth 활성화
- [ ] RLS 정책 설정
- [ ] localStorage 사용 (또는 프로필 테이블)
- [ ] 닉네임 검증 (서버)
- [ ] API 요청 검증
- [ ] CORS 설정 확인

---

## 주의사항

### 보안
1. **클라이언트 검증만으로는 부족**
   - 서버에서도 닉네임 길이, 형식 검증
   - SQL injection 방지 (Supabase 클라이언트 자동 처리)

2. **민감한 데이터는 RLS로 보호**
   - 누가 접근할 수 있는지 명시
   - 테스트 필수

3. **Anonymous 사용자 정리**
   - 자동 정리 정책 설정 (선택)
   - Supabase Dashboard: Auth → Policies → Auto-update

### 성능
1. **Realtime 구독 주의**
   - 모든 변경사항 브로드캐스트하면 비용 증가
   - 필요한 것만 구독

2. **쿼리 최적화**
   - 필요한 컬럼만 select
   - 인덱스 활용

---

## 문제 해결

### Anonymous 로그인이 안 됨
```
Error: Anonymous sign-ins are not enabled
```
**해결:**
1. Supabase Dashboard → Authentication → Providers
2. Anonymous 토글 확인
3. 설정 저장 후 5분 대기

### 닉네임이 저장 안 됨
**확인 사항:**
1. localStorage 활성화 확인
   ```javascript
   // 브라우저 콘솔
   localStorage.setItem('test', 'value')
   localStorage.getItem('test') // 'value' 반환
   ```

2. Private/Incognito 모드에서는 localStorage 미작동
   - 일반 브라우징 모드 사용

### 404 오류 (방을 찾을 수 없음)
**확인 사항:**
1. 방 ID가 올바른지 확인
   - UUID 형식: `123e4567-e89b-12d3-a456-426614174000`
2. 해당 방이 생성되었는지 확인
   ```sql
   SELECT * FROM rooms WHERE id = 'room-id';
   ```

### 닉네임 중복 오류
**해결:**
- 중복 오류 메시지: "이미 사용 중인 닉네임입니다"
- 다른 닉네임으로 입장
- RLS 정책에서 UNIQUE 제약 확인

---

## 다음 단계

1. **3단계: 방 만들기 및 초대 링크**
   - 방 생성 페이지
   - 공유 코드 생성
   - 초대 링크 복사

2. **4단계: 위젯 시스템**
   - 체크리스트
   - 투표
   - 일정 조율

---

## 참고 자료

- [Supabase Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous)
- [RLS 정책](https://supabase.com/docs/guides/auth/row-level-security)
- [Authentication](https://supabase.com/docs/guides/auth)
