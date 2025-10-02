import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const MessageSkeleton = () => (
  <div className="space-y-4 p-6">
    {[1, 2].map((i) => (
      <div key={i} className={`flex w-full ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    ))}
  </div>
);

export const ConversationSkeleton = () => (
  <div className="space-y-2 p-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 w-4" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SettingsSkeleton = () => (
  <div className="space-y-6">
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  </div>
);
