import { Routes, Route, HashRouter, BrowserRouter } from "react-router-dom";
import Home from "./pages/Home.jsx";
import BookVisit from "./pages/BookVisit.jsx";
import MyVisits from "./pages/MyVisits.jsx";
import History from "./pages/History.jsx";
import Bonuses from "./pages/Bonuses.jsx";
import { useMaxWebApp } from "./hooks/useMaxWebApp.js";
import { MaxContext } from "./context/MaxContext.jsx";

export default function App() {
  const max = useMaxWebApp();

  return (
    <MaxContext.Provider value={max}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<BookVisit />} />
          <Route path="/visits" element={<MyVisits />} />
          <Route path="/history" element={<History />} />
          <Route path="/bonuses" element={<Bonuses />} />
        </Routes>
      </BrowserRouter>
    </MaxContext.Provider>
  );
}