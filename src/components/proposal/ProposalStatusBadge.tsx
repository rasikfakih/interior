"use client";

import { useEffect, useState } from "react";

/**
 * Top-bar status pill for the public proposal page. The initial value
 * comes from the server render (sent / viewed / approved); a
 * "proposal-accepted" window event from ProposalAccept flips it to
 * Approved without a reload.
 */
export default function ProposalStatusBadge({ initial }: { initial: string }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const onAccept = () => setStatus("approved");
    window.addEventListener("proposal-accepted", onAccept);
    return () => window.removeEventListener("proposal-accepted", onAccept);
  }, []);

  const label =
    status === "approved"
      ? "Approved"
      : status === "viewed"
        ? "Viewed"
        : "Proposal";

  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56605a]">
      {label}
    </span>
  );
}
