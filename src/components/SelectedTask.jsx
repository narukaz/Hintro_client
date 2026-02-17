import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion';
import { ChecklistManager } from './AddTask'
import { CommentSection } from './CommentSection'
import { AlignLeft, Loader2 } from 'lucide-react';
import { ActivityModule } from './Activity_logs';
function SelectedTask({ selectedTask, setSelectedTask, lists, handleUpdateTask, setLists, socket, boardId
}) {
    const isFirstRender = useRef(true);
    const token = localStorage.getItem("token");
    const [assignEmail, setAssignEmail] = useState("");
    const handleAssign = async () => {
        // 1. Validation check
        if (!assignEmail.trim()) {
            alert("Please enter an email");
            return;
        }

        console.log("Attempting to assign:", assignEmail, "to card:", selectedTask._id);

        const token = localStorage.getItem("token");
        try {
            // 2. CHANGE task._id to selectedTask._id
            const res = await fetch(`${import.meta.env.VITE_API_URL}card/${selectedTask._id}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: assignEmail })
            });

            if (res.ok) {
                alert("Assigned successfully!");
                setAssignEmail("");
                // Refresh activities to show the assignment in the history
                fetchActivities();
            } else {
                const data = await res.json();
                alert(data.message || "Assignment failed");
            }
        } catch (err) {
            console.error("Assignment Error:", err);
            alert("Server error. Check console.");
        }
    };

    const [localTitle, setLocalTitle] = useState(selectedTask.title || "");
    const [localDescription, setLocalDescription] = useState(selectedTask.description || "");
    const [isSaving, setIsSaving] = useState(false);
    const [cardActivities, setCardActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(true);

    // 1. Define fetchActivities as a reusable function
    const fetchActivities = async () => {
        if (!token || !selectedTask?._id) return;
        // Note: Don't set loading to true here if we want a "silent" refresh after auto-save
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}card/${selectedTask._id}/activities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCardActivities(data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoadingActivities(false);
        }
    };
    const handleTitleChange = (e) => {
        const input = e.target.value;

        // 1. Convert everything to a single array of words (ignoring existing newlines)
        const allWords = input.replace(/\n/g, " ").split(/\s+/).filter(w => w.length > 0);

        // 2. Limit to 500 words total (The Trim Rule)
        const limitedWords = allWords.slice(0, 500);

        // 3. Reconstruct string with \n every 7 words (The Break Rule)
        let formattedText = "";
        for (let i = 0; i < limitedWords.length; i++) {
            formattedText += limitedWords[i];

            if ((i + 1) % 7 === 0 && i !== limitedWords.length - 1) {
                formattedText += "\n"; // Hard break at 7 words
            } else {
                formattedText += " "; // Normal space
            }
        }

        setLocalTitle(formattedText);
    };
    // 2. Modified Save Logic to trigger refresh
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const titleChanged = localTitle !== selectedTask.title;
        const descChanged = localDescription !== selectedTask.description;

        if (!titleChanged && !descChanged) {
            setIsSaving(false);
            return;
        }

        setIsSaving(true);

        const delayDebounceFn = setTimeout(async () => {
            try {
                await handleUpdateTask(selectedTask._id, {
                    title: localTitle,
                    description: localDescription
                });

                // REFRESH ACTIVITIES AFTER SUCCESSFUL UPDATE
                await fetchActivities();

            } finally {
                setIsSaving(false);
            }
        }, 1000);

        return () => clearTimeout(delayDebounceFn);
    }, [localTitle, localDescription, selectedTask._id]);

    // Initial Load
    useEffect(() => {
        setLoadingActivities(true); // Only show big loader on first load
        fetchActivities();
    }, [selectedTask?._id]);



    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0d0d0d] w-full max-w-6xl h-[85vh] rounded-[32px] border border-white/5 flex overflow-hidden shadow-2xl"
            >
                <div className="flex-[1.5] p-10 overflow-y-auto custom-scrollbar border-r border-white/5 flex flex-col">
                    <div className="flex-1">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                            In List: {lists.find(l => l._id === selectedTask.listId)?.title}
                        </span>

                        <textarea
                            className="bg-transparent text-3xl font-bold w-full outline-none my-4 text-white focus:text-yellow-400 transition-colors resize-none overflow-hidden h-auto"
                            value={localTitle}
                            onChange={handleTitleChange}
                            placeholder="Task Title"
                            // Calculate rows based on newlines to ensure the box grows
                            rows={localTitle.split('\n').length || 1}
                        />

                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                <AlignLeft size={14} /> Description
                            </label>
                            {isSaving && (
                                <span className="flex items-center gap-2 text-[10px] text-yellow-400 font-bold animate-pulse">
                                    <Loader2 size={12} className="animate-spin" /> Saving...
                                </span>
                            )}
                        </div>

                        <textarea
                            className="w-full bg-[#161616] rounded-[24px] p-6 text-sm text-gray-300 outline-none border border-white/5 h-32 resize-none focus:border-yellow-400/20 transition-all"
                            value={localDescription}
                            placeholder="Add a more detailed description..."
                            onChange={(e) => setLocalDescription(e.target.value)}
                        />
                        <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <h4 className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest">Assign Member</h4>
                            <div className="flex gap-2">
                                <input
                                    value={assignEmail}
                                    onChange={(e) => setAssignEmail(e.target.value)}
                                    placeholder="User email..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-yellow-400/50"
                                />
                                <button
                                    onClick={handleAssign}
                                    className="px-4 py-2 cursor-pointer bg-yellow-400 text-black text-[10px] font-black uppercase rounded-xl"
                                >
                                    Assign
                                </button>
                            </div>
                        </div>
                        <ChecklistManager
                            setLists={setLists}
                            task={selectedTask}
                            setTask={setSelectedTask}
                            onChecklistUpdate={fetchActivities}
                        />
                        <div className="mt-12 pt-8 border-t border-white/5">
                            <div className="flex items-center justify-between mb-6">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <AlignLeft size={14} className="text-yellow-400" /> Activity History
                                </label>
                            </div>

                            <ActivityModule
                                activities={cardActivities}
                                isLoading={loadingActivities}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button
                            onClick={() => setSelectedTask(null)}
                            className="px-8 py-3 bg-white/5 text-gray-400 text-[11px] font-black uppercase rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <CommentSection
                    boardId={boardId}
                    socket={socket}
                    task={selectedTask}
                    setLists={setLists}
                    setTask={setSelectedTask}
                    onClose={() => setSelectedTask(null)}
                />
            </motion.div>
        </div>
    )
}

export default SelectedTask;