import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableCard } from '../components/Sortable_card';
import {
    ChevronLeft, Plus, X, MoreHorizontal, Loader2,
    Trash2, Search as SearchIcon, Bell
} from 'lucide-react';

import SelectedTask from '../components/SelectedTask';
import { CollaboratorSection } from '../components/Collaborator';
import { NotificationCenter } from '../components/Notification';

export const BoardView = ({ socket }) => {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null); // Track dragged card

    const [inlineAddingCardTo, setInlineAddingCardTo] = useState(null);
    const [inlineAddingList, setInlineAddingList] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [isSearchingServer, setIsSearchingServer] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => { fetchBoardData(); }, [boardId]);

    const fetchBoardData = async () => {
        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}board/${boardId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setBoard(data.board);
            const sortedLists = data.lists.map(list => ({
                ...list,
                tasks: list.tasks.sort((a, b) => a.order - b.order)
            })).sort((a, b) => a.order - b.order);
            setLists(sortedLists);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    const handleServerSearch = useCallback(async (q) => {
        if (q.length < 2) return;

        setIsSearchingServer(true);
        const startTime = Date.now(); // Track when we started
        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}card/search/${boardId}?q=${encodeURIComponent(q)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const searchResults = await res.json();

            // Calculate how much time has passed
            const duration = Date.now() - startTime;
            const minimumDelay = 600; // Ensure loading lasts at least 600ms

            // Wait for the remaining time if the server was too fast
            if (duration < minimumDelay) {
                await new Promise(resolve => setTimeout(resolve, minimumDelay - duration));
            }

            setLists(prev => prev.map(list => {
                const matchedCards = searchResults.filter(c => c.listId === list._id);
                return {
                    ...list,
                    tasks: matchedCards,
                    hasMore: false
                };
            }));
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearchingServer(false);
        }
    }, [boardId]);
    useEffect(() => {
        if (!searchQuery.trim()) {
            fetchBoardData(); // This sets 'lists', causing a re-render
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            // Call the search
            handleServerSearch(searchQuery);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // REMOVE handleServerSearch from here if it's causing issues, 
        // or ensure handleServerSearch dependencies are stable.
    }, [searchQuery]);
    const fetchMoreCards = async (listId, page) => {
        const token = localStorage.getItem("token");
        const limit = 10;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}list/${listId}/cards?page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            setLists(prev => prev.map(list => {
                if (list._id === listId) {
                    return {
                        ...list,
                        tasks: [...list.tasks, ...data.cards],
                        currentPage: page,
                        hasMore: data.hasMore
                    };
                }
                return list;
            }));
        } catch (error) {
            console.error("Error loading more cards:", error);
        }
    };
    const findContainer = (id) => {
        // If the ID is a list ID itself
        if (lists.find(l => l._id === id)) return id;

        // If the ID belongs to a task, find that task's list
        return lists.find(l => l.tasks?.some(t => t._id === id))?._id;
    };
    useEffect(() => {
        if (!boardId || !socket) return;

        const handleCardDeleted = (data) => {
            const { cardId, socketId } = data;

            // 1. BLOCK if I am the one who deleted it 
            // (Since your local state already refreshed or filtered it out)
            if (socketId === socket.id) return;

            console.log("Syncing deletion for card:", cardId);

            // 2. Remove the card from the local state
            setLists(prevLists => prevLists.map(list => ({
                ...list,
                tasks: list.tasks.filter(task => task._id !== cardId)
            })));
        };

        socket.on("CARD_DELETED", handleCardDeleted);

        return () => {
            socket.off("CARD_DELETED", handleCardDeleted);
        };
    }, [boardId, socket.id]);


    useEffect(() => {
        if (!boardId) return;

        socket.emit("join_board", boardId);
        const onCardMoved = (data) => {
            const { cardId, fromListId, toListId, newOrder, senderId } = data;

            // 1. Crucial: If I am the one who moved it, my UI is already updated via dnd-kit
            if (senderId === localStorage.getItem("userId")) return;

            setLists(prevLists => {
                let movedCard = null;

                // 2. Remove the card from its original list and find the card object
                const updatedLists = prevLists.map(list => {
                    if (list._id === fromListId) {
                        movedCard = list.tasks.find(t => t._id === cardId);
                        return {
                            ...list,
                            tasks: list.tasks.filter(t => t._id !== cardId)
                        };
                    }
                    return list;
                });

                // 3. If we didn't find the card in the 'fromList', it might already be moved or loading
                if (!movedCard) return prevLists;

                // 4. Insert the card into the destination list at the specific 'newOrder' index
                return updatedLists.map(list => {
                    if (list._id === toListId) {
                        const newTasks = [...list.tasks];
                        // Ensure we don't add a duplicate if the event was repeated
                        if (newTasks.find(t => t._id === cardId)) return list;

                        newTasks.splice(newOrder, 0, { ...movedCard, listId: toListId });

                        // Optional: Re-sort or re-map orders to ensure UI consistency
                        return { ...list, tasks: newTasks };
                    }
                    return list;
                });
            });
        };


        socket.on("CARD_MOVED", onCardMoved);

        return () => {

            socket.off("CARD_MOVED", onCardMoved);
        };
    }, [boardId]);

    useEffect(() => {
        if (!boardId || !socket) return;

        const handleCardCreated = (data) => {
            const { newCard, socketId } = data;

            // GATE 1: Ignore if I am the one who created this card
            if (socketId === socket.id) return;

            setLists(prevLists => prevLists.map(list => {
                if (list._id === newCard.listId) {
                    // GATE 2: Defensive check - is this card already in my state?
                    const alreadyExists = list.tasks.some(t => t._id === newCard._id);
                    if (alreadyExists) return list;

                    return {
                        ...list,
                        tasks: [...list.tasks, newCard].sort((a, b) => a.order - b.order)
                    };
                }
                return list;
            }));
        };

        socket.on("CARD_CREATED", handleCardCreated);
        return () => socket.off("CARD_CREATED", handleCardCreated);
    }, [boardId, socket.id]); // Re-bind if socket ID changes
    const handleDragStart = (event) => setActiveId(event.active.id);

    const handleDragOver = useCallback((event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        setLists((prev) => {
            const activeList = prev.find(l => l._id === activeContainer);
            const overList = prev.find(l => l._id === overContainer);

            if (!activeList || !overList) return prev;

            const activeItems = activeList.tasks || [];
            const overItems = overList.tasks || [];

            const activeIndex = activeItems.findIndex(i => i._id === activeId);
            const overIndex = overItems.findIndex(i => i._id === overId);

            // Calculate new position
            let newIndex;
            if (overId in prev.map(l => l._id)) {
                newIndex = overItems.length;
            } else {
                const isBelowLastItem = over && overIndex === overItems.length - 1;
                const modifier = isBelowLastItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
            }

            return prev.map(list => {
                if (list._id === activeContainer) {
                    return {
                        ...list,
                        tasks: activeItems.filter(i => i._id !== activeId)
                    };
                }
                if (list._id === overContainer) {
                    const movedItem = activeItems[activeIndex];
                    // Ensure we don't duplicate if already there
                    if (overItems.find(i => i._id === activeId)) return list;

                    const newTasks = [...overItems];
                    newTasks.splice(newIndex, 0, { ...movedItem, listId: overContainer });
                    return { ...list, tasks: newTasks };
                }
                return list;
            });
        });
    }, [lists]); // Add dependency

    const handleDragEnd = useCallback(async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (activeContainer && overContainer) {
            const activeIndex = lists.find(l => l._id === activeContainer).tasks.findIndex(t => t._id === activeId);
            const overIndex = lists.find(l => l._id === overContainer).tasks.findIndex(t => t._id === overId);

            // 1. Update Local State Immediately (The Permanent Fix)
            setLists((prev) => {
                if (activeContainer === overContainer) {
                    // Moving within the same list
                    return prev.map((list) => {
                        if (list._id === activeContainer) {
                            return {
                                ...list,
                                tasks: arrayMove(list.tasks, activeIndex, overIndex),
                            };
                        }
                        return list;
                    });
                } else {
                    // Moving between different lists (already handled by handleDragOver, 
                    // but we ensure it's finalized here)
                    return prev;
                }
            });

            // 2. Persist to Database
            const token = localStorage.getItem("token");
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}card/move/${activeId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        newListId: overContainer,
                        newOrder: overIndex >= 0 ? overIndex : 0
                    })
                });

                if (!response.ok) throw new Error("Server update failed");
            } catch (err) {
                console.error("Sync failed, reverting...", err);
                fetchBoardData(); // Only refresh if the server actually fails
            }
        }
    }, [lists, findContainer]);

    const ListContainer = ({ list, children }) => {
        const { setNodeRef } = useDroppable({
            id: list._id, // This allows us to drop even if tasks array is empty
        });

        return (
            <div
                ref={setNodeRef}
                className="flex-1 min-h-[150px] overflow-y-auto pr-1 custom-scrollbar"
            >
                {children}
            </div>
        );
    };
    const handleCreateCard = async (listId) => {
        if (!newTitle.trim()) { setInlineAddingCardTo(null); return; }
        const token = localStorage.getItem("token");

        // Ensure we are adding it to the VERY end of the current stack
        const currentList = lists.find(l => l._id === listId);
        const nextOrder = currentList?.tasks?.length || 0;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}card/create`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle, listId, boardId, order: nextOrder, socketId: socket.id })
            });

            if (res.ok) {
                const newCardFromServer = await res.json();
                setNewTitle("");
                setInlineAddingCardTo(null);

                // OPTION: Instead of a full fetch, update local state immediately
                setLists(prev => prev.map(list => {
                    if (list._id === listId) {
                        return { ...list, tasks: [...list.tasks, newCardFromServer] };
                    }
                    return list;
                }));
            }
        } catch (err) { console.error(err); }
    };
    const LoadingCardPlaceholder = () => (
        <div className="w-full bg-white/5 border border-dashed border-white/10 rounded-[20px] p-5 animate-pulse">
            <div className="h-3 w-3/4 bg-white/10 rounded mb-3" />
            <div className="h-2 w-1/2 bg-white/5 rounded" />
        </div>
    );

    const handleCreateList = async () => {
        if (!newTitle.trim()) { setInlineAddingList(false); return; }
        const token = localStorage.getItem("token");
        const nextOrder = lists.length;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}list/create`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle, boardId, order: nextOrder })
            });
            if (res.ok) { setNewTitle(""); setInlineAddingList(false); fetchBoardData(); }
        } catch (err) { console.error(err); }
    };

    const handleUpdateTask = useCallback(async (taskId, updates) => {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}card/update/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                const data = await res.json();

                // Guarded Update: Only update if strictly necessary
                setLists(prev => prev.map(l => ({
                    ...l,
                    tasks: l.tasks.map(t => t._id === taskId ? { ...t, ...updates } : t)
                })));

                setSelectedTask(prev => {
                    // If the modal isn't open for THIS task, don't trigger state update
                    if (!prev || prev._id !== taskId) return prev;
                    // If the values are already the same, return previous state object to avoid re-render
                    if (Object.keys(updates).every(key => prev[key] === updates[key])) return prev;
                    return { ...prev, ...updates };
                });

                return data;
            }
        } catch (err) {
            console.error("Network or logic error:", err);
        }
    }, [selectedTask?._id]);
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
    const handleDeleteCard = async (e, cardId) => {
        e.stopPropagation();
        const token = localStorage.getItem("token");

        // Optimistic Update: Remove it from UI immediately
        setLists(prev => prev.map(list => ({
            ...list,
            tasks: list.tasks.filter(t => t._id !== cardId)
        })));

        try {
            await fetch(`${import.meta.env.VITE_API_URL}card/delete/${cardId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-socket-id': socket.id // Pass socket ID here
                }
            });
        } catch (err) {
            console.error("Delete failed:", err);
            fetchBoardData(); // Revert on error
        }
    };
    useEffect(() => {
        if (!boardId || !socket) return;

        const handleStatusUpdated = (data) => {
            const { cardId, active, socketId } = data;

            // Ignore if I am the one who toggled it
            if (socketId === socket.id) return;

            setLists(prevLists => prevLists.map(list => ({
                ...list,
                tasks: list.tasks.map(task =>
                    task._id === cardId ? { ...task, active: active } : task
                )
            })));
        };

        socket.on("CARD_STATUS_UPDATED", handleStatusUpdated);
        return () => socket.off("CARD_STATUS_UPDATED", handleStatusUpdated);
    }, [boardId, socket.id]);
    const handleToggleActive = async (taskId, currentStatus) => {
        const token = localStorage.getItem("token");
        const newStatus = !currentStatus;

        // 1. Optimistic Update (Immediate UI change)
        setLists(prevLists => {
            return prevLists.map(list => ({
                ...list,
                tasks: list.tasks.map(task =>
                    task._id === taskId ? { ...task, active: newStatus } : task
                )
            }));
        });

        // 2. Network Call
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}card/update-status/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: newStatus })
            });

            if (!response.ok) {
                throw new Error("Failed to save to server");
            }
        } catch (error) {
            console.error(error);
            // 3. Revert state if the server call fails
            fetchBoardData();
        }
    };
    const filteredLists = useMemo(() => {
        if (!searchQuery) return lists;
        return lists.map(l => ({
            ...l, tasks: l.tasks?.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
        }));
    }, [lists, searchQuery]);

    if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
                <nav className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-6">
                    <div className="w-full max-w-7xl h-20 flex items-center justify-between px-10 bg-[#0d0d0d]/80 backdrop-blur-md rounded-full border border-white/5 shadow-2xl">

                        {/* Left Side: Navigation and Title */}
                        <div className="flex items-center gap-6 min-w-0">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2.5 hover:bg-white/10 rounded-full transition-colors border border-white/5 flex-shrink-0"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex flex-col truncate">
                                <h2 className="text-sm font-bold tracking-tight truncate">{board?.title}</h2>
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Project Board</span>
                            </div>
                        </div>

                        {/* Right Side: Collaborators, Search, Notifications, & Profile */}
                        <div className="flex items-center gap-4">
                            {/* COLLABORATORS */}


                            {/* Divider */}

                            {/* SEARCH */}
                            <div className="relative hidden lg:block">
                                {isSearchingServer ? (
                                    <Loader2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 animate-spin" />
                                ) : (
                                    <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                )}
                                <input
                                    className="bg-[#1a1a1a] border border-white/5 rounded-full pl-10 pr-6 py-2 text-xs outline-none focus:border-yellow-400/30 w-48 transition-all focus:w-64"
                                    placeholder="Search board in database..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="h-8 w-[1px] bg-white/5 mx-2 hidden md:block" />
                            {/* NOTIFICATION CENTER - ADDED HERE */}
                            <CollaboratorSection
                                boardId={boardId}
                                collaborators={board?.collaborators || []}
                            />
                            <NotificationCenter socket={socket} />

                            {/* USER PROFILE */}
                            <div className="w-10 h-10 rounded-full bg-yellow-400 text-black flex-shrink-0 flex items-center justify-center text-xs font-black shadow-[0_0_20px_rgba(250,204,21,0.2)] ml-2">
                                {localStorage.getItem("userName")?.charAt(0) || 'A'}
                            </div>
                        </div>
                    </div>
                </nav>
                <main className="pt-32 p-10 flex gap-6 overflow-x-auto h-screen items-start custom-scrollbar">


                    {/* Inside BoardView.jsx main section */}
                    {filteredLists.map(list => (
                        <div
                            key={list._id}
                            className="min-w-[320px] bg-[#0d0d0d] rounded-[32px] p-6 flex flex-col max-h-[78vh] border border-white/5"
                        >
                            {/* FIXED HEADER */}
                            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    {list.title}
                                </h3>
                                <MoreHorizontal size={14} className="text-gray-700 cursor-pointer" />
                            </div>

                            {/* SCROLLABLE TASK AREA */}
                            <SortableContext
                                id={list._id}
                                items={list.tasks?.map(t => t._id) || []}
                                strategy={verticalListSortingStrategy}
                            >
                                <ListContainer list={list}>
                                    <div className="flex flex-col gap-3 pb-2">
                                        {isSearchingServer ? (
                                            // SHOW DUMMY CARDS WHILE SEARCHING
                                            <>
                                                <div className="text-[10px] text-yellow-400/50 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Loader2 size={10} className="animate-spin" />
                                                    Searching DB...
                                                </div>
                                                <LoadingCardPlaceholder />

                                            </>
                                        ) : (
                                            // SHOW ACTUAL CARDS
                                            <>
                                                {list.tasks?.map(task => (
                                                    <SortableCard
                                                        key={task._id}
                                                        task={task}
                                                        onClick={setSelectedTask}
                                                        onDelete={handleDeleteCard}
                                                        onToggleActive={handleToggleActive}
                                                    />
                                                ))}

                                                {/* PAGINATION TRIGGER */}
                                                {list.hasMore && (
                                                    <button
                                                        onClick={() => fetchMoreCards(list._id, (list.currentPage || 1) + 1)}
                                                        className="w-full py-2 mt-2 text-[9px] font-black uppercase text-gray-500 hover:text-yellow-400 transition-colors bg-white/5 rounded-xl border border-white/5"
                                                    >
                                                        Load More...
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </ListContainer>
                            </SortableContext>

                            {/* FIXED BOTTOM ACTION AREA */}
                            <div className="mt-4 flex-shrink-0">
                                {inlineAddingCardTo === list._id ? (
                                    <div className="bg-[#161616] rounded-[20px] p-4 border border-yellow-400/30 shadow-xl">
                                        <input
                                            autoFocus
                                            className="w-full bg-transparent outline-none text-sm text-white mb-2"
                                            placeholder="Enter card title..."
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') setInlineAddingCardTo(null);
                                                if (e.key === 'Enter') handleCreateCard(list._id);
                                            }}
                                        />
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleCreateCard(list._id)}
                                                className="text-[10px] cursor-pointer font-bold text-yellow-400 uppercase"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => { setInlineAddingCardTo(null); setNewTitle(""); }}
                                                className="text-[10px] cursor-pointer hover:text-white
 font-bold text-gray-500 uppercase"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setInlineAddingCardTo(list._id); }}
                                        className="w-full py-4 bg-white/[0.02] border border-dashed border-white/5 rounded-[20px] text-[10px] font-bold uppercase text-gray-600 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        + New Card
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {inlineAddingList ? (
                        <div className="min-w-[320px] bg-[#0d0d0d] rounded-[32px] p-6 border border-yellow-400/30">
                            <input autoFocus className="w-full bg-transparent outline-none text-sm text-white mb-4 border-b border-white/10 pb-2" placeholder="List title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                            <div className="flex gap-3">
                                <button onClick={handleCreateList} className="text-[10px] cursor-pointer font-bold text-yellow-400 uppercase">Add List</button>
                                <button onClick={() => setInlineAddingList(false)} className="text-[10px] hover:text-white cursor-pointer font-bold text-gray-600 uppercase">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => { setInlineAddingList(true); setInlineAddingCardTo(null); }}
                            className="min-w-[320px] h-[100px] border-2 border-dashed border-white/5 rounded-[32px] flex items-center justify-center cursor-pointer text-gray-700 hover:text-white transition-all"><Plus size={20} className="mr-2" /> <span className="text-[10px] font-bold uppercase">Add List</span></button>
                    )}
                </main>

                <DragOverlay dropAnimation={null}>
                    {activeId ? (
                        <div className="w-[272px] bg-[#161616] border border-yellow-400/50 rounded-[20px] p-5 shadow-2xl opacity-90 rotate-3 pointer-events-none">
                            <p className="text-[14px] font-medium text-gray-300 break-words whitespace-normal leading-snug">
                                {lists.flatMap(l => l.tasks).find(t => t._id === activeId)?.title}
                            </p>
                        </div>
                    ) : null}
                </DragOverlay>

                <AnimatePresence>
                    {selectedTask && (
                        <SelectedTask
                            boardId={boardId}
                            socket={socket}
                            lists={lists}
                            setLists={setLists}
                            setSelectedTask={setSelectedTask}
                            selectedTask={selectedTask}
                            handleUpdateTask={handleUpdateTask}

                        />
                    )}
                </AnimatePresence>
            </div>
        </DndContext>
    );
};