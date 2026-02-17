import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, CheckCircle2, Circle } from 'lucide-react';

export const SortableCard = ({ task, onClick, onDelete, onToggleActive }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task._id });

    const wrapText = (text, maxWords) => {
        const words = text.split(" ");
        const lines = [];

        for (let i = 0; i < words.length; i += maxWords) {
            lines.push(words.slice(i, i + maxWords).join(" "));
        }

        return lines.map((line, index) => (
            <React.Fragment key={index}>
                {line}
                {index < lines.length - 1 && <br />}
            </React.Fragment>
        ));
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(task)}
            className={`group relative bg-[#161616] border ${task.active ? 'border-green-500/30' : 'border-white/5'} rounded-[20px] p-5 mb-3 cursor-grab active:cursor-grabbing hover:border-white/10 transition-all`}
        >
            <div className="flex items-start gap-3 w-full justify-between">
                {/* Left Side: Toggle and Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                        className="mt-0.5 shrink-0"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleActive(task._id, task.active);
                        }}
                    >
                        {task.active ?
                            <CheckCircle2 size={18} className="text-green-500" /> :
                            <Circle size={18} className="text-gray-600" />
                        }
                    </button>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-medium text-gray-300 break-words whitespace-normal leading-snug">
                            {wrapText(task.title, 6)}
                        </h4>
                    </div>
                </div>

                {/* Right Side: Delete Button (Now part of the flow) */}
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => onDelete(e, task._id)}
                    className="shrink-0 ml-2 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};