import React, { useState } from 'react';
import { UserPlus, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CollaboratorSection = ({ boardId, collaborators = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null); // Track the error message

    const handleSendInvite = async () => {
        if (!email) return;
        setIsSending(true);
        setError(null); // Clear previous errors

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}board/${boardId}/invite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.toLowerCase() })
            });

            const data = await res.json();

            if (!res.ok) {
                // Set the error from the backend (e.g., "User not found")
                throw new Error(data.message || "Something went wrong");
            }

            // Success: Close and clear
            setIsModalOpen(false);
            setEmail("");
        } catch (err) {
            setError(err.message);
            // Automatically clear error after 4 seconds
            setTimeout(() => setError(null), 4000);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="relative flex items-center gap-3 flex-shrink-0">
            {/* Avatars Stack */}
            <div className="flex -space-x-2 mr-2">
                {collaborators.slice(0, 3).map((collab, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-purple-600 border-2 border-[#0d0d0d] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {collab.userId?.name?.charAt(0) || 'U'}
                    </div>
                ))}
            </div>

            <button
                onClick={() => {
                    setIsModalOpen(!isModalOpen);
                    setError(null); // Clear error when opening/closing
                }}
                className={`p-2 rounded-full border transition-all ${isModalOpen ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
            >
                <UserPlus size={16} className={isModalOpen ? 'text-purple-400' : 'text-gray-400'} />
            </button>

            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <div className="fixed inset-0 z-[499]" onClick={() => setIsModalOpen(false)} />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-4 w-80 bg-[#111] border border-white/10 p-8 rounded-[2rem] shadow-2xl z-[500]"
                        >
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Add Member</h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6">Invite via email</p>

                            {/* ERROR DISPLAY AREA */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-4 overflow-hidden"
                                    >
                                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                                            <AlertCircle size={14} className="text-red-500 shrink-0" />
                                            <span className="text-red-500 text-[10px] font-bold uppercase leading-tight">
                                                {error}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <input
                                autoFocus
                                className={`w-full bg-black border rounded-2xl px-5 py-4 text-sm text-white outline-none transition-all mb-4 ${error ? 'border-red-500/50' : 'border-white/10 focus:border-purple-500'
                                    }`}
                                placeholder="name@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                            />

                            <button
                                onClick={handleSendInvite}
                                disabled={isSending}
                                className="w-full py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={14} /> : "Send Invitation"}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};