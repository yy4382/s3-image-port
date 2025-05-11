import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PropsWithChildren } from "react";

export default function SettingsLayout({ children }: PropsWithChildren) {
  return (
    <Card className="max-w-4xl w-full mx-auto h-fit">
      <CardContent className="grid grid-cols-[auto_1fr] gap-4">
        <div className="flex flex-col gap-4 min-w-48">
          <h1 className="text-2xl font-bold ml-2">Settings</h1>
          <SettingPageSwitcher />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SettingPageSwitcher() {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/settings/profile"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        Profiles
      </Link>
      <Link
        href="/settings/s3"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        S3
      </Link>
      <Link
        href="/settings/upload"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        Upload{" "}
      </Link>
    </div>
  );
}
