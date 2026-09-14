"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap">
      <div className="panel">
        <h1>We couldn’t load this part of Paris Pulse.</h1>
        <p>
          Your saved information hasn’t been changed. Try again, or check the
          original sources for time-sensitive details.
        </p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
