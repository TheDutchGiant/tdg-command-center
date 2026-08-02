"use client";

type PhoenixTitleProps = {
  text: string;
};

export default function PhoenixTitle({
  text,
}: PhoenixTitleProps) {
  return (
    <h1 className="phoenix-title relative z-10 text-center text-5xl font-bold text-yellow-300">
      {text}
    </h1>
  );
}