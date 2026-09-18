"use client";

import { useEffect, useState } from "react";
import { readAuthorName, writeAuthorName } from "@/lib/author";

/** Header field holding the name attached to new comments and questions. */
export function AuthorNameField() {
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setName(readAuthorName());
    setMounted(true);
  }, []);

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="hidden sm:inline">You are</span>
      <input
        value={mounted ? name : ""}
        onChange={(event) => {
          setName(event.target.value);
          writeAuthorName(event.target.value);
        }}
        placeholder="your name"
        className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}
