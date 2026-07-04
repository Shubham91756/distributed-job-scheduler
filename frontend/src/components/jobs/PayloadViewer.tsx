import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface PayloadViewerProps {
  payload: any;
}

export function PayloadViewer({ payload }: PayloadViewerProps) {
  const [copied, setCopied] = useState(false);

  const payloadStr = JSON.stringify(payload, null, 2);
  const sizeBytes = new Blob([payloadStr]).size;
  const sizeStr = sizeBytes < 1024 ? `${sizeBytes} B` : `${(sizeBytes / 1024).toFixed(2)} KB`;

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting regex
  const highlightedJson = payloadStr.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "text-emerald-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-sky-300 font-semibold"; // key
        } else {
          cls = "text-amber-300"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-rose-400 font-bold"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-slate-500 font-bold"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );

  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-2">
         <span className="text-xs text-slate-500 font-mono">Size: {sizeStr}</span>
         {Object.keys(payload || {}).length > 0 ? (
           <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 uppercase tracking-wide">Valid JSON</span>
         ) : (
           <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 uppercase tracking-wide">Empty Payload</span>
         )}
      </div>
      <div className="bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden relative">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-lg text-slate-300 transition-colors z-10 opacity-0 group-hover:opacity-100"
          title="Copy JSON"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
        <pre 
          className="p-4 text-sm font-mono leading-relaxed overflow-x-auto text-slate-300"
          dangerouslySetInnerHTML={{ __html: highlightedJson }}
        />
      </div>
    </div>
  );
}
