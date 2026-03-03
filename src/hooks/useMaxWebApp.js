import { useEffect, useMemo, useState } from "react";

export function useMaxWebApp() {
  const [webApp, setWebApp] = useState(null);

  useEffect(() => {
    const wa = window.WebApp;
    
    if (!wa) return;
    location.hash = location.hash.replace("#/#", "#");
    wa.onEvent("WebAppReady", onMaxAppReady);
    wa.ready();
    setWebApp(wa);
  }, []);

  const initData = webApp?.initData ?? "";              // строка
  const initDataUnsafe = webApp?.initDataUnsafe ?? {};  // объект
  const platform = webApp?.platform;                    // ios/android/desktop/web
  const version = webApp?.version;

  const user = useMemo(() => initDataUnsafe?.user ?? null, [initDataUnsafe]);
  alert(user);
  return { webApp, initData, initDataUnsafe, user, platform, version };
}

export function onMaxAppReady(wa){
  alert(wa.initData);
}