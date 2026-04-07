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
  category: string;
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
  const [newCategory, setNewCategory] = useState("general");
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
    } catch (error) {
      toast.error("Failed to update channel");
    }
  };

  const handleSync = async (id: number) => {
    try {
      setSyncingId(id);
      const res = await telegramAdminAPI.syncChannel(id);
      toast.success(`Synced ${res.new_messages_count || 0} new messages`);
      fetchChannels();
    } catch (error) {
      toast.error("Failed to sync channel");
    } finally {
      setSyncingId(null);
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
        category: newCategory,
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
                      <Badge variant="neutral" className="text-[10px] px-1.5 py-0 uppercase">
                        {channel.category}
                      </Badge>
                      
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark-secondary rounded-xl border border-white/10 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Telegram Channel</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    @
                  </div>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="calcalist"
                    className="w-full bg-surface-dark border border-white/10 rounded-lg py-2 pl-8 pr-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Language</label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-400/50"
                >
                  <option value="he">Hebrew</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-400/50"
                >
                  <option value="general">General</option>
                  <option value="stocks">Stocks</option>
                  <option value="crypto">Crypto</option>
                  <option value="forex">Forex</option>
                  <option value="analysis">Analysis</option>
                </select>
              </div>
              
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !newUsername}
                  className="flex items-center gap-2 bg-brand-400 text-surface-dark px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors disabled:opacity-50"
                >
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
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
