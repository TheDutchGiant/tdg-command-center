"use client";

import { useEffect, useMemo, useState } from "react";

function getNextCwlStart() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );
}

function formatCountdown(ms: number) {
  if (ms <= 0) {
    return "Begint vandaag";
  }

  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  if (days > 0) {
    return `${days} dag${days === 1 ? "" : "en"} · ${hours} uur`;
  }

  if (hours > 0) {
    return `${hours} uur · ${minutes} min`;
  }

  return `${minutes} min`;
}

export default function CwlCountdown() {
  const target = useMemo(
    () => getNextCwlStart(),
    []
  );

  const [remaining, setRemaining] =
    useState(
      target.getTime() -
        Date.now()
    );

  useEffect(() => {
    const update = () => {
      setRemaining(
        target.getTime() -
          Date.now()
      );
    };

    update();

    const interval = window.setInterval(
      update,
      30_000
    );

    return () =>
      window.clearInterval(
        interval
      );
  }, [target]);

  return (
    <>
      {formatCountdown(remaining)}
    </>
  );
}
