import React, { useState, useEffect, useRef } from 'react';
import { ListChecks, X, Plus } from 'lucide-react';

export const Checklist = ({ task, setTask }) => {
    const token = localStorage.getItem("token");
    const [localChecklists, setLocalChecklists] = useState(task.checklists || []);
    const isFirstRender = useRef(true);

    // Sync local state if task changes externally
    useEffect(() => {
        setLocalChecklists(task.checklists || []);
    }, [task.checklists]);

    // Debounce Logic: Syncs with DB 800ms after user stops typing
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

    const updateBackend = async (updatedChecklist) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/card/update/${task._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ checklists: updatedChecklist })
            });
            const data = await response.json();
            setTask(data);
        } catch (error) {
            console.error("Checklist update failed:", error);
        }
    };

    const handleLocalUpdate = (idx, fields) => {
        const updated = [...localChecklists];
        updated[idx] = { ...updated[idx], ...fields };
        setLocalChecklists(updated);

        // Immediate sync for toggle (checkboxes shouldn't wait for debounce)
        if (fields.hasOwnProperty('isCompleted')) {
            updateBackend(updated);
        }
    };

    const handleAdd = () => {
        const newItem = { title: "", isCompleted: false };
        const updated = [...localChecklists, newItem];
        setLocalChecklists(updated);
        updateBackend(updated);
    };

    const handleDelete = (idx) => {
        const updated = localChecklists.filter((_, i) => i !== idx);
        setLocalChecklists(updated);
        updateBackend(updated);
    };

    return (
        <div className="space-y-6">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <ListChecks size={14} className="text-yellow-400" /> Tasks
            </label>

            <div className="space-y-3">
                {localChecklists.map((item, idx) => (
                    <div key={item._id || idx} className="group flex flex-col gap-1 p-4 bg-[#0d0d0d] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                        {/* Top Control Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    className="w-5 h-5 rounded-lg accent-yellow-400 bg-transparent border-white/20 cursor-pointer flex-shrink-0"
                                    onChange={() => handleLocalUpdate(idx, { isCompleted: !item.isCompleted })}
                                />

                                {/* Input field is now vertically parallel to checkbox */}
                                <textarea
                                    rows={1}
                                    className={`w-full bg-transparent outline-none text-[13px] leading-tight resize-none transition-all py-1 ${item.isCompleted ? 'text-gray-600 line-through' : 'text-gray-300'
                                        }`}
                                    placeholder="Task title..."
                                    value={item.title}
                                    onChange={(e) => handleLocalUpdate(idx, { title: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={() => handleDelete(idx)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-500 transition-all cursor-pointer ml-2"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[11px] font-bold transition-all border border-white/5 cursor-pointer"
            >
                <Plus size={14} />
                Add an item
            </button>
        </div>
    );
};