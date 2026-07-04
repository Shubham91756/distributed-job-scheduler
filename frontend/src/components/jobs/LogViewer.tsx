import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Terminal, Download, Search, Filter } from "lucide-react";

interface LogViewerProps {
  logs: any[];
}

export function LogViewer({ logs }: LogViewerProps) {
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [searchText, setSearchText] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const filteredLogs = logs.filter(log => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  const downloadLogs = () => {
    const text = filteredLogs.map(l => `[${format(new Date(l.createdAt), "yyyy-MM-dd HH:mm:ss.SSS")}] [${l.level}] ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "INFO": return "text-sky-400";
      case "WARN": return "text-amber-400";
      case "ERROR": return "text-rose-400";
      default: return "text-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
          <Terminal size={16} className="text-slate-500" />
          <span>Console Output</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative">
             <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
               type="text" 
               placeholder="Grep logs..."
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
               className="bg-black/50 border border-white/10 rounded-md py-1 pl-7 pr-3 text-xs text-white focus:outline-none focus:border-sky-500 font-mono w-48"
             />
           </div>
           
           <select
             value={filterLevel}
             onChange={(e) => setFilterLevel(e.target.value)}
             className="bg-black/50 border border-white/10 rounded-md py-1 px-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono cursor-pointer"
           >
             <option value="ALL">ALL LEVELS</option>
             <option value="INFO">INFO</option>
             <option value="WARN">WARN</option>
             <option value="ERROR">ERROR</option>
           </select>

           <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white">
             <input 
               type="checkbox" 
               checked={autoScroll} 
               onChange={(e) => setAutoScroll(e.target.checked)}
               className="rounded bg-black border-white/20 accent-sky-500" 
             />
             Auto-scroll
           </label>

           <button 
             onClick={downloadLogs}
             className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
             title="Download Logs"
           >
             <Download size={14} />
           </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-10 italic">
            No logs available matching criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
              <span className="text-slate-500 shrink-0 select-none">
                {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss.SSS")}
              </span>
              <span className={`shrink-0 w-12 font-bold ${getLevelColor(log.level)}`}>
                [{log.level}]
              </span>
              <span className="text-slate-300 whitespace-pre-wrap break-words flex-1">
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
