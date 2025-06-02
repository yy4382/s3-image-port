import { useContext, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { StepContext } from "./onboard-util";
import { atom, useAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";

// true is unknown (go to next step)
// false is to should guide
const s3ReadyAtom = atom<boolean>(true);

function S3GetReady() {
  const [s3Ready, setS3Ready] = useAtom(s3ReadyAtom);

  // reset to default value when component is mounted
  useEffect(() => {
    setS3Ready(true);
  }, [setS3Ready]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Getting your S3 bucket ready
      </h2>
      {s3Ready === true ? (
        <p className="text-balance font-bold text-lg -mb-4">
          Have you already prepared a S3 or S3 compatible bucket?
        </p>
      ) : (
        <div className="prose dark:prose-invert">
          <p>
            Choose one S3-like service provider and add a new <b>public</b>{" "}
            bucket.
          </p>
          <p>Here are some popular choices:</p>
          <ul>
            <li>AWS S3, the original S3 service from Amazon.</li>
            <li>
              Cloudflare R2, suitable for those who already uses Cloudflare.
            </li>
            <li>Backblaze B2, a cost-effective S3-like service.</li>
            <li>
              Tencent COS or Aliyun OSS, which has good connectivity in China.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function S3GetReadyAction() {
  const { nextStep } = useContext(StepContext);
  const [s3Ready, setS3Ready] = useAtom(s3ReadyAtom);
  return (
    <div className="flex gap-2">
      <AnimatePresence initial={false}>
        {s3Ready === true && (
          <Button
            variant="outline"
            onClick={() => {
              setS3Ready(false);
            }}
            asChild
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No
            </motion.button>
          </Button>
        )}
      </AnimatePresence>
      <Button onClick={nextStep} className="transition-[width] duration-500">
        {s3Ready === true ? "Yes, continue" : "Continue"}
      </Button>
    </div>
  );
}

export {
  S3GetReady as OnboardS3GetReady,
  S3GetReadyAction as OnboardS3GetReadyAction,
};
