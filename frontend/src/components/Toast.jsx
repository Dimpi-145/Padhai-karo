import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || "info"}`}>
          {t.type === "success" && <CheckCircle2 size={16} color="#34d399" />}
          {t.type === "error" && <AlertCircle size={16} color="#f87171" />}
          {(!t.type || t.type === "info") && <Info size={16} color="#818cf8" />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button 
            onClick={() => onCloseToast(t.id)} 
            style={{ color: "#94a3b8", display: "flex", alignItems: "center" }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
