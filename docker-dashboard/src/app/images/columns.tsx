"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removeImage } from "../actions/image";

export type Image = {
  Id: string;
  ShortId: string;
  Repository: string;
  Tag: string;
  Status: string;
  Created: number;
  Size: number;
  Containers: number;
};

export const columns: ColumnDef<Image>[] = [
  {
    accessorKey: "Repository",
    header: "Repository",
    filterFn: "equals",
  },
  {
    accessorKey: "Tag",
    header: "Tag",
  },
  {
    accessorKey: "ShortId",
    header: "Image ID",
  },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("Status") as string;
      return (
        <Badge
          variant="outline"
          className={
            status === "In Use"
              ? "border-emerald-500 text-emerald-500"
              : "border-slate-500 text-slate-500"
          }
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "Containers",
    header: "Containers",
  },
  {
    accessorKey: "Created",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const timestamp = row.getValue("Created") as number;
      return new Date(timestamp * 1000).toLocaleDateString();
    },
  },
  {
    accessorKey: "Size",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bytes = row.getValue("Size") as number;
      if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
      if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
      if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
      return `${bytes} B`;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const image = row.original;
      const isInUse = image.Status === "In Use";
      return (
        <Button
          variant="destructive"
          size="sm"
          disabled={isInUse}
          onClick={async () => {
            try {
              await removeImage(image.Id);
            } catch (error) {
              console.error("Failed to remove image:", error);
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    },
  },
];
