import {
  subscribeToAllComments,
  subscribeToReaderLetters,
  RealtimeComment,
  ReaderLetter,
  getStoredStories,
} from './realtimeService';

export interface AuthorNotificationItem {
  id: string;
  type: 'comment' | 'letter';
  title: string;
  subtitle: string;
  contentSnippet: string;
  timeAgo: string;
  createdAt: string;
  avatar: string;
  isRead: boolean;
  storyId?: string;
  storyTitle?: string;
  chapterNumber?: number;
  user?: string;
  rawComment?: RealtimeComment;
  rawLetter?: ReaderLetter;
}

const READ_IDS_STORAGE_KEY = 'mel_author_read_notifications';
const LAST_READ_TIME_STORAGE_KEY = 'mel_author_last_read_notifications_at';

const getReadIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

const saveReadIds = (ids: Set<string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(READ_IDS_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(0, 500)));
  } catch {}
};

const formatNotificationTime = (timeStr?: string): string => {
  if (!timeStr) return 'Vừa xong';
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0 || diffMs < 60 * 1000) return 'Vừa xong';
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

type NotificationSubscriber = (items: AuthorNotificationItem[], unreadCount: number) => void;
const subscribers = new Set<NotificationSubscriber>();

let currentComments: RealtimeComment[] = [];
let currentLetters: ReaderLetter[] = [];
let isListening = false;
let unsubComments: (() => void) | null = null;
let unsubLetters: (() => void) | null = null;

const buildNotificationsList = (): { items: AuthorNotificationItem[]; unreadCount: number } => {
  const readIds = getReadIds();
  const stories = getStoredStories();
  const storyMap = new Map(stories.map((s) => [s.id, s.title]));

  const items: AuthorNotificationItem[] = [];

  // 1. Process Comments (excluding author's own comments)
  currentComments.forEach((c) => {
    if (c.isAuthor) return; // Don't notify author about their own comment
    const storyTitle = storyMap.get(c.storyId) || c.storyId;
    const chLabel = c.chapterNumber ? `Chương ${c.chapterNumber}` : 'Truyện';
    const isRead = readIds.has(c.id);

    items.push({
      id: c.id,
      type: 'comment',
      title: c.user || 'Độc giả yêu truyện',
      subtitle: `đã bình luận ở ${chLabel} · ${storyTitle}`,
      contentSnippet: c.text ? c.text.substring(0, 100) : 'Bình luận mới',
      timeAgo: formatNotificationTime(c.createdAt),
      createdAt: c.createdAt || new Date().toISOString(),
      avatar: c.avatar || '🌸',
      isRead,
      storyId: c.storyId,
      storyTitle,
      chapterNumber: c.chapterNumber,
      user: c.user,
      rawComment: c,
    });
  });

  // 2. Process Reader Letters (public & private)
  currentLetters.forEach((l) => {
    const isRead = readIds.has(l.id);
    const typeLabel = l.type === 'private' ? 'thư kín (riêng tư)' : 'tâm tình công khai';

    items.push({
      id: l.id,
      type: 'letter',
      title: l.sender || 'Bạn đọc giấu tên',
      subtitle: `đã gửi một ${typeLabel}`,
      contentSnippet: l.content ? l.content.substring(0, 100) : 'Lá thư mới',
      timeAgo: formatNotificationTime(l.createdAt),
      createdAt: l.createdAt || new Date().toISOString(),
      avatar: l.avatar || '💌',
      isRead,
      user: l.sender,
      rawLetter: l,
    });
  });

  // Sort descending by creation date
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = items.filter((item) => !item.isRead).length;
  return { items, unreadCount };
};

const notifySubscribers = () => {
  const { items, unreadCount } = buildNotificationsList();
  subscribers.forEach((cb) => {
    try {
      cb(items, unreadCount);
    } catch (e) {
      console.error('Notification subscriber error:', e);
    }
  });
};

const ensureListening = () => {
  if (isListening || typeof window === 'undefined') return;
  isListening = true;

  unsubComments = subscribeToAllComments((comments) => {
    currentComments = comments;
    notifySubscribers();
  });

  unsubLetters = subscribeToReaderLetters((letters) => {
    currentLetters = letters;
    notifySubscribers();
  });
};

/**
 * Subscribe to realtime author notifications (comments + reader letters)
 */
export const subscribeToAuthorNotifications = (subscriber: NotificationSubscriber): (() => void) => {
  ensureListening();
  subscribers.add(subscriber);

  // Initial emit
  const { items, unreadCount } = buildNotificationsList();
  subscriber(items, unreadCount);

  return () => {
    subscribers.delete(subscriber);
  };
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = (id: string) => {
  const readIds = getReadIds();
  readIds.add(id);
  saveReadIds(readIds);
  notifySubscribers();
};

/**
 * Mark all current notifications as read
 */
export const markAllNotificationsAsRead = () => {
  const readIds = getReadIds();
  currentComments.forEach((c) => readIds.add(c.id));
  currentLetters.forEach((l) => readIds.add(l.id));
  saveReadIds(readIds);
  try {
    localStorage.setItem(LAST_READ_TIME_STORAGE_KEY, new Date().toISOString());
  } catch {}
  notifySubscribers();
};
