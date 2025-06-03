import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="w-full h-64" />
    </div>
  );
}
