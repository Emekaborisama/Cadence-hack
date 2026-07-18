import type { ReactNode } from "react";

// Phone bezel wrapper so the patient surface reads as a real mobile device,
// with a quiet status bar over warm paper.
export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="rounded-[2.75rem] border border-[#2a2a2a] bg-[#111] p-[10px] shadow-[0_30px_60px_-20px_rgba(20,30,25,0.45)]">
        <div className="mono-canvas relative h-[780px] overflow-hidden rounded-[2.2rem]">
          {/* status bar — translucent glass so content scrolls beneath it */}
          <div className="glass-nav pointer-events-none absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-6 text-[13px] font-semibold text-ink">
            <span>9:41</span>
            <div className="absolute left-1/2 top-2 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1 text-ink/80">
              <span className="tracking-tight">5G</span>
              <span className="inline-block h-3 w-6 rounded-[3px] border border-ink/40 p-[1.5px]">
                <span className="block h-full w-3/4 rounded-[1px] bg-ink/80" />
              </span>
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 top-11">{children}</div>
        </div>
      </div>
    </div>
  );
}
