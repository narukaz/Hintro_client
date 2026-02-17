import React, { useState, useEffect, useRef } from 'react';
import { ListChecks, X, Plus, Loader2, AlignLeft } from 'lucide-react';
import {
    ChevronLeft, MoreHorizontal,
    Trash2, Search as SearchIcon, Bell
} from 'lucide-react';

export const ChecklistManager = ({ task, setTask, setLists, onChecklistUpdate }) => {
    const token = localStorage.getItem("token");
    const [localChecklists, setLocalChecklists] = useState(task.checklists || []);
    const [isAdding, setIsAdding] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const isFirstRender = useRef(true);

    // Sync local state when the selected task changes
    useEffect(() => {
        setLocalChecklists(task.checklists || []);
    }, [task.checklists]);

    // DEBOUNCE EFFECT: Only triggers for title changes to prevent API spam
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            const hasChanged = JSON.stringify(localChecklists) !== JSON.stringify(task.checklists);
            if (hasChanged) {
                updateBackend(localChecklists);
            }
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [localChecklists]);

    const updateBackend = async (updatedList) => {
        setIsSaving(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}card/update/${task._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ checklists: updatedList, checklist: true })
            });

            const data = await response.json();

            // Update local state and lists
            setLists(prevLists => prevLists.map(list => ({
                ...list,
                tasks: list.tasks.map(t =>
                    t._id === task._id ? { ...t, checklists: data.checklists } : t
                )
            })));
            setTask(data);

            // --- NEW: TRIGGER ACTIVITY REFRESH ---
            if (onChecklistUpdate) {
                await onChecklistUpdate();
            }
        } catch (error) {
            console.error("Checklist sync failed:", error);
        } finally {
            setIsSaving(false);
        }
    };
    const handleToggle = (idx) => {
        const updated = [...localChecklists];
        updated[idx].isCompleted = !updated[idx].isCompleted;
        setLocalChecklists(updated);
        updateBackend(updated); // Sync immediately on toggle
    };

    const handleTextChange = (idx, value) => {
        const updated = [...localChecklists];
        updated[idx].title = value;
        setLocalChecklists(updated);
    };

    const handleAddNewItem = () => {
        if (!newItemTitle.trim()) {
            setIsAdding(false);
            return;
        }
        const newItem = { title: newItemTitle, isCompleted: false };
        const updated = [...localChecklists, newItem];
        setLocalChecklists(updated);
        updateBackend(updated);
        setNewItemTitle("");
        setIsAdding(false);
    };

    const handleDelete = (idx) => {
        const updated = localChecklists.filter((_, i) => i !== idx);
        setLocalChecklists(updated);
        updateBackend(updated);
    };

    return (
        <div className="mt-8 space-y-4">
            {/* Header with Save Indicator */}
            <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ListChecks size={14} className="text-yellow-400" /> Tasks
                </label>
                {isSaving && <Loader2 size={12} className="text-yellow-400 animate-spin" />}
            </div>

            {/* Checklist Items Rendering */}
            <div className="space-y-3">
                {localChecklists.map((item, idx) => (
                    <div key={item._id || idx} className="group flex flex-col gap-1 p-4 bg-[#0d0d0d] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    className="w-5 h-5 rounded-lg accent-yellow-400 bg-transparent border-white/20 cursor-pointer flex-shrink-0 mt-1"
                                    onChange={() => handleToggle(idx)}
                                />
                                <textarea
                                    rows={1}
                                    className={`w-full bg-transparent outline-none text-[13px] leading-relaxed resize-none transition-all py-1 ${item.isCompleted ? 'text-gray-600 line-through' : 'text-gray-300'
                                        }`}
                                    value={item.title}
                                    onChange={(e) => handleTextChange(idx, e.target.value)}
                                />
                            </div>
                            <button onClick={() => handleDelete(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-500 transition-all cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Adding Checklist Item Logic */}
            {isAdding ? (
                <div className="mt-4 p-4 bg-[#161616] rounded-2xl border border-yellow-400/20 animate-in fade-in zoom-in-95">
                    <input
                        autoFocus
                        className="w-full bg-transparent outline-none text-[13px] text-white mb-3"
                        placeholder="What needs to be done?"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewItem()}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleAddNewItem} className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">Confirm</button>
                        <button onClick={() => setIsAdding(false)} className="p-1.5 text-gray-500 hover:text-white"><X size={16} /></button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[11px] font-bold transition-all border border-white/5 w-full justify-center"
                >
                    <Plus size={14} /> Add an item
                </button>
            )}
        </div>
    );
};