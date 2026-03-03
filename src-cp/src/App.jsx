import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import BookVisit from "./pages/BookVisit.jsx";
import MyVisits from "./pages/MyVisits.jsx";
import History from "./pages/History.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<BookVisit />} />
        <Route path="/visits" element={<MyVisits />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}