"use client";

import { useState, useEffect } from "react";
import { Plus, Check, X } from "lucide-react";
import { getUserTags, addUserTag } from "@/utils/tagUtils";

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  userId: string;
}

export function TagSelector({ selectedTags, onChange, userId }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    if (userId) {
      setAllTags(getUserTags(userId));
    }
  }, [userId]);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagInput.trim();
    if (!cleanTag) return;

    const updatedTags = addUserTag(userId, cleanTag);
    setAllTags(updatedTags);
    
    // Auto-select the newly added tag
    if (!selectedTags.includes(cleanTag)) {
      onChange([...selectedTags, cleanTag]);
    }

    setNewTagInput("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">
        Tag Transaksi
      </label>
      
      <div className="flex flex-wrap gap-2 items-center">
        {/* Render Existing Tags */}
        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggleTag(tag)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border select-none ${
                isSelected
                  ? "bg-dashboard-blue text-white border-dashboard-blue shadow-sm shadow-blue-500/10"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              {isSelected && <Check className="h-3 w-3" />}
              <span>{tag}</span>
            </button>
          );
        })}

        {/* Add New Tag Mode */}
        {isAdding ? (
          <form
            onSubmit={handleAddNewTag}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 animate-in fade-in slide-in-from-left-2 duration-150"
          >
            <input
              type="text"
              placeholder="Nama tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              autoFocus
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none px-2 py-1 w-24 placeholder:text-slate-350"
            />
            <button
              type="submit"
              className="p-1 bg-dashboard-blue text-white rounded-lg hover:bg-blue-700 transition-colors border-none cursor-pointer flex items-center justify-center"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setNewTagInput("");
                setIsAdding(false);
              }}
              className="p-1 bg-slate-250 text-slate-500 hover:bg-slate-300 rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-dashboard-blue text-dashboard-blue rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah Tag</span>
          </button>
        )}
      </div>
    </div>
  );
}
