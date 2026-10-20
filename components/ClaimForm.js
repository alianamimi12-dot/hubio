"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimForm({ host }) {
  const router = useRouter();
  const [u, setU] = useState("");
  const go = (e) => { e.preventDefault(); router.push("/register" + (u ? `?u=${encodeURIComponent(u)}` : "")); };
  return (
    <form className="lp-claim" onSubmit={go}>
      <span>{host}/</span>
      <input aria-label="Username tokomu" placeholder="namamu" value={u} maxLength={30} autoCapitalize="none" autoCorrect="off" onChange={(e) => setU(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} />
      <button className="btn btn-primary">Klaim Gratis</button>
    </form>
  );
}
