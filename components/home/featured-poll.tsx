"use client"

import type { PublicPoll } from "@/lib/polls"
import { PollVoting, useVotedPolls } from "@/components/surveys/poll-voting"

/**
 * Widżet głosowania w wyróżnionej ankiecie na stronie głównej. Korzysta z tego
 * samego komponentu i pamięci lokalnej co /ankiety — głos oddany tutaj jest
 * pamiętany również na podstronie ankiet (i odwrotnie).
 */
export function FeaturedPoll({ poll }: { poll: PublicPoll }) {
  const { votedPolls, persistVoted } = useVotedPolls()
  return (
    <PollVoting
      poll={poll}
      hasVoted={votedPolls.includes(poll.id)}
      onVoted={() => persistVoted(poll.id)}
    />
  )
}
