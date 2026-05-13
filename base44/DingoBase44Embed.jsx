import { useEffect, useRef } from "react";

const DINGO_SCRIPT_ID = "dingo-widget-script";
const DINGO_SCRIPT_SRC = "/dingo/dingo-widget.js";
const DINGO_ASSET_BASE = "/dingo/";

export default function DingoBase44Embed() {
  const hostRef = useRef(null);

  useEffect(() => {
    let script = document.getElementById(DINGO_SCRIPT_ID);

    if (!script) {
      script = document.createElement("script");
      script.id = DINGO_SCRIPT_ID;
      script.type = "module";
      script.src = DINGO_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    if (!hostRef.current) return;
    if (hostRef.current.querySelector("dingo-app")) return;

    const element = document.createElement("dingo-app");
    element.setAttribute("asset-base", DINGO_ASSET_BASE);
    element.setAttribute("ai-endpoint", "/functions/dingoAi");
    hostRef.current.appendChild(element);
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: "fixed",
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        zIndex: 2147483000,
        overflow: "visible",
      }}
    />
  );
}
