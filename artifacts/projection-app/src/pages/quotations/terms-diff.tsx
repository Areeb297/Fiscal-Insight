export type DiffPart = { type: "eq" | "add" | "del"; text: string };

export function diffLines(a: string, b: string): DiffPart[] {
  const A = a.split("\n");
  const B = b.split("\n");
  const m = A.length;
  const n = B.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (A[i] === B[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      out.push({ type: "eq", text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: A[i] });
      i++;
    } else {
      out.push({ type: "add", text: B[j] });
      j++;
    }
  }
  while (i < m) out.push({ type: "del", text: A[i++] });
  while (j < n) out.push({ type: "add", text: B[j++] });
  return out;
}

export function diffSummary(parts: DiffPart[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const p of parts) {
    if (p.type === "add") added++;
    else if (p.type === "del") removed++;
  }
  return { added, removed };
}

export function TermsDiffView({
  defaultText,
  customText,
  className,
}: {
  defaultText: string;
  customText: string;
  className?: string;
}) {
  const parts = diffLines(defaultText, customText);
  if (parts.length === 0) {
    return (
      <div className={className}>
        <p className="text-xs text-muted-foreground italic">No content.</p>
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="font-mono text-[11px] leading-relaxed">
        {parts.map((p, idx) => {
          const isBlank = p.text.length === 0;
          if (p.type === "eq") {
            return (
              <div key={idx} className="flex gap-2">
                <span className="select-none w-3 text-muted-foreground/60">
                  &nbsp;
                </span>
                <span className="whitespace-pre-wrap break-words flex-1 text-foreground/80">
                  {isBlank ? "\u00A0" : p.text}
                </span>
              </div>
            );
          }
          if (p.type === "add") {
            return (
              <div
                key={idx}
                className="flex gap-2 bg-green-100/70 dark:bg-green-900/30"
              >
                <span className="select-none w-3 text-green-700 dark:text-green-400 font-semibold">
                  +
                </span>
                <span className="whitespace-pre-wrap break-words flex-1 text-green-900 dark:text-green-200">
                  {isBlank ? "\u00A0" : p.text}
                </span>
              </div>
            );
          }
          return (
            <div
              key={idx}
              className="flex gap-2 bg-red-100/70 dark:bg-red-900/30"
            >
              <span className="select-none w-3 text-red-700 dark:text-red-400 font-semibold">
                −
              </span>
              <span className="whitespace-pre-wrap break-words flex-1 text-red-900 dark:text-red-200 line-through decoration-red-500/60">
                {isBlank ? "\u00A0" : p.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
