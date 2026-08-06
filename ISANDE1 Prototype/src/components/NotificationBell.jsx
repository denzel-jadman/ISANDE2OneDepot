import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

function relativeTime(value) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  async function loadNotifications() {
    if (!user) return;
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  }

  useEffect(() => {
    loadNotifications();
    const refresh = () => loadNotifications();
    window.addEventListener("onedepot:data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("onedepot:data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [user?.id]);

  useEffect(() => {
    function closeOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  async function openNotification(notification) {
    if (!notification.isRead) await api.patch(`/notifications/${notification.id}/read`, {});
    setOpen(false);
    navigate(notification.link || "/");
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all", {});
  }

  if (!user) return null;
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setOpen((visible) => !visible)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className="relative w-10 h-10 flex items-center justify-center rounded-card bg-panel hover:bg-panel/70 hover:text-amber transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber text-gunmetal text-[10px] font-bold flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] bg-panel border border-gray-700 rounded-card shadow-2xl z-[100] overflow-hidden text-sm font-normal">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div><p className="font-heading text-lg text-white">Notifications</p><p className="text-[11px] text-gray-500">{unreadCount} unread</p></div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs text-amber font-semibold hover:text-amber/70">Mark all read</button>}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length ? notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`w-full text-left px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gunmetal transition-colors ${notification.isRead ? "opacity-65" : "bg-amber/5"}`}>
                <div className="flex gap-3">
                  <span className={`mt-1 w-2 h-2 shrink-0 rounded-full ${notification.isRead ? "bg-gray-600" : "bg-amber"}`} />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-white">{notification.title}</span><span className="block text-xs text-gray-400 mt-1 leading-relaxed">{notification.message}</span><span className="block text-[10px] text-gray-500 mt-2">{relativeTime(notification.createdAt)}</span></span>
                </div>
              </button>
            )) : <div className="px-5 py-8 text-center"><p className="font-heading text-lg text-gray-300">You&apos;re all caught up</p><p className="text-xs text-gray-500 mt-1">New alerts will appear here.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
