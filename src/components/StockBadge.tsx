import type { StockStatus } from "@prisma/client";
import { STOCK_LABELS, STOCK_STYLES } from "@/lib/labels";

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STOCK_STYLES[status]}`}>
      {STOCK_LABELS[status]}
    </span>
  );
}
