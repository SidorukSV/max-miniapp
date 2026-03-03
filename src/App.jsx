import { Routes, Route, HashRouter } from "react-router-dom";
import Home from "./pages/Home.jsx";
import BookVisit from "./pages/BookVisit.jsx";
import MyVisits from "./pages/MyVisits.jsx";
import History from "./pages/History.jsx";
import Bonuses from "./pages/Bonuses.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<BookVisit />} />
        <Route path="/visits" element={<MyVisits />} />
        <Route path="/history" element={<History />} />
        <Route path="/bonuses" element={<Bonuses />} />
      </Routes>
    </HashRouter>
  );
}