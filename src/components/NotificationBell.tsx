import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Mail,
  ExternalLink,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  AuthorNotificationItem,
  subscribeToAuthorNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../lib/notificationService';

interface NotificationBellProps {
  onOpenAuthorModal?: (tab?: string) => void;
  onNavigateToStory?: (storyId: string, chapterNumber?: number) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onOpenAuthorModal,
  onNavigateToStory,
}) => {
  const [notifications, setNotifications] = useState<AuthorNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'comment' | 'letter'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToAuthorNotifications((items, count) => {
      setNotifications(items);
      setUnreadCount(count);
    });
    return unsub;
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredItems = notifications.filter((item) => {
    if (activeFilter === 'comment') return item.type === 'comment';
    if (activeFilter === 'letter') return item.type === 'letter';
    return true;
  });

  const handleItemClick = (item: AuthorNotificationItem) => {
    markNotificationAsRead(item.id);
    setIsOpen(false);

    if (item.type === 'comment') {
      if (onNavigateToStory && item.storyId) {
        onNavigateToStory(item.storyId, item.chapterNumber);
      } else if (onOpenAuthorModal) {
        onOpenAuthorModal('comments');
      }
    } else if (item.type === 'letter') {
      if (onOpenAuthorModal) {
        onOpenAuthorModal('letters');
      }
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="navbar-author-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-pink-100 dark:bg-stone-700 text-pink-700 dark:text-pink-300 shadow-xs'
            : 'text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-stone-800'
        }`}
        title="Thông báo tương tác từ độc giả"
        aria-label="Thông báo tương tác"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-stone-900 animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div
          id="author-notifications-popover"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/98 dark:bg-stone-900/98 backdrop-blur-md border border-pink-200/90 dark:border-stone-700 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[500px]"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-stone-150 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-850/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-pink-150 dark:bg-stone-750 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <span className="font-serif text-xs font-bold text-stone-900 dark:text-stone-100">
                Thông báo Tương tác
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 text-[10px] font-mono font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead()}
                className="text-[11px] text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('comment')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activeFilter === 'comment'
                  ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Bình luận</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('letter')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                activeFilter === 'letter'
                  ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>Tâm thư</span>
            </button>
          </div>

          {/* Scrollable Notifications List */}
          <div className="overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-stone-400 dark:text-stone-500 space-y-1.5">
                <Sparkles className="w-8 h-8 mx-auto text-pink-300 dark:text-pink-700/60 stroke-[1.5]" />
                <p className="text-xs">Chưa có thông báo tương tác mới.</p>
                <p className="text-[10px] text-stone-400">
                  Khi độc giả bình luận hoặc gửi thư, bạn sẽ nhận được thông báo tại đây tức thì!
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors cursor-pointer flex items-start gap-3 relative ${
                    !item.isRead ? 'bg-pink-50/40 dark:bg-pink-950/20' : ''
                  }`}
                >
                  {/* Unread Indicator Dot */}
                  {!item.isRead && (
                    <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 ring-2 ring-pink-200 dark:ring-pink-900" />
                  )}

                  {/* Avatar with Type Icon Badge */}
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-stone-750 text-pink-700 dark:text-pink-300 flex items-center justify-center text-sm shadow-2xs">
                      {item.avatar || (item.type === 'comment' ? '🌸' : '💌')}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[9px]">
                      {item.type === 'comment' ? '💬' : '💌'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-bold text-stone-850 dark:text-stone-100 truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 whitespace-nowrap">
                        {item.timeAgo}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                      {item.subtitle}
                    </div>

                    <div className="text-[11px] text-stone-500 dark:text-stone-400 italic line-clamp-2 pl-2 border-l-2 border-pink-200 dark:border-pink-900 mt-1">
                      "{item.contentSnippet}"
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 self-center shrink-0" />
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="p-2.5 border-t border-stone-150 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-850/90 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenAuthorModal) onOpenAuthorModal('comments');
              }}
              className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Quản lý bình luận</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenAuthorModal) onOpenAuthorModal('letters');
              }}
              className="text-stone-600 dark:text-stone-300 hover:text-pink-600 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Hòm thư Mel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
