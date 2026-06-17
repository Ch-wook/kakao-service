import type { RetreatData } from '@/types'

// 전도6부 하계성회 기본 데이터 (실제 인원)
export const DEFAULT_RETREAT_DATA: RetreatData = {
  eventTitle: '연세가족 하계성회',
  eventSubtitle: '청년아, 성령충만함으로 세상과 구별되라!',
  startDate: '2026-07-27',
  endDate: '2026-07-30',
  location: '흰돌산기도원',
  groupName: '전도6부',
  totalGoal: 50,

  members: [
    // ── 1순 (21명) ──
    { id: 'm1',  name: '최서영', group: 1, registrationStatus: 'none' },
    { id: 'm2',  name: '박강희', group: 1, registrationStatus: 'none' },
    { id: 'm3',  name: '정태영', group: 1, registrationStatus: 'none' },
    { id: 'm4',  name: '김송은', group: 1, registrationStatus: 'none' },
    { id: 'm5',  name: '이동훈', group: 1, registrationStatus: 'none' },
    { id: 'm6',  name: '강지수', group: 1, registrationStatus: 'none' },
    { id: 'm7',  name: '정우성', group: 1, registrationStatus: 'none' },
    { id: 'm8',  name: '홍기원', group: 1, registrationStatus: 'none' },
    { id: 'm9',  name: '윤혜인', group: 1, registrationStatus: 'none' },
    { id: 'm10', name: '김성은', group: 1, registrationStatus: 'none' },
    { id: 'm11', name: '김예나', group: 1, registrationStatus: 'none' },
    { id: 'm12', name: '이성일', group: 1, registrationStatus: 'none' },
    { id: 'm13', name: '김재욱', group: 1, registrationStatus: 'none' },
    { id: 'm14', name: '김재승', group: 1, registrationStatus: 'none' },
    { id: 'm15', name: '고동환', group: 1, registrationStatus: 'none' },
    { id: 'm16', name: '김석현', group: 1, registrationStatus: 'none' },
    { id: 'm17', name: '우정수', group: 1, registrationStatus: 'none' },
    { id: 'm18', name: '최상윤', group: 1, registrationStatus: 'none' },
    { id: 'm19', name: '장빈',   group: 1, registrationStatus: 'none' },
    { id: 'm20', name: '이예진', group: 1, registrationStatus: 'none' },
    { id: 'm21', name: '권유진', group: 1, registrationStatus: 'none' },

    // ── 2순 (16명) ──
    { id: 'm22', name: '김은진', group: 2, registrationStatus: 'none' },
    { id: 'm23', name: '장도연', group: 2, registrationStatus: 'none' },
    { id: 'm24', name: '한재석', group: 2, registrationStatus: 'none' },
    { id: 'm25', name: '박진영', group: 2, registrationStatus: 'none' },
    { id: 'm26', name: '방혁준', group: 2, registrationStatus: 'none' },
    { id: 'm27', name: '안정호', group: 2, registrationStatus: 'none' },
    { id: 'm28', name: '이예영', group: 2, registrationStatus: 'none' },
    { id: 'm29', name: '조혜림', group: 2, registrationStatus: 'none' },
    { id: 'm30', name: '박주연', group: 2, registrationStatus: 'none' },
    { id: 'm31', name: '이고은', group: 2, registrationStatus: 'none' },
    { id: 'm32', name: '엄태규', group: 2, registrationStatus: 'none' },
    { id: 'm33', name: '권나현', group: 2, registrationStatus: 'none' },
    { id: 'm34', name: '유희석', group: 2, registrationStatus: 'none' },
    { id: 'm35', name: '박샘',   group: 2, registrationStatus: 'none' },
    { id: 'm36', name: '박현진', group: 2, registrationStatus: 'none' },
    { id: 'm37', name: '김수빈', group: 2, registrationStatus: 'none' },

    // ── 3순 (7명) ──
    { id: 'm38', name: '장예은', group: 3, registrationStatus: 'none' },
    { id: 'm39', name: '최현욱', group: 3, registrationStatus: 'none' },
    { id: 'm40', name: '양시온', group: 3, registrationStatus: 'none' },
    { id: 'm41', name: '안예연', group: 3, registrationStatus: 'none' },
    { id: 'm42', name: '민지민', group: 3, registrationStatus: 'none' },
    { id: 'm43', name: '노현수', group: 3, registrationStatus: 'none' },
    { id: 'm44', name: '박은총', group: 3, registrationStatus: 'none' },
  ],

  timeSlots: [
    {
      id: 'ts1', label: '월(오후)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m20','m21','m22','m23','m24','m25','m26','m29','m30','m31','m33','m35','m36','m38','m39','m40','m41','m43','m44'],
    },
    {
      id: 'ts2', label: '월(저녁)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28','m29','m30','m31','m32','m33','m34','m35','m36','m38','m39','m40','m41','m42'],
    },
    {
      id: 'ts3', label: '화(오전)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m20','m21','m22','m23','m24','m25','m26','m29','m30','m31','m32','m33','m35','m36','m37','m38','m39','m40','m41','m43','m44'],
    },
    {
      id: 'ts4', label: '화(오후)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m21','m22','m23','m24','m25','m26','m27','m29','m30','m31','m32','m35','m36','m38','m39','m40','m41','m42','m43','m44'],
    },
    {
      id: 'ts5', label: '화(저녁)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28','m29','m30','m31','m32','m33','m34','m35','m36','m37','m38','m39','m40','m41','m42','m43'],
    },
    {
      id: 'ts6', label: '수(오전)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m20','m21','m22','m23','m24','m25','m26','m29','m30','m31','m32','m33','m35','m36','m38','m39','m40','m41','m43','m44'],
    },
    {
      id: 'ts7', label: '수(오후)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m22','m23','m24','m25','m26','m29','m30','m31','m35','m36','m37','m38','m39','m40','m41','m42','m43','m44'],
    },
    {
      id: 'ts8', label: '수(저녁)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28','m29','m30','m31','m32','m33','m35','m36','m38','m39','m40','m41','m42'],
    },
    {
      id: 'ts9', label: '목(오전)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m11','m12','m13','m14','m15','m16','m17','m20','m21','m22','m23','m24','m25','m26','m29','m30','m31','m33','m35','m36','m38','m39','m40','m41','m43','m44'],
    },
    {
      id: 'ts10', label: '목(저녁)',
      attendeeIds: ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12','m13','m14','m15','m16','m17','m18','m19','m20','m21','m22','m23','m24','m25','m26','m27','m28','m29','m30','m31','m32','m33','m34','m35','m36','m38','m39','m40','m41','m42','m43'],
    },
  ],

  visitations: [],
}
