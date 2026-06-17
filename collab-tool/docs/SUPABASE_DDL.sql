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
  type TEXT NOT NULL CHECK (type IN ('checklist', 'expense', 'vote', 'memo', 'schedule', 'roles', 'poll', 'member', 'ledger', 'fee', 'tab-config', 'notice', 'image-gallery', 'music-player', 'file-board', 'study-plan', 'retreat')),
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
-- rooms: 모두 읽기 가능, 로그인 사용자만 쓰기 가능
CREATE POLICY "Rooms are viewable by everyone" ON rooms
  FOR SELECT USING (true);

-- participants: room 내 모두 읽기 가능
CREATE POLICY "Participants are viewable by everyone" ON participants
  FOR SELECT USING (true);

-- widgets: room 내 모두 읽기 가능
CREATE POLICY "Widgets are viewable by everyone" ON widgets
  FOR SELECT USING (true);

-- activity_log: room 내 모두 읽기 가능
CREATE POLICY "Activity logs are viewable by everyone" ON activity_log
  FOR SELECT USING (true);
