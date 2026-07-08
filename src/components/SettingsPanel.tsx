import React, { useState, useEffect } from "react";
import { Settings, X, Save, Plus, Trash2, Unplug, HelpCircle, ChevronDown, ChevronRight, Monitor, Moon, Sun, Clock, Hash } from "lucide-react";
import { cn } from "../lib/utils";
import type { DashboardKeys, YouTubeChannelConfig, InstagramAccountConfig, DisplayConfig } from "../types";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: DashboardKeys) => void;
}

export function SettingsPanel({ isOpen, onClose, onSave }: SettingsPanelProps) {
  const [youtubeKey, setYoutubeKey] = useState("");
  const [youtubeChannels, setYoutubeChannels] = useState<YouTubeChannelConfig[]>([]);
  const [instagramKey, setInstagramKey] = useState("");
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountConfig[]>([]);
  const [geminiKey, setGeminiKey] = useState("");
  
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>({
    theme: 'dark',
    timeRange: '30d',
    videoLimit: 50
  });

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setYoutubeKey(localStorage.getItem("f1_youtubeKey") || "");
      try {
        const yt = localStorage.getItem("f1_youtubeChannels");
        const parsedYt = yt ? JSON.parse(yt) : [];
        setYoutubeChannels(Array.isArray(parsedYt) ? parsedYt : []);
      } catch (e) { setYoutubeChannels([]); }

      setInstagramKey(localStorage.getItem("f1_instagramKey") || "");
      try {
        const ig = localStorage.getItem("f1_instagramAccounts");
        const parsedIg = ig ? JSON.parse(ig) : [];
        setInstagramAccounts(Array.isArray(parsedIg) ? parsedIg : []);
      } catch (e) { setInstagramAccounts([]); }

      setGeminiKey(localStorage.getItem("f1_geminiKey") || "");

      try {
        const display = localStorage.getItem("f1_displayConfig");
        if (display && display !== "null" && display !== "undefined") {
          const parsedDisplay = JSON.parse(display);
          if (parsedDisplay && typeof parsedDisplay === 'object') {
            setDisplayConfig(prev => ({ ...prev, ...parsedDisplay }));
          }
        }
      } catch (e) { }
    }
  }, [isOpen]);

  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    // Validation
    let isValid = true;
    let newError = "";
    
    if (youtubeChannels.length > 0 && !youtubeKey) {
      isValid = false;
      newError = "YouTube API Key is required if channels are configured.";
    }
    
    if (instagramAccounts.length > 0 && !instagramKey) {
      isValid = false;
      newError = "Instagram Access Token is required if accounts are configured.";
    }
    
    const validYt = youtubeChannels.filter(c => (c.channel_id || "").trim() !== "");
    const validIg = instagramAccounts.filter(c => (c.business_account_id || "").trim() !== "");
    
    if (youtubeChannels.length > 0 && validYt.length === 0) {
      isValid = false;
      newError = "Please enter a valid channel ID/Handle or remove the empty rows.";
    }

    if (!isValid) {
      setErrorMsg(newError);
      return;
    }
    
    setErrorMsg("");

    const ytChannelsString = JSON.stringify(validYt);
    const igAccountsString = JSON.stringify(validIg);
    const displayString = JSON.stringify(displayConfig);

    localStorage.setItem("f1_youtubeKey", youtubeKey);
    localStorage.setItem("f1_youtubeChannels", ytChannelsString);
    localStorage.setItem("f1_instagramKey", instagramKey);
    localStorage.setItem("f1_instagramAccounts", igAccountsString);
    localStorage.setItem("f1_displayConfig", displayString);
    localStorage.setItem("f1_geminiKey", geminiKey);

    // Apply theme immediately
    if (displayConfig?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    onSave({
      youtubeKey,
      youtubeChannels: validYt,
      instagramKey,
      instagramAccounts: validIg,
      display: displayConfig,
      geminiKey
    });
  };

  const handleDisconnectYouTube = () => {
    setYoutubeKey("");
    setYoutubeChannels([]);
    setErrorMsg("");
  };

  const handleDisconnectInstagram = () => {
    setInstagramKey("");
    setInstagramAccounts([]);
  };

  const addYouTubeChannel = () => {
    setYoutubeChannels([...(youtubeChannels || []), { channel_id: "", name: "" }]);
  };

  const updateYouTubeChannel = (index: number, field: keyof YouTubeChannelConfig, value: string) => {
    const newChannels = [...(youtubeChannels || [])];
    newChannels[index] = { ...newChannels[index], [field]: value };
    setYoutubeChannels(newChannels);
  };

  const removeYouTubeChannel = (index: number) => {
    setYoutubeChannels((youtubeChannels || []).filter((_, i) => i !== index));
  };

  const addInstagramAccount = () => {
    setInstagramAccounts([...(instagramAccounts || []), { handle: "", business_account_id: "" }]);
  };

  const updateInstagramAccount = (index: number, field: keyof InstagramAccountConfig, value: string) => {
    const newAccounts = [...(instagramAccounts || [])];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setInstagramAccounts(newAccounts);
  };

  const removeInstagramAccount = (index: number) => {
    setInstagramAccounts((instagramAccounts || []).filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-800 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-sm w-[95vw] sm:w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Settings className="w-4 h-4 text-[#00b300] dark:text-[#00ff00]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Connection Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* How-to Guide */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-sm overflow-hidden">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <HelpCircle className="w-4 h-4 text-[#00b300] dark:text-[#00ff00]" />
                <span className="text-xs font-bold uppercase tracking-widest">Configuration Guide</span>
              </div>
              {showGuide ? <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            </button>
            
            {showGuide && (
              <div className="p-4 space-y-4 text-xs font-mono text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-white/10">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase font-sans text-[10px] tracking-widest">YouTube API Setup</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-[#00b300] dark:text-[#00ff00] hover:underline">Google Cloud Console</a>.</li>
                    <li>Create a new project and enable the <strong>YouTube Data API v3</strong>.</li>
                    <li>Go to <strong>Credentials</strong>, click <strong>Create Credentials &gt; API Key</strong>.</li>
                    <li>To find your Channel ID: Go to your YouTube channel, right-click, select "View Page Source", and search for <code className="bg-white dark:bg-black/50 px-1 rounded text-gray-700 dark:text-gray-300">data-channel-external-id</code>.</li>
                  </ol>
                </div>
                <div className="space-y-2 border-t border-gray-200 dark:border-white/10 pt-4">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase font-sans text-[10px] tracking-widest">Instagram API Setup</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>You need an Instagram <strong>Business</strong> or <strong>Creator</strong> account linked to a Facebook Page.</li>
                    <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-[#ff0055] hover:underline">Meta for Developers</a> and create an app.</li>
                    <li>Add the <strong>Instagram Graph API</strong> product to your app.</li>
                    <li>Use the Graph API Explorer to generate a User Access Token with <code className="bg-white dark:bg-black/50 px-1 rounded text-gray-700 dark:text-gray-300">instagram_basic</code> and <code className="bg-white dark:bg-black/50 px-1 rounded text-gray-700 dark:text-gray-300">instagram_manage_insights</code> permissions.</li>
                    <li>To find your Business Account ID: Make a request to <code className="bg-white dark:bg-black/50 px-1 rounded text-gray-700 dark:text-gray-300">/me/accounts?fields=instagram_business_account</code>.</li>
                  </ol>
                </div>
                <div className="space-y-2 border-t border-gray-200 dark:border-white/10 pt-4">
                  <h4 className="font-bold text-gray-900 dark:text-white uppercase font-sans text-[10px] tracking-widest">Gemini API Setup (AI Insights)</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.</li>
                    <li>Click <strong>Create API key</strong>.</li>
                    <li>Copy the generated key and paste it in the Gemini API Connection section below.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Display Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
              <h3 className="text-[#00b300] dark:text-[#00ff00] font-mono text-sm uppercase tracking-wider font-bold">Display Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 tracking-widest">
                  <Monitor className="w-3 h-3" /> Theme Preference
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDisplayConfig({...displayConfig, theme: 'dark'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm border ${displayConfig?.theme === 'dark' ? 'bg-white dark:bg-white/10 border-gray-400 dark:border-white/20 text-gray-900 dark:text-white' : 'bg-transparent border-gray-200 dark:border-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Moon className="w-4 h-4" /> <span className="text-xs font-bold">Dark</span>
                  </button>
                  <button
                    onClick={() => setDisplayConfig({...displayConfig, theme: 'light'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm border ${displayConfig?.theme === 'light' ? 'bg-white dark:bg-white/10 border-gray-400 dark:border-white/20 text-gray-900 dark:text-white' : 'bg-transparent border-gray-200 dark:border-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Sun className="w-4 h-4" /> <span className="text-xs font-bold">Light</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 tracking-widest">
                  <Clock className="w-3 h-3" /> Default Time Range
                </label>
                <div className="flex gap-2">
                  {(['24h', '7d', '30d'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setDisplayConfig({...displayConfig, timeRange: range})}
                      className={`flex-1 flex items-center justify-center py-2 px-3 rounded-sm border ${displayConfig?.timeRange === range ? 'bg-white dark:bg-white/10 border-gray-400 dark:border-white/20 text-gray-900 dark:text-white' : 'bg-transparent border-gray-200 dark:border-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                      <span className="text-xs font-bold uppercase">{range}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 tracking-widest">
                <Hash className="w-3 h-3" /> Fetch Limit (Videos per channel)
              </label>
              <div className="flex gap-2">
                {([10, 50, 100] as const).map(limit => (
                  <button
                    key={limit}
                    onClick={() => setDisplayConfig({...displayConfig, videoLimit: limit})}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-sm border ${displayConfig?.videoLimit === limit ? 'bg-white dark:bg-white/10 border-gray-400 dark:border-white/20 text-gray-900 dark:text-white' : 'bg-transparent border-gray-200 dark:border-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <span className="text-xs font-bold">{limit} Videos</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* YouTube Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
              <h3 className="text-[#00b300] dark:text-[#00ff00] font-mono text-sm uppercase tracking-wider font-bold">YouTube API Connection</h3>
              {youtubeKey && (
                <button onClick={handleDisconnectYouTube} className="text-xs font-bold text-gray-500 hover:text-red-500 uppercase flex items-center gap-1 transition-colors">
                  <Unplug className="w-3 h-3" /> Disconnect
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-widest">API Key (Stored Locally)</label>
              <input
                type="password"
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-sm px-3 py-2 text-gray-900 dark:text-white font-mono text-sm focus:border-[#00b300] dark:border-[#00ff00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] focus-visible:ring-2 focus-visible:ring-[#00ff00] transition-all"
                value={youtubeKey}
                onChange={(e) => setYoutubeKey(e.target.value)}
                placeholder="AIzaSy..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2 mt-4">
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-widest">Tracked Channels</label>
                <button onClick={addYouTubeChannel} className="text-[10px] font-bold text-[#00b300] dark:text-[#00ff00] uppercase flex items-center gap-1 hover:opacity-80">
                  <Plus className="w-3 h-3" /> Add Channel
                </button>
              </div>
              {(!youtubeChannels || youtubeChannels.length === 0) ? (
                <div className="text-center p-4 border border-dashed border-gray-200 dark:border-white/10 rounded-sm text-gray-500 text-xs font-mono">
                  No channels configured. Add one to track its performance.
                </div>
              ) : (
                <div className="space-y-2">
                  {youtubeChannels.map((channel, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-white dark:bg-white/5 p-2 rounded-sm border border-gray-200 dark:border-white/10">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-gray-300 dark:border-white/20 px-2 py-1 text-gray-900 dark:text-white font-mono text-sm focus:border-[#00b300] dark:border-[#00ff00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] transition-all placeholder:text-gray-600"
                          value={channel?.name || ""}
                          onChange={(e) => updateYouTubeChannel(idx, "name", e.target.value)}
                          placeholder="Display Name (e.g., Main Channel)"
                        />
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-gray-300 dark:border-white/20 px-2 py-1 text-gray-900 dark:text-white font-mono text-sm focus:border-[#00b300] dark:border-[#00ff00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] transition-all placeholder:text-gray-600"
                          value={channel?.channel_id || ""}
                          onChange={(e) => updateYouTubeChannel(idx, "channel_id", e.target.value)}
                          placeholder="Channel URL, ID, or @handle"
                        />
                      </div>
                      <button onClick={() => removeYouTubeChannel(idx)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Instagram Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
              <h3 className="text-[#ff0055] font-mono text-sm uppercase tracking-wider font-bold">Instagram Graph API Connection</h3>
              {instagramKey && (
                <button onClick={handleDisconnectInstagram} className="text-xs font-bold text-gray-500 hover:text-red-500 uppercase flex items-center gap-1 transition-colors">
                  <Unplug className="w-3 h-3" /> Disconnect
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-widest">Access Token</label>
              <input
                type="password"
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-sm px-3 py-2 text-gray-900 dark:text-white font-mono text-sm focus:border-[#ff0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0055] focus-visible:ring-2 focus-visible:ring-[#ff0055] transition-all"
                value={instagramKey}
                onChange={(e) => setInstagramKey(e.target.value)}
                placeholder="EAABsbCS1..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2 mt-4">
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-widest">Tracked Accounts</label>
                <button onClick={addInstagramAccount} className="text-[10px] font-bold text-[#ff0055] uppercase flex items-center gap-1 hover:opacity-80">
                  <Plus className="w-3 h-3" /> Add Account
                </button>
              </div>
              {(!instagramAccounts || instagramAccounts.length === 0) ? (
                <div className="text-center p-4 border border-dashed border-gray-200 dark:border-white/10 rounded-sm text-gray-500 text-xs font-mono">
                  No accounts configured. Add one to track its performance.
                </div>
              ) : (
                <div className="space-y-2">
                  {instagramAccounts.map((account, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-white dark:bg-white/5 p-2 rounded-sm border border-gray-200 dark:border-white/10">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-gray-300 dark:border-white/20 px-2 py-1 text-gray-900 dark:text-white font-mono text-sm focus:border-[#ff0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0055] transition-all placeholder:text-gray-600"
                          value={account?.handle || ""}
                          onChange={(e) => updateInstagramAccount(idx, "handle", e.target.value)}
                          placeholder="Handle (e.g., @your.ig)"
                        />
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-gray-300 dark:border-white/20 px-2 py-1 text-gray-900 dark:text-white font-mono text-sm focus:border-[#ff0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0055] transition-all placeholder:text-gray-600"
                          value={account?.business_account_id || ""}
                          onChange={(e) => updateInstagramAccount(idx, "business_account_id", e.target.value)}
                          placeholder="Business Account ID (e.g., 12345)"
                        />
                      </div>
                      <button onClick={() => removeInstagramAccount(idx)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Gemini API Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
              <h3 className="text-blue-500 font-mono text-sm uppercase tracking-wider font-bold">Gemini API Connection (AI Insights)</h3>
              {geminiKey && (
                <button onClick={() => setGeminiKey("")} className="text-xs font-bold text-gray-500 hover:text-red-500 uppercase flex items-center gap-1 transition-colors">
                  <Unplug className="w-3 h-3" /> Disconnect
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-widest">API Key (Stored Locally)</label>
              <input
                type="password"
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-sm px-3 py-2 text-gray-900 dark:text-white font-mono text-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <p className="text-[10px] text-gray-500 mt-2 font-mono">Leave blank to use the server's default environment key.</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="px-6 py-3 bg-[#ff0000]/10 border-t border-[#ff0000]/30 text-[#ff0000] text-xs font-bold font-mono">
            ⚠ {errorMsg}
          </div>
        )}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Save className="w-3 h-3" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
