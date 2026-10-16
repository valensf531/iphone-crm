import * as React from "react";
import { cn } from "@/lib/utils";

const Table = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableElement> & { ref?: React.Ref<HTMLTableElement> }) => (
  <div className="relative w-full overflow-auto overscroll-x-contain rounded-xl">
    <table ref={ref} className={cn("w-full caption-bottom text-sm tabular-nums", className)} {...props} />
  </div>
);
Table.displayName = "Table";

const TableHeader = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) => (
  <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
);
TableHeader.displayName = "TableHeader";

const TableBody = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);
TableBody.displayName = "TableBody";

const TableRow = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { ref?: React.Ref<HTMLTableRowElement> }) => (
  <tr ref={ref} className={cn("border-b border-border transition-colors hover:bg-accent/60 data-[state=selected]:bg-accent", className)} {...props} />
);
TableRow.displayName = "TableRow";

const TableHead = ({ className, ref, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { ref?: React.Ref<HTMLTableCellElement> }) => (
  <th ref={ref} className={cn("h-11 px-4 text-left align-middle text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground", className)} {...props} />
);
TableHead.displayName = "TableHead";

const TableCell = ({ className, ref, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { ref?: React.Ref<HTMLTableCellElement> }) => (
  <td ref={ref} className={cn("min-w-0 p-4 align-middle", className)} {...props} />
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
