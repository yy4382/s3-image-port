"use client";

import { ProfilesDiff, ProfileChanges } from "../sync-service";
import {
  CheckCircleIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  AlertCircleIcon,
} from "lucide-react";

interface ProfileDiffProps {
  diff: ProfilesDiff;
}

export function ProfileDiff({ diff }: ProfileDiffProps) {
  if (!diff.hasChanges) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-200">
        <CheckCircleIcon className="size-5 shrink-0" />
        <span>
          No changes detected. Local and remote profiles are identical.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <div className="font-medium mb-2">Changes Summary:</div>
        <ul className="space-y-1 text-muted-foreground">
          {diff.added.length > 0 && (
            <li className="flex items-center gap-2">
              <PlusCircleIcon className="size-4 text-green-600" />
              <span>{diff.added.length} profile(s) will be added</span>
            </li>
          )}
          {diff.removed.length > 0 && (
            <li className="flex items-center gap-2">
              <MinusCircleIcon className="size-4 text-red-600" />
              <span>{diff.removed.length} profile(s) will be removed</span>
            </li>
          )}
          {diff.modified.length > 0 && (
            <li className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 text-amber-600" />
              <span>{diff.modified.length} profile(s) will be modified</span>
            </li>
          )}
          {diff.currentIndexChanged && (
            <li className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 text-blue-600" />
              <span>
                Active profile will change (index {diff.localCurrentIndex} →{" "}
                {diff.remoteCurrentIndex})
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Added Profiles */}
      {diff.added.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <PlusCircleIcon className="size-4 text-green-600" />
            Added Profiles
          </h4>
          <div className="space-y-2 pl-6">
            {diff.added.map(([name]) => (
              <div
                key={name}
                className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-200"
              >
                + <span className="font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Profiles */}
      {diff.removed.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <MinusCircleIcon className="size-4 text-red-600" />
            Removed Profiles
          </h4>
          <div className="space-y-2 pl-6">
            {diff.removed.map(([name]) => (
              <div
                key={name}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200"
              >
                - <span className="font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modified Profiles */}
      {diff.modified.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <AlertCircleIcon className="size-4 text-amber-600" />
            Modified Profiles
          </h4>
          <div className="space-y-3 pl-6">
            {diff.modified.map((mod) => (
              <div
                key={mod.name}
                className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/20"
              >
                <div className="font-medium text-amber-900 dark:text-amber-100">
                  ~ {mod.name}
                </div>
                <ChangesList changes={mod.changes} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangesList({ changes }: { changes: ProfileChanges }) {
  return (
    <div className="space-y-2 text-amber-800 dark:text-amber-200">
      {changes.s3 && (
        <div>
          <div className="font-medium mb-1">S3 Settings:</div>
          <div className="space-y-1 pl-4 text-xs">
            {Object.entries(changes.s3).map(([key, change]) => (
              <div key={key} className="font-mono">
                <span className="text-muted-foreground">{key}:</span>{" "}
                <span className="line-through opacity-60">
                  {String(change.from)}
                </span>{" "}
                → <span className="font-semibold">{String(change.to)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.upload && (
        <div>
          <div className="font-medium mb-1">Upload Settings:</div>
          <div className="space-y-1 pl-4 text-xs">
            {Object.entries(changes.upload).map(([key, change]) => (
              <div key={key} className="font-mono">
                <span className="text-muted-foreground">{key}:</span>{" "}
                {key === "keyTemplatePresets" ? (
                  <>
                    <span className="line-through opacity-60">
                      {Array.isArray(change.from) ? change.from.length : 0}{" "}
                      preset(s)
                    </span>{" "}
                    →{" "}
                    <span className="font-semibold">
                      {Array.isArray(change.to) ? change.to.length : 0}{" "}
                      preset(s)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="line-through opacity-60">
                      {JSON.stringify(change.from)}
                    </span>{" "}
                    →{" "}
                    <span className="font-semibold">
                      {JSON.stringify(change.to)}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.gallery && (
        <div>
          <div className="font-medium mb-1">Gallery Settings:</div>
          <div className="space-y-1 pl-4 text-xs">
            {Object.entries(changes.gallery).map(([key, change]) => (
              <div key={key} className="font-mono">
                <span className="text-muted-foreground">{key}:</span>{" "}
                <span className="line-through opacity-60">
                  {String(change.from)}
                </span>{" "}
                → <span className="font-semibold">{String(change.to)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
