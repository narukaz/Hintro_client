import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, MousePointer2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    });

    const containerRef = useRef(null);
    const cardRefs = { A: useRef(null), B: useRef(null), C: useRef(null) };
    const [targets, setTargets] = useState([]);


    useEffect(() => {
        const updatePositions = () => {
            if (containerRef.current) {
                const container = containerRef.current.getBoundingClientRect();
                const newTargets = Object.keys(cardRefs).map(key => {
                    const rect = cardRefs[key].current.getBoundingClientRect();
                    return {
                        x: rect.left - container.left + rect.width / 2,
                        y: rect.top - container.top + rect.height / 2
                    };
                });
                setTargets(newTargets);
            }
        };
        updatePositions();
        window.addEventListener('resize', updatePositions);
        return () => window.removeEventListener('resize', updatePositions);
    }, []);


    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        const endpoint = isLogin ? "/auth/signin" : "/auth/signup";
        const url = `http://localhost:5001${endpoint}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();


            if (response.ok) {
                if (isLogin) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("userName", data.user.name);
                    navigate("/dashboard");
                } else {

                    setIsLogin(true);
                    setError("Account created successfully! Please sign in.");
                    setFormData({ ...formData, password: "" });
                }
            } else {

                setError(data.message || "Something went wrong");
            }
        } catch (err) {
            setError("Server connection failed. Is the backend running?");
        } finally {
            setIsLoading(false);
        }
    };
    const cards = [
        { id: 'A', color: 'bg-purple-400', text: 'Welcome Back!', top: '15%', left: '15%', rotate: -5 },
        { id: 'B', color: 'bg-yellow-200', text: 'Own your power', top: '45%', left: '10%', rotate: 3 },
        { id: 'C', color: 'bg-green-300', text: 'Join the Team', top: '25%', left: '55%', rotate: 2 },
    ];

    return (
        <div className="flex h-screen w-full bg-black overflow-hidden font-sans">

            <div ref={containerRef} className="hidden lg:flex w-1/2 relative bg-[#0a0a0a] items-center justify-center border-r border-gray-800">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                {cards.map((card) => (
                    <div key={card.id} ref={cardRefs[card.id]} className={`absolute p-6 rounded-3xl shadow-2xl w-52 h-64 ${card.color} text-black font-bold flex flex-col justify-between`} style={{ top: card.top, left: card.left, transform: `rotate(${card.rotate}deg)` }}>
                        <span className="text-2xl">+</span>
                        <p className="text-xl leading-tight font-black">{card.text}</p>
                    </div>
                ))}
                {targets.length > 0 && (
                    <>
                        <motion.div animate={{ x: [targets[0].x, targets[1].x, targets[2].x, targets[0].x], y: [targets[0].y, targets[1].y, targets[2].y, targets[0].y] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute z-50 flex items-center pointer-events-none" style={{ left: 0, top: 0 }}>
                            <MousePointer2 className="w-6 h-6 fill-purple-500 text-black drop-shadow-lg" />
                            <div className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500 text-black">Alex</div>
                        </motion.div>
                        <motion.div animate={{ x: [targets[2].x, targets[0].x, targets[1].x, targets[2].x], y: [targets[2].y, targets[0].y, targets[1].y, targets[2].y] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute z-50 flex items-center pointer-events-none" style={{ left: 0, top: 0 }}>
                            <MousePointer2 className="w-6 h-6 fill-yellow-300 text-black drop-shadow-lg" />
                            <div className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-300 text-black">Sarah</div>
                        </motion.div>
                    </>
                )}
            </div>


            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 bg-black">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-bold text-white tracking-tighter">
                            {isLogin ? "Welcome Back" : "Start Building"}
                        </h2>
                        <p className="text-gray-500 mt-2">Sign in to manage your boards.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-black ml-1">Full Name</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                                        <input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full bg-[#111] border border-gray-800 rounded-2xl py-4 px-12 text-white outline-none focus:border-purple-500 transition-all" placeholder="John Doe" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-black ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                                <input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full bg-[#111] border border-gray-800 rounded-2xl py-4 px-12 text-white outline-none focus:border-purple-500 transition-all" placeholder="name@company.com" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-black ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                                <input required name="password" value={formData.password} onChange={handleInputChange} type="password" className="w-full bg-[#111] border border-gray-800 rounded-2xl py-4 px-12 text-white outline-none focus:border-purple-500 transition-all" placeholder="••••••••" />
                            </div>
                        </div>


                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium ${error.includes("successfully") || error.includes("created")
                                    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" // Success Style
                                    : "text-red-400 bg-red-400/10 border-red-400/20"             // Error Style
                                    }`}
                            >
                                {error.includes("successfully") || error.includes("created") ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <AlertCircle className="w-4 h-4" />
                                )}
                                {error}
                            </motion.div>
                        )}

                        <button disabled={isLoading} className="w-full bg-white cursor-pointer text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] mt-4 shadow-xl disabled:opacity-50">
                            {isLoading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
                        </button>
                    </form>

                    <p className="text-center text-gray-600 text-sm">
                        {isLogin ? "New here?" : "Joined us before?"}
                        <button onClick={() => { setIsLogin(!isLogin); setError(""); }} className="text-white ml-2 cursor-pointer font-bold hover:text-purple-400 transition-colors underline underline-offset-4">
                            {isLogin ? "Create account" : "Sign in here"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;