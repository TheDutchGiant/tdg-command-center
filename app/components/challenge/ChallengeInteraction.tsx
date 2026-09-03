"use client";

import { useState } from "react";
import RandomArmyChallenge from "@/app/components/challenge/RandomArmyChallenge";
import ChallengeSubmitForm from "@/app/components/challenge/ChallengeSubmitForm";

type CatalogItem = {
  name: string;
  slug: string;
  iconPath: string | null;
  isSuperTroop: boolean;
};

type ArmyItem = {
  id: string;
  name: string;
  quantity?: number;
};

type ArmyHero = {
  id: string;
  name: string;
  equipment?: {
    id: string;
    name: string;
  }[];
};

type Army = {
  townHall: number;
  troops?: ArmyItem[];
  spells?: ArmyItem[];
  siegeMachine?: ArmyItem | null;
  heroes?: ArmyHero[];
  pets?: ArmyItem[];
};

type Variant = {
  id: number;
  difficulty: string;
  mutatedPercent: number;
  originalArmy: Army | null;
  army: unknown;
  armyShareCode: string | null;
  sourceArmyId: number;
  sourceArmyName: string;
};

type Props = {
  challengeId: number;
  title: string;
  townHall: number;
  generationAt: string;
  endsAt: string;
  variants: Variant[];
  catalog: CatalogItem[];
};

export default function ChallengeInteraction({
  challengeId,
  title,
  townHall,
  generationAt,
  endsAt,
  variants,
  catalog,
}: Props) {
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<string | null>(null);

  return (
    <>
      <div className="min-w-0 lg:col-start-3 lg:row-start-1">
        <RandomArmyChallenge
          challengeId={challengeId}
          title={title}
          townHall={townHall}
          generationAt={generationAt}
          endsAt={endsAt}
          variants={variants}
          catalog={catalog}
          onDifficultyChange={setSelectedDifficulty}
        />
      </div>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5 lg:col-start-3 lg:row-start-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
              Challenge
            </p>

            <h2 className="mt-1 text-lg font-black">
              📸 Meedoen
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">
              Doe de challenge met exact deze
              army en deze base. Bekijk daarna
              de replay en open de chat zodra de
              aanval daadwerkelijk begint. Maak
              op dat moment één screenshot en
              upload die hieronder.
            </p>

            {selectedDifficulty ? (
              <ChallengeSubmitForm
                challengeId={challengeId}
                difficulty={selectedDifficulty}
              />
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-center">
                <p className="text-sm font-bold text-white/40">
                  Kies eerst een moeilijkheid hierboven.
                </p>
                <p className="mt-1 text-[10px] text-white/25">
                  Daarna kun je jouw screenshot indienen.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
