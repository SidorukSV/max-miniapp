import { Routes, Route, HashRouter, BrowserRouter } from "react-router-dom";
import Home from "./pages/Home.jsx";
import BookVisit from "./pages/BookVisit.jsx";
import MyVisits from "./pages/MyVisits.jsx";
import History from "./pages/History.jsx";
import Bonuses from "./pages/Bonuses.jsx";
import { useMaxWebApp } from "./hooks/useMaxWebApp.js";

export default function App() {
  const { initData, user } = useMaxWebApp();
  console.log(user);
  console.log(initData);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<BookVisit />} />
        <Route path="/visits" element={<MyVisits />} />
        <Route path="/history" element={<History />} />
        <Route path="/bonuses" element={<Bonuses />} />
      </Routes>
    </BrowserRouter>
  );
}