import { useEffect, useState } from "react";

export function useMaxWebApp() {
  const [webApp, setWebApp] = useState(() => window.WebApp ?? null);

  useEffect(() => {
    location.hash = location.hash.replace("#/#", "#");
    const wa = window.WebApp;
    if (!wa) return;

    // один раз сигналим, что UI готов
    wa.ready?.();
    setWebApp(wa);
  }, []);

  const initData = webApp?.initData ?? "";
  const initDataUnsafe = webApp?.initDataUnsafe ?? {};
  const user = initDataUnsafe?.user ?? null;

  return { webApp, initData, initDataUnsafe, user };
}