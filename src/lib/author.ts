"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "requirements.authorName";
const EVENT = "requirements:author-changed";

export function readAuthorName() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeAuthorName(name: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Private browsing or blocked storage -- the name simply will not persist.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * The single-user stand-in for an account. Swapping this hook for a session
 * lookup is the whole change needed to move to real authentication.
 */
export function useAuthorName() {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(readAuthorName());
    const sync = () => setName(readAuthorName());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return name;
}
