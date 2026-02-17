import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ListChecks, Move, MessageSquare, Plus, Trash2, Edit3, CircleCheckBig } from 'lucide-react';

const ActivityItem = ({ log }) => {
    // Map backend ENUMs to Icons and Descriptions
    const getActionContent = (action, details) => {
        switch (action?.toUpperCase()) {
            case 'CREATE_CARD':
                return { icon: <Plus size={12} />, text: `created the card "${details.title}"` };

            case 'MOVE_CARD':
                return { icon: <Move size={12} />, text: `moved this card` };
            case 'UPDATE_CARD_TITLE':
                return { icon: <Edit3 size={12} />, text: `changed the title to "${details.newTitle}"` };
            case 'UPDATE_CARD_DESC':
                return { icon: <Edit3 size={12} />, text: `updated the description` };
            case 'TOGGLE_CHECKLIST_ITEM':
                return { icon: <ListChecks size={12} />, text: "checkbox updated" };
            case "ADD_CHECKLIST_ITEM":
                return { icon: <CircleCheckBig size={12} />, text: "checklist updated" }
            case "MARKED COMPLETE":

                const isDone = details.status === true || details.status === 'true';
                return {
                    icon: <ListChecks size={12} className={isDone ? "text-green-500" : ""} />,
                    text: isDone ? 'marked this card as complete' : 're-opened this card'
                };
            case 'ADD_COMMENT':
                return { icon: <MessageSquare size={12} />, text: `commented: "${details.textSnippet}..."` };
            case 'DELETE_CARD':
                return { icon: <Trash2 size={12} />, text: `deleted a card` };
            default:
                return { icon: <Edit3 size={12} />, text: `performed an action` };
        }
    };

    const content = getActionContent(log.action, log.details || {});

    return (
        <div className="flex gap-4 items-start py-3 border-b border-white/5 last:border-0">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-yellow-400 border border-yellow-400/20">
                {log.userId?.name?.charAt(0) || 'U'}
            </div>

            <div className="flex flex-col gap-1">
                <p className="text-[13px] text-gray-300 leading-tight">
                    <span className="font-bold text-white mr-1">{log.userId?.name || 'Someone'}</span>
                    {content.text}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium">
                    <span className="flex items-center gap-1">
                        {content.icon}
                        {log.action.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(log.timestamp))} ago</span>
                </div>
            </div>
        </div>
    );
};

export const ActivityModule = ({ activities, isLoading }) => {
    if (isLoading) return <div className="animate-pulse text-gray-600 text-[10px] font-bold">LOADING HISTORY...</div>;

    return (
        <div className="flex flex-col">
            {activities.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
                    <p className="text-gray-600 text-xs">No activity history yet.</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {activities.map((log) => (
                        <ActivityItem key={log._id} log={log} />
                    ))}
                </div>
            )}
        </div>
    );
};