import React from "react";
import { AlertTriangle, ArrowRight, CircleHelp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Source } from "@/types";
import { contentFreshness } from "@/lib/site";

type CoverageStatusProps = {
  sources: Source[];
  demo?: boolean;
};

function sourceCount(count: number) {
  return `${count} active source${count === 1 ? "" : "s"}`;
}

export function CoverageStatus({
  sources,
  demo = false,
}: CoverageStatusProps) {
  if (demo) {
    return (
      <aside
        className="coverage-status coverage-status-sample"
        aria-label="Source coverage"
      >
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Sample preview</strong>
          <p>
            This preview is not live information and does not count toward
            production coverage.
          </p>
        </div>
        <Link href="/sources" className="coverage-status-action">
          Review source coverage <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </aside>
    );
  }

  const freshness = contentFreshness(sources);
  const activeSources = sources.filter((source) => source.active).length;
  const missingChecks = Math.max(0, activeSources - freshness.checkedSources);
  const content =
    freshness.state === "current" ? (
      <>
        <strong>Source checks are within schedule</strong>
        <p>{sourceCount(freshness.checkedSources)} checked within schedule.</p>
      </>
    ) : freshness.state === "attention" && missingChecks > 0 ? (
      <>
        <strong>Source check history is incomplete</strong>
        <p>
          {missingChecks} active source
          {missingChecks === 1 ? " has" : "s have"} no recorded check. Updates
          may be incomplete.
        </p>
      </>
    ) : freshness.state === "attention" ? (
      <>
        <strong>Source coverage needs attention</strong>
        <p>
          {freshness.staleSources} active source
          {freshness.staleSources === 1 ? " is" : "s are"} overdue. Some
          updates may be incomplete.
        </p>
      </>
    ) : (
      <>
        <strong>Source coverage is unknown</strong>
        <p>
          No active source checks are available. Verify important details with
          the original source.
        </p>
      </>
    );

  return (
    <aside
      className={`coverage-status coverage-status-${freshness.state}`}
      aria-label="Source coverage"
      data-active-sources={activeSources}
    >
      {freshness.state === "attention" ? (
        <AlertTriangle size={20} aria-hidden="true" />
      ) : freshness.state === "unknown" ? (
        <CircleHelp size={20} aria-hidden="true" />
      ) : (
        <ShieldCheck size={20} aria-hidden="true" />
      )}
      <div>{content}</div>
      <Link href="/sources" className="coverage-status-action">
        Review source coverage <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </aside>
  );
}
