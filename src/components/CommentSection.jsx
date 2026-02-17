import React, { useState, useEffect, useRef } from 'react'; // 1. Import useRef
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';

export const CommentSection = ({ task, onClose, socket, boardId }) => {
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");

    // 2. Create a ref for the scrollable div
    const scrollContainerRef = useRef(null);
    useEffect(() => {
        if (!socket) return;

        const handleCommentAdded = (data) => {
            const { cardId, newComment, socketId } = data;

            // 1. Safety check: Ignore if I'm the one who sent it
            if (socketId === socket.id) return;

            // 2. Safety check: Only update if the comment belongs to the CURRENTLY OPEN card
            if (cardId !== task._id) return;

            console.log("Real-time comment received for this card!");

            // 3. Update the specific comments array
            setComments(prev => [newComment, ...prev]);

            // If your comments are inside a task object, do this instead:
            // setTask(prev => ({ ...prev, comments: [...prev.comments, newComment] }));
        };

        socket.on("COMMENT_ADDED", handleCommentAdded);

        return () => {
            socket.off("COMMENT_ADDED", handleCommentAdded);
        };
    }, [socket, task._id]); // Re-run if we switch to a different card
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}card/${task._id}/comments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setComments(data);
                }
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (task?._id) fetchComments();
    }, [task._id, token]);
    const handleDeleteComment = async (commentId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}card/comment/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {

                setComments(comments.filter(c => c._id !== commentId));
            } else {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}card/${task._id}/comment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: commentText })
            });

            if (response.ok) {
                const savedComment = await response.json();
                setComments([savedComment, ...comments]);
                setCommentText("");

                // 3. Scroll the container to the top smoothly
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            }
        } catch (error) {
            console.error("Comment failed:", error);
        }
    };

    return (
        <div className="w-[400px] bg-[#080808] flex flex-col h-full border-l border-white/5">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-gray-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Activity & Comments</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full cursor-pointer">
                    <X size={20} className="text-gray-500" />
                </button>
            </div>

            {/* 4. Attach the ref to this div */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth"
            >
                {loading ? (
                    <div className="text-[10px] text-gray-600 text-center animate-pulse">LOADING COMMENTS...</div>
                ) : comments.length > 0 ?

                    comments.map((comment) => {

                        const isAuthor = comment.isMine;

                        return (
                            <div key={comment._id} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-black uppercase">
                                    {comment.userName?.charAt(0) || "U"}
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-200">{comment.userName}</span>
                                            <span className="text-[9px] text-gray-600 font-medium">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {/* Delete Button - Only visible to author on hover */}
                                        {isAuthor && (
                                            <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 text-gray-600 rounded-md transition-all cursor-pointer"
                                                title="Delete comment"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="bg-[#161616] border border-white/5 p-3 rounded-2xl rounded-tl-none text-[13px] text-gray-300 shadow-sm leading-relaxed relative">
                                        {comment.text}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    )
                    : (
                        <div className="text-center py-10">
                            <p className="text-[11px] text-gray-600 italic">No comments yet.</p>
                        </div>
                    )}
            </div>

            <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
                <div className="relative group">
                    <textarea
                        className="w-full bg-[#161616] border border-white/5 rounded-2xl p-4 pr-12 text-[13px] outline-none focus:border-yellow-400/30 transition-all resize-none h-24 text-white placeholder-gray-600"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment();
                            }
                        }}
                    />
                    <button
                        onClick={handleAddComment}
                        disabled={!commentText.trim()}
                        className="absolute bottom-3 right-3 p-2 bg-yellow-400 text-black rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};