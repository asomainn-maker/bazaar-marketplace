import { Suspense } from "react";
import WalletInner from "./wallet-client";

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <WalletInner />
    </Suspense>
  );
}
