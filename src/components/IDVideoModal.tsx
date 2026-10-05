import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Film,
} from "lucide-react";
import { IDVideoItem } from "../types";
import {
  parseIDVideoText,
  parseSpreadsheetFile,
  SAMPLE_ID_DATA_RAW,
  formatLabel,
} from "../lib/idVideoParser";

interface IDVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  idVideos: IDVideoItem[];
  hydratedVideos: any[];
  onSaveIdVideos: (items: IDVideoItem[]) => Promise<void>;
  onClearIdVideos: () => void;
  isSyncing: boolean;
  syncProgress?: { loaded: number; total: number } | null;
}

export function IDVideoModal({
  isOpen,
  onClose,
  idVideos,
  hydratedVideos,
  onSaveIdVideos,
  onClearIdVideos,
  isSyncing,
  syncProgress,
}: IDVideoModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "catalog">(
    idVideos.length > 0 ? "catalog" : "import"
  );
  const [rawText, setRawText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<IDVideoItem[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Catalog search, filters and pagination (Product & Business prioritized, Content Team filtered)
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogBusinessFilter, setCatalogBusinessFilter] = useState("all");
  const [catalogProductFilter, setCatalogProductFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpPageInput, setJumpPageInput] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [catalogSearch, catalogBusinessFilter, catalogProductFilter, pageSize]);

  // Parse text input
  const handleTextChange = (text: string) => {
    setRawText(text);
    setParseError(null);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }
    try {
      const items = parseIDVideoText(text);
      setParsedPreview(items);
      if (items.length === 0) {
        setParseError("No valid YouTube URLs found for Content Team. Make sure rows contain youtu.be or youtube.com links.");
      }
    } catch (e: any) {
      setParseError(e.message || "Failed to parse text");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError(null);
    try {
      const items = await parseSpreadsheetFile(file);
      if (items.length === 0) {
        setParseError("Could not find any YouTube video links for Content Team in the uploaded spreadsheet.");
      } else {
        setParsedPreview(items);
        setRawText(`// Successfully loaded ${file.name} with ${items.length.toLocaleString()} detected Content Team video links.`);
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to read spreadsheet file");
    } finally {
      setIsParsingFile(false);
      e.target.value = "";
    }
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_ID_DATA_RAW);
    const items = parseIDVideoText(SAMPLE_ID_DATA_RAW);
    setParsedPreview(items);
    setParseError(null);
  };

  const handleSaveAndSync = async () => {
    if (parsedPreview.length === 0) return;
    await onSaveIdVideos(parsedPreview);
    setActiveTab("catalog");
  };

  // Build high-performance lookup map
  const hydratedMap = useMemo(() => {
    const map = new Map<string, any>();
    hydratedVideos.forEach((v) => map.set(v.id, v));
    return map;
  }, [hydratedVideos]);

  // Unique businesses & products (creator is excluded as requested)
  const allBusinesses = useMemo(() => {
    const set = new Set<string>();
    idVideos.forEach((v) => {
      const b = v.business || v.category;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [idVideos]);

  const allProducts = useMemo(() => {
    const set = new Set<string>();
    idVideos.forEach((v) => {
      const p = v.product || v.subtopic;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [idVideos]);

  // Filtered catalog: Content Team strictly kept, filtered by Business & Product
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return idVideos.filter((item) => {
      // Exclude all other teams except Content Team
      if (item.team && !item.team.toLowerCase().includes("content")) return false;

      const live = hydratedMap.get(item.id);
      const title = (live?.snippet?.title || item.topic || "").toLowerCase();
      const channel = (live?.snippet?.channelTitle || item.channelNameHint || "").toLowerCase();
      const prod = (item.product || item.subtopic || "").toLowerCase();
      const biz = (item.business || item.category || "").toLowerCase();

      const matchesSearch =
        !q ||
        title.includes(q) ||
        channel.includes(q) ||
        prod.includes(q) ||
        biz.includes(q) ||
        item.id.includes(q);

      const matchesBusiness =
        catalogBusinessFilter === "all" ||
        item.business === catalogBusinessFilter ||
        item.category === catalogBusinessFilter;

      const matchesProduct =
        catalogProductFilter === "all" ||
        item.product === catalogProductFilter ||
        item.subtopic === catalogProductFilter;

      return matchesSearch && matchesBusiness && matchesProduct;
    });
  }, [idVideos, hydratedMap, catalogSearch, catalogBusinessFilter, catalogProductFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCatalog = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredCatalog.slice(start, start + pageSize);
  }, [filteredCatalog, validCurrentPage, pageSize]);

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      setJumpPageInput("");
    }
  };

  const handleDeleteItem = async (videoId: string) => {
    const updated = idVideos.filter((v) => v.id !== videoId);
    await onSaveIdVideos(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  Integrated Discovery (ID) Video Sheet Manager
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {idVideos.length.toLocaleString()} Curated Links
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Optimized for massive datasets (supports 10,000+ links). Automatic channel bifurcation via YouTube Channel IDs.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {isSyncing && (
          <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Syncing live YouTube statistics in background...
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {syncProgress
                  ? `${syncProgress.loaded.toLocaleString()} / ${syncProgress.total.toLocaleString()} (${Math.round((syncProgress.loaded / Math.max(1, syncProgress.total)) * 100)}%)`
                  : "Connecting..."}
              </span>
            </div>
            <div className="w-full h-2 bg-emerald-950/20 dark:bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{
                  width: syncProgress
                    ? `${Math.min(100, (syncProgress.loaded / Math.max(1, syncProgress.total)) * 100)}%`
                    : "15%",
                }}
              />
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 dark:border-white/10 px-6 bg-gray-50/50 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "catalog"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            Curated Catalog ({idVideos.length.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "import"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Upload className="w-4 h-4" />
            Import / Replace Sheet
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === "import" ? (
            <div className="space-y-6">
              {/* Upload Controls Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Option A: Paste Direct from Excel / Google Sheets
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Copy up to 20,000+ rows directly from Excel or Google Sheets and paste below. The parser extracts the YouTube ID and metadata cleanly.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleLoadSample}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      ⚡ Load 39 Demo Deliverables (Vivek & Sanju)
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/[0.02] flex flex-col items-center justify-center text-center">
                  <FileSpreadsheet className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                    Option B: Upload File
                  </span>
                  <span className="text-[10px] text-gray-500 mb-3">
                    Supports .xlsx, .xls, .csv, .tsv (Large files)
                  </span>
                  <label className="cursor-pointer px-3 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-black rounded text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                    {isParsingFile ? "Reading Spreadsheet..." : "Browse Spreadsheet"}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isParsingFile}
                    />
                  </label>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Paste TSV / CSV Data
                  </label>
                  {parsedPreview.length > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ {parsedPreview.length.toLocaleString()} YouTube links detected
                    </span>
                  )}
                </div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Content Team\t24-Sep\tSeptember\tMain Channel\tVivek\tIn-House Editor\thttps://playbook.com/...\t3 in 1 Demat Account\tdemat\tinvestments\tsavers\thttps://youtu.be/SbqbwCIEXIU`}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Parse Error */}
              {parseError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Preview Table - Virtualized to first 25 rows to prevent DOM hang */}
              {parsedPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Parsed {parsedPreview.length.toLocaleString()} Videos
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Showing preview of first {Math.min(25, parsedPreview.length)} rows. All {parsedPreview.length.toLocaleString()} will be imported cleanly into IndexedDB.
                      </p>
                    </div>
                    <button
                      onClick={handleSaveAndSync}
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing..." : `Save & Sync All ${parsedPreview.length.toLocaleString()} Videos`}
                    </button>
                  </div>

                  <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-100 dark:bg-white/5 sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-500">
                        <tr>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">#</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Video ID</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Product</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Business</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Channel</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Topic / Title</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Team</th>
                          <th className="p-2 border-b border-gray-200 dark:border-white/10">Assets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/5 font-mono text-[11px]">
                        {parsedPreview.slice(0, 25).map((item, idx) => (
                          <tr key={`${item.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className="p-2 text-gray-400 font-sans text-[10px]">{idx + 1}</td>
                            <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">
                              <a
                                href={item.youtubeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-1"
                              >
                                {item.id} <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                            <td className="p-2 font-sans font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatLabel(item.product || item.subtopic)}
                            </td>
                            <td className="p-2 font-sans font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                              {formatLabel(item.business || item.category)}
                            </td>
                            <td className="p-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {item.channelNameHint || "-"}
                            </td>
                            <td className="p-2 font-sans max-w-xs truncate text-gray-700 dark:text-gray-300">
                              {item.topic || "-"}
                            </td>
                            <td className="p-2 font-sans text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap text-[10px]">
                              Content Team
                            </td>
                            <td className="p-2">
                              {item.playbookUrl ? (
                                <a
                                  href={item.playbookUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-500 hover:underline flex items-center gap-1 font-sans text-[10px]"
                                >
                                  Playbook <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Catalog Tab with High Performance Pagination */
            <div className="space-y-4">
              {/* Catalog Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search product, business, topic, video ID, channel..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {allBusinesses.length > 0 && (
                    <select
                      value={catalogBusinessFilter}
                      onChange={(e) => setCatalogBusinessFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                      title="Filter by Business line"
                    >
                      <option value="all">All Businesses ({allBusinesses.length})</option>
                      {allBusinesses.map((b) => (
                        <option key={b} value={b}>
                          {formatLabel(b)}
                        </option>
                      ))}
                    </select>
                  )}

                  {allProducts.length > 0 && (
                    <select
                      value={catalogProductFilter}
                      onChange={(e) => setCatalogProductFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                      title="Filter by Product"
                    >
                      <option value="all">All Products ({allProducts.length})</option>
                      {allProducts.map((p) => (
                        <option key={p} value={p}>
                          {formatLabel(p)}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap flex items-center gap-1">
                    <span>✓ Content Team Only</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSaveIdVideos(idVideos)}
                    disabled={isSyncing}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white flex items-center gap-1.5 transition-colors"
                    title="Refresh live metrics from YouTube"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    Sync Stats
                  </button>
                  <button
                    onClick={onClearIdVideos}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear List
                  </button>
                </div>
              </div>

              {/* Video Items List */}
              {idVideos.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
                  <Film className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    No Curated ID Videos Loaded
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                    Import your team's spreadsheet links to switch the dashboard into ID Video Mode.
                  </p>
                  <button
                    onClick={() => setActiveTab("import")}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    Import Spreadsheet Now
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden flex flex-col">
                  {/* Table view */}
                  <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-100 dark:bg-white/5 sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-500">
                        <tr>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10">Video</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10">Product</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10">Business</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10">Channel</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10">Team</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10 text-right">Views</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10 text-right">Type</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10 text-center">Playbook</th>
                          <th className="p-3 border-b border-gray-200 dark:border-white/10 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                        {paginatedCatalog.map((item) => {
                          const live = hydratedMap.get(item.id);
                          const thumb =
                            live?.snippet?.thumbnails?.medium?.url ||
                            live?.snippet?.thumbnails?.default?.url ||
                            `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`;
                          const title = live?.snippet?.title || item.topic || `Video ${item.id}`;
                          const views = live ? Number(live.statistics?.viewCount || 0) : null;
                          const channelTitle = live?.snippet?.channelTitle || item.channelNameHint || "Loaded Channel";
                          const isShort = live?._isShort;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                              {/* Thumbnail & Title */}
                              <td className="p-3 max-w-sm">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-20 h-12 bg-black rounded overflow-hidden shrink-0">
                                    <img
                                      src={thumb}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                    {isShort && (
                                      <span className="absolute bottom-1 right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded flex items-center gap-0.5">
                                        <Zap className="w-2 h-2" /> Short
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <a
                                      href={item.youtubeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-gray-900 dark:text-white hover:text-emerald-500 truncate transition-colors text-xs"
                                      title={title}
                                    >
                                      {title}
                                    </a>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      ID: {item.id} {item.date ? `• ${item.date}` : ""}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Product */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                                  🏷️ {formatLabel(item.product || item.subtopic)}
                                </span>
                              </td>

                              {/* Business */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
                                  💼 {formatLabel(item.business || item.category)}
                                </span>
                              </td>

                              {/* Channel */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  {channelTitle}
                                </span>
                              </td>

                              {/* Team */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Content Team
                                </span>
                              </td>

                              {/* Views */}
                              <td className="p-3 text-right font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {views !== null ? views.toLocaleString() : (
                                  <span className="text-gray-400 font-normal italic text-[10px]">
                                    Queued
                                  </span>
                                )}
                              </td>

                              {/* Type */}
                              <td className="p-3 text-right whitespace-nowrap">
                                {isShort ? (
                                  <span className="text-[10px] text-red-500 font-bold flex items-center justify-end gap-1">
                                    <Zap className="w-3 h-3" /> Short
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-blue-500 font-bold flex items-center justify-end gap-1">
                                    <Play className="w-3 h-3" /> Long
                                  </span>
                                )}
                              </td>

                              {/* Playbook Link */}
                              <td className="p-3 text-center whitespace-nowrap">
                                {item.playbookUrl ? (
                                  <a
                                    href={item.playbookUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 inline-flex text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                                    title="View Playbook Creative Brief"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Remove from curated list"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/10 text-xs">
                    <div className="text-gray-500">
                      Showing{" "}
                      <strong>
                        {filteredCatalog.length === 0
                          ? 0
                          : (validCurrentPage - 1) * pageSize + 1}
                      </strong>{" "}
                      to{" "}
                      <strong>
                        {Math.min(validCurrentPage * pageSize, filteredCatalog.length)}
                      </strong>{" "}
                      of <strong>{filteredCatalog.length.toLocaleString()}</strong> videos
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Page Size Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 text-[11px]">Rows:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-black text-gray-900 dark:text-white"
                        >
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={250}>250</option>
                        </select>
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={validCurrentPage <= 1}
                          className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/10 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                          «
                        </button>
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={validCurrentPage <= 1}
                          className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/10 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-0.5"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>

                        <span className="px-2 text-xs font-mono font-bold text-gray-900 dark:text-white">
                          {validCurrentPage} / {totalPages}
                        </span>

                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={validCurrentPage >= totalPages}
                          className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/10 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-0.5"
                        >
                          Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={validCurrentPage >= totalPages}
                          className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/10 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                          »
                        </button>
                      </div>

                      {/* Quick Jump */}
                      <form onSubmit={handleJumpPage} className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Page"
                          value={jumpPageInput}
                          onChange={(e) => setJumpPageInput(e.target.value)}
                          className="w-14 px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-white/10 bg-white dark:bg-black text-gray-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20"
                        >
                          Go
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
          <div className="text-xs text-gray-500">
            {idVideos.length > 0 ? (
              <span>
                <strong>{idVideos.length.toLocaleString()}</strong> videos in database • Virtualized & IndexedDB accelerated
              </span>
            ) : (
              <span>No curated links loaded</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
