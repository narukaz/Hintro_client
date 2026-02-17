import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';


import Login
  from './pages/Login';

import { Dashboard } from './pages/Dashboard';
import { BoardView } from './pages/BoardView';
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_SOCKET_URL);

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem("token")));
  console.log(isAuthenticated)

  return (
    <Router>
      <Routes>

        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login setAuth={setIsAuthenticated} />
          }
        />


        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard socket={socket} /> : <Navigate to="/login" />}
        />
        <Route
          path="/board/:boardId"
          element={isAuthenticated ? <BoardView socket={socket} /> : <Navigate to="/login" />}
        />


        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;