import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, Loader2, Inbox, Send, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationCenter = ({ socket }) => {
    const [notifications, setNotifications] = useState([]);
    const [activity, setActivity] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('inbox');

    const fetchNotifications = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch('${import.meta.env.VITE_API_URL}/notifications/my-invites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setNotifications(data);
        } catch (err) {
            console.error("Error fetching invites:", err);
        }
    }, []);

    const fetchActivity = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/notifications/sent-updates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setActivity(data);
        } catch (err) {
            console.error("Error fetching activity:", err);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        fetchActivity();
    }, [fetchNotifications, fetchActivity]);

    useEffect(() => {
        if (!socket) return;
        const handleSync = () => {
            fetchNotifications();
            fetchActivity();
        };
        socket.on("SYNC_NOTIFICATIONS", handleSync);
        return () => socket.off("SYNC_NOTIFICATIONS", handleSync);
    }, [socket, fetchNotifications, fetchActivity]);

    const handleAction = async (notifId, action) => {
        setLoading(notifId);
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/notifications/${notifId}/${action}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n._id !== notifId));
                if (action === 'accept') window.location.reload();
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-white/5 rounded-full transition-all active:scale-95"
            >
                <Bell size={20} className={notifications.length > 0 ? "text-yellow-400" : "text-gray-400"} />
                {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#050505] animate-pulse" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-80 bg-[#111] border border-white/10 rounded-[2rem] shadow-2xl z-[100] overflow-hidden"
                    >
                        {/* TAB SWITCHER */}
                        <div className="flex p-2 bg-black/40 border-b border-white/5">
                            <button
                                onClick={() => setActiveTab('inbox')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inbox' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Inbox size={12} /> Inbox {notifications.length > 0 && `(${notifications.length})`}
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sent' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                            >
                                <Send size={12} /> Sent
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar min-h-[200px]">
                            {activeTab === 'inbox' ? (
                                notifications.length === 0 ? (
                                    <div className="p-12 text-center text-gray-600 text-[10px] font-bold uppercase tracking-tighter">No pending items</div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif._id} className="p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <p className="text-[11px] text-gray-300 leading-relaxed">
                                                <span className="text-white font-bold">{notif.senderId?.name}</span> {notif.message}
                                            </p>

                                            {/* PASSIVE ASSIGNMENT (No Buttons) vs INTERACTIVE INVITE (Buttons) */}
                                            {notif.type === 'TASK_ASSIGNED' ? (
                                                <div className="mt-2 flex items-center gap-2 text-[9px] text-yellow-400 font-black uppercase">
                                                    <UserPlus size={10} /> New Assignment
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 mt-4">
                                                    <button
                                                        disabled={loading === notif._id}
                                                        onClick={() => handleAction(notif._id, 'accept')}
                                                        className="flex-1 py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg disabled:opacity-50"
                                                    >
                                                        {loading === notif._id ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Accept"}
                                                    </button>
                                                    <button
                                                        disabled={loading === notif._id}
                                                        onClick={() => handleAction(notif._id, 'decline')}
                                                        className="flex-1 py-2 bg-white/5 text-gray-500 text-[10px] font-black uppercase rounded-lg"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )
                            ) : (
                                /* SENT UPDATES (Includes your assignments to others) */
                                activity.length === 0 ? (
                                    <div className="p-12 text-center text-gray-600 text-[10px] font-bold uppercase tracking-tighter">No recent activity</div>
                                ) : (
                                    activity.map(item => (
                                        <div key={item._id} className="p-5 border-b border-white/5 bg-white/[0.01]">
                                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                                <span className="text-white font-bold">{item.recipientId?.name || 'User'}</span>
                                                {item.type === 'TASK_ASSIGNED' ? (
                                                    <> was <span className="text-yellow-400 font-bold mx-1">assigned</span> to a task</>
                                                ) : (
                                                    <>
                                                        {item.status === 'accepted' ? (
                                                            <span className="text-green-400 font-bold mx-1">accepted</span>
                                                        ) : (
                                                            <span className="text-red-400 font-bold mx-1">declined</span>
                                                        )}
                                                        your invite
                                                    </>
                                                )}
                                                {item.boardId?.title && (
                                                    <> in <span className="text-gray-300 italic">"{item.boardId.title}"</span></>
                                                )}
                                            </p>
                                            <p className="text-[9px] text-gray-600 mt-2 uppercase font-medium">
                                                {new Date(item.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};