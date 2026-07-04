import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar } from "lucide-react";

interface JobsFilterBarProps {
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (s: string) => void;
  dateRange: string;
  setDateRange: (s: string) => void;
  workerFilter: string;
  setWorkerFilter: (s: string) => void;
}

export function JobsFilterBar({
  search, setSearch,
  statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter,
  typeFilter, setTypeFilter,
  dateRange, setDateRange,
  workerFilter, setWorkerFilter
}: JobsFilterBarProps) {
  
  // Debounce search input
  const [localSearch, setLocalSearch] = useState(search);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  return (
    <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-wrap">
      <div className="relative flex-1 w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input 
          type="text" 
          placeholder="Search jobs..." 
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
        />
      </div>
      <div className="flex items-center flex-wrap gap-2">
        <Filter size={16} className="text-slate-500 hidden sm:block" />
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="CLAIMED">Claimed</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="DEAD_LETTERED">Dead Letter</option>
        </select>
        
        <select 
          value={priorityFilter} 
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        
        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="immediate">Immediate</option>
          <option value="delayed">Delayed</option>
          <option value="scheduled">Scheduled</option>
          <option value="recurring">Recurring</option>
        </select>
        
        <div className="relative group hidden lg:block">
           {/* Date Range - placeholder for full date picker component */}
           <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-400 cursor-not-allowed">
              <Calendar size={14} /> Date Range (Soon)
           </div>
        </div>
      </div>
    </div>
  );
}
