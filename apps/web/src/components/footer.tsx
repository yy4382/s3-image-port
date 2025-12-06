import { Separator } from "./ui/separator";

export function Footer() {
  return (
    <div className="container text-muted-foreground mb-8 flex flex-col gap-4 text-sm">
      <Separator />
      <div className="flex justify-between items-center">
        <div>© {new Date().getFullYear()} S3 Image Port</div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/yy4382/s3-image-port"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors duration-300"
          >
            GitHub
          </a>
          <a
            href="https://yfi.moe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors duration-300"
          >
            Author
          </a>
        </div>
      </div>
    </div>
  );
}
