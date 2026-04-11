"use client";

import React, { useState, useEffect } from "react";
import { telegramAdminAPI } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Check, X, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Channel {
  id: number;
  username: string;
  title: string | null;
  language: string;
  categories: string[];
  is_active: boolean;
  subscriber_count: number | null;
  subscriber_count_app: number;
  message_count: number;
  last_synced_at: string | null;
}

export default function TelegramSection() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newLanguage, setNewLanguage] = useState("he");
  const [newCategories, setNewCategories] = useState<string[]>(["general"]);
  const [isAdding, setIsAdding] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const data = await telegramAdminAPI.listChannels();
      setChannels(data);
    } catch (error) {
      toast.error("Failed to load Telegram channels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await telegramAdminAPI.updateChannel(id, { is_active: !currentActive });
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentActive } : c))
      );
      toast.success(currentActive ? "Channel deactivated" : "Channel activated");
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || error.message || "Failed to update channel";
      toast.error(`Failed to update channel: ${msg}`);
    }
  };

  const handleSync = async (id: number) => {
    try {
      setSyncingId(id);
      const res = await telegramAdminAPI.syncChannel(id);
      toast.success(`Synced ${res.new_messages ?? 0} new messages`);
      fetchChannels();
    } catch (error) {
      toast.error("Failed to sync channel");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (window.confirm(`Delete @${username} permanently? This removes all messages and subscriptions.`)) {
      try {
        await telegramAdminAPI.deleteChannel(id);
        setChannels((prev) => prev.filter((c) => c.id !== id));
        toast.success("Channel deleted successfully");
      } catch (error) {
        toast.error("Failed to delete channel");
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername) return;
    
    // Strip @ if present
    const cleanUsername = newUsername.startsWith("@") ? newUsername.substring(1) : newUsername;
    
    try {
      setIsAdding(true);
      await telegramAdminAPI.addChannel({
        username: cleanUsername,
        language: newLanguage,
        categories: newCategories,
      });
      toast.success("Channel added successfully");
      setShowAddModal(false);
      setNewUsername("");
      fetchChannels();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("Channel already exists");
      } else {
        toast.error("Failed to add channel (is the username correct?)");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Telegram Channels</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-400 text-surface-dark px-4 py-2 rounded-lg font-medium hover:bg-brand-500 transition-colors"
        >
          <Plus size={18} />
          Add Channel
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-dark-secondary rounded-xl border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-12 bg-surface-dark-secondary rounded-xl border border-white/5 border-dashed">
          <p className="text-gray-400">No channels configured</p>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => (
            <Card key={channel.id} className="overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Row 1: Titles & Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white">@{channel.username}</span>
                    {channel.title && <span className="text-gray-400 text-sm">{channel.title}</span>}
                    
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0 uppercase">
                        {channel.language === 'he' ? 'Hebrew' : 'English'}
                      </Badge>
                      {channel.categories?.map(cat => (
                        <Badge key={cat} variant="neutral" className="text-[10px] px-1.5 py-0 uppercase">
                          {cat}
                        </Badge>
                      ))}
                      
                      <button 
                        onClick={() => handleToggleActive(channel.id, channel.is_active)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                          channel.is_active 
                            ? 'bg-gain/10 text-gain border-gain/20 hover:bg-loss/10 hover:text-loss hover:border-loss/20' 
                            : 'bg-white/5 text-gray-500 border-white/10 hover:bg-gain/10 hover:text-gain hover:border-gain/20'
                        }`}
                      >
                        {channel.is_active ? '✅ Active' : '❌ Inactive'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Row 2: Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{channel.message_count.toLocaleString()} msgs</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{channel.subscriber_count_app.toLocaleString()} app subscribers</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>Last sync: {formatRelativeTime(channel.last_synced_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => handleSync(channel.id)}
                    disabled={syncingId !== null || !channel.is_active}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors border
                      ${!channel.is_active 
                        ? 'opacity-50 cursor-not-allowed bg-white/5 text-gray-500 border-white/5' 
                        : 'bg-brand-400/10 text-brand-400 hover:bg-brand-400/20 border-brand-400/20'
                      }
                    `}
                  >
                    {syncingId === channel.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Sync Now
                  </button>
                  
                  {/* Red Deactivate button for explicit manual turn-off */}
                  {channel.is_active && (
                     <button
                       onClick={() => handleToggleActive(channel.id, channel.is_active)}
                       className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-colors"
                     >
                       <X size={14} />
                       Deactivate
                     </button>
                  )}
                  
                  {!channel.is_active && (
                     <button
                       onClick={() => handleDelete(channel.id, channel.username)}
                       className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-colors"
                     >
                       <Trash2 size={14} />
                       Delete
                     </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-surface-dark/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark-secondary rounded-[24px] border border-surface-dark-border w-full max-w-md overflow-hidden transform transition-all shadow-2xl shadow-black max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Add Channel Source</h3>
                <p className="text-[13px] text-gray-400 mt-1.5">Integrate a new Telegram data stream into the ledger.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white p-1 ml-4 bg-white/5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="px-6 pb-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">Telegram @Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <div className="w-5 h-5 rounded-full bg-brand-400/20 text-brand-400 flex items-center justify-center text-[11px] font-black">
                      @
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="username_here"
                    className="w-full bg-surface-dark-tertiary border border-surface-dark-border rounded-xl py-3 pl-10 pr-4 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-brand-400/50 focus:ring-1 focus:ring-brand-400/50 transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-[1.5]">
                  <label className="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {['general', 'finance', 'stocks', 'crypto', 'forex', 'analysis'].map(cat => {
                      const isSelected = newCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected && newCategories.length > 1) {
                              setNewCategories(prev => prev.filter(c => c !== cat));
                            } else if (!isSelected) {
                              setNewCategories(prev => [...prev, cat]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors capitalize ${
                            isSelected 
                              ? 'bg-brand-400/10 text-brand-400 border-brand-400/50' 
                              : 'bg-surface-dark-tertiary text-gray-500 border-surface-dark-border hover:border-white/20 hover:text-gray-300'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2">Primary Language</label>
                  <div className="relative">
                    <select
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      className="w-full bg-surface-dark-tertiary border border-surface-dark-border rounded-xl py-3 px-4 text-[13px] text-white focus:outline-none focus:border-brand-400/50 focus:ring-1 focus:ring-brand-400/50 transition-all appearance-none font-medium cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="he">Hebrew</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-900/10 border border-brand-400/20 rounded-xl p-3 flex gap-3 text-[12px] leading-relaxed mt-2 items-start">
                <div className="shrink-0 w-4 h-4 rounded-full border border-brand-400/50 text-brand-400 flex items-center justify-center font-serif italic text-[10px] mt-0.5">
                  i
                </div>
                <p className="text-brand-200/70">
                  Ensure the channel is public. Private channels require an administrative invitation link to be processed by our crawlers.
                </p>
              </div>
              
              <div className="pt-4 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 text-[14px] font-bold text-gray-300 bg-[#1D2433] hover:bg-[#2A344A] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newUsername}
                  className="flex-1 flex justify-center items-center gap-2 bg-brand-400 text-[#0A0D14] px-4 py-3 rounded-xl text-[14px] font-bold hover:bg-brand-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                >
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : null}
                  Add Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
