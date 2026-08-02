"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type PhoenixTitleProps = {
  text: string;
};

export default function PhoenixTitle({ text }: PhoenixTitleProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const letters = containerRef.current.querySelectorAll(".phoenix-letter");

    gsap.set(letters, {
      opacity: 0,
      y: 40,
      scale: 0.7,
      filter: "blur(15px)",
    });

    const tl = gsap.timeline();

    tl.to(letters, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      duration: 0.8,
      stagger: 0.04,
      ease: "power3.out",
    })

      .to(
        letters,
        {
          textShadow:
            "0 0 8px #ff6600, 0 0 16px #ff3300, 0 0 28px #ff0000",
          duration: 0.6,
          stagger: 0.02,
        },
        "-=0.4"
      )

      .to(letters, {
        color: "#ffd54a",
        textShadow:
          "0 0 10px #ffd54a, 0 0 20px #ffcc33, 0 0 40px #ffaa00",
        duration: 1.2,
      });
  }, []);

  return (
    <h1
      ref={containerRef}
      className="relative z-10 text-center text-5xl font-bold select-none"
    >
      {text.split("").map((letter, index) => (
        <span
          key={index}
          className="phoenix-letter inline-block"
        >
          {letter === " " ? "\u00A0" : letter}
        </span>
      ))}
    </h1>
  );
}