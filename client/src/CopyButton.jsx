import { useState } from 'react';

export default function CopyButton({ text, label = 'Copy', primary = false }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // Clipboard access can be blocked. The text is still selectable by hand.
    }
  }

  return (
    <button className={primary ? 'btn primary' : 'btn ghost'} onClick={copy}>
      {done ? 'Copied ✓' : label}
    </button>
  );
}
