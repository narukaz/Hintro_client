import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Users, Loader2, Plus, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '../components/Notification';

export const Dashboard = ({ socket }) => {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");

    const navigate = useNavigate();
    const userName = localStorage.getItem("userName") || "User";

    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}board/my-boards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Unauthorized");
            const data = await response.json();
            setBoards(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoardTitle.trim()) return;
        setActionLoading(true);
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}board/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newBoardTitle })
            });
            const data = await response.json();
            if (response.ok) navigate(`/board/${data._id}`);
        } catch (error) {
            console.error("Creation failed", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setActionLoading(true);
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}board/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setBoards(prev => prev.filter(b => b._id !== id));
                setShowDeleteModal(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    // const BoardCard = ({ board }) => (
    //     <motion.div
    //         whileHover={{ y: -5 }}
    //         onClick={() => navigate(`/board/${board._id}`)}
    //         className="relative p-6 bg-[#161616]/80 backdrop-blur-sm cursor-pointer border border-white/5 rounded-[1.8rem] h-56 flex flex-col justify-between group overflow-hidden"
    //     >
    //         <div className="flex justify-between items-start">
    //             <div className={`p-2.5 rounded-xl ${!board.isOwner ? 'bg-purple-500/20' : 'bg-white/5'}`}>
    //                 <Users size={18} className={!board.isOwner ? 'text-purple-400' : 'text-gray-400'} />
    //             </div>
    //             {board.isOwner && (
    //                 <button
    //                     onClick={(e) => { e.stopPropagation(); setShowDeleteModal(board._id); }}
    //                     className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all z-10"
    //                 >
    //                     <Trash2 size={16} />
    //                 </button>
    //             )}
    //         </div>
    //         <div>
    //             <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">{board.title}</h3>
    //             {!board.isOwner && (
    //                 <span className="text-[9px] uppercase tracking-widest font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md">
    //                     Collaborator
    //                 </span>
    //             )}
    //         </div>
    //     </motion.div>
    // );
    const BoardCard = ({ board }) => (
        <motion.div
            whileHover={{ y: -5 }}
            onClick={() => navigate(`/board/${board._id}`)}
            className="relative p-6 bg-[#161616]/80 backdrop-blur-sm cursor-pointer border border-white/5 rounded-[1.8rem] h-56 flex flex-col justify-between group overflow-hidden"
        >
            <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl ${!board.isOwner ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                    <Users size={18} className={!board.isOwner ? 'text-purple-400' : 'text-gray-400'} />
                </div>
                {board.isOwner && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteModal(board._id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all z-10"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div>
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight truncate">
                    {board.title}
                </h3>

                <div className="flex items-center gap-2">
                    {!board.isOwner ? (
                        <span className="text-[9px] uppercase tracking-widest font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md">
                            Collaborator
                        </span>
                    ) : (
                        <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-md">
                            Owner
                        </span>
                    )}

                    {/* Visual indicator of team size */}
                    {board.members?.length > 0 && (
                        <span className="text-[9px] text-gray-600 font-bold uppercase">
                            • {board.members.length + 1} Members
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
    return (
        <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
            {/* 1. BACKGROUND GRID LAYER */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-grid-pattern opacity-50" />

            {/* 2. BLURRY ACCENT */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* 3. CONTENT WRAPPER (This keeps everything centered) */}
            <div className="relative z-50 p-12 pt-10 max-w-7xl mx-auto min-h-screen">
                <div className="flex justify-end items-center mb-8 relative z-[100]">
                    <div className="flex items-center gap-4 bg-[#0d0d0d]/50 backdrop-blur-xl p-2 px-4 rounded-full border border-white/5 shadow-2xl">
                        <NotificationCenter socket={socket} />
                        <div className="w-[1px] h-4 bg-white/10" />
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 hidden sm:block">
                                {userName}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center text-[10px] font-black shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                                {userName.charAt(0)}
                            </div>
                        </div>
                    </div>
                </div>
                <header className="mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-bold tracking-tighter"
                    >
                        Welcome back, <span className="text-gray-400">{userName}</span>
                    </motion.h1>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-purple-500" size={40} />
                        <p className="text-gray-500 font-medium tracking-widest text-[10px] uppercase">Loading Workspace...</p>
                    </div>
                ) : (
                    <div className="realtive z-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {boards.map(board => <BoardCard key={board._id} board={board} />)}

                        <motion.div
                            whileHover={{ scale: 0.98 }}
                            onClick={() => setShowCreateModal(true)}
                            className="border-2 border-dashed border-white/5 rounded-[1.8rem] h-56 flex flex-col items-center justify-center text-gray-600 hover:text-white hover:border-white/20 transition-all cursor-pointer group bg-black/20"
                        >
                            <Plus size={32} className="mb-2 group-hover:text-purple-400 transition-colors" />
                            <span className="font-bold uppercase tracking-widest text-[10px]">Create New Board</span>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* MODALS (Kept separate to avoid layout interference) */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full relative">
                            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-3xl font-bold mb-6 tracking-tighter">New Board</h2>
                            <form onSubmit={handleCreateBoard}>
                                <input
                                    autoFocus
                                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-purple-500 transition-all mb-6"
                                    placeholder="Enter board title..."
                                    value={newBoardTitle}
                                    onChange={(e) => setNewBoardTitle(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={20} /> : "Create Board"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1a1a1a] border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full text-center">
                            <AlertCircle className="mx-auto text-red-500 mb-4" size={40} />
                            <h2 className="text-2xl font-bold mb-2">Delete Board?</h2>
                            <p className="text-gray-500 text-sm mb-6">This action is permanent.</p>
                            <div className="flex gap-4">
                                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button
                                    onClick={() => handleDelete(showDeleteModal)}
                                    disabled={actionLoading}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={20} /> : "Delete"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};