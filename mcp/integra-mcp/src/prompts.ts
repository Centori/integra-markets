/**
 * MCP prompts — the "Hi Integra" surface.
 *
 * Tools answer questions someone already knows to ask. Nothing told a new user
 * what this connector can do: they had seven tool names, no worked examples,
 * and no idea that `brent` matches nothing while `oil` matches 60,000
 * documents. The first conversation was therefore usually a guess that returned
 * an empty 200, which reads exactly like a product with no data in it.
 *
 * Prompts are the MCP primitive for this. A client lists them and shows them as
 * pickable starting points, so "Hi Integra" becomes a real entry point rather
 * than something a user has to be told to type.
 *
 * They are static text on purpose. A prompt that called the API would need a
 * key before the user has pasted one, would add latency to a menu, and would
 * turn a discovery surface into something that can fail.
 */

export type IntegraPrompt = {
  name: string;
  title: string;
  description: string;
  /** Arguments the client may collect before expanding the prompt. */
  arguments?: { name: string; description: string; required?: boolean }[];
  /** Builds the user-visible message the model receives. */
  render: (args: Record<string, string>) => string;
};

const ORIENTATION = `You are being asked to introduce the Integra Markets connector.

Reply with a short, friendly orientation covering:

**What this is** — commodity news sentiment with the evidence attached. Every
score names the signal that produced it and quotes the words from the article,
so it can be checked rather than believed.

**What you can ask for**

| Ask | Tool it uses |
|---|---|
| "What's sentiment on wheat this week?" | \`get_sentiment\` |
| "Give me a full brief on copper." | \`market_brief\` |
| "What themes are forming in agriculture?" | \`find_emerging_narratives\` |
| "Where does the model disagree with the betting markets?" | \`compare_human_vs_ai\` |
| "Which markets have the widest divergence right now?" | \`screen_high_conviction_markets\` |
| "Chart daily gas sentiment for 30 days." | \`get_sentiment_history\` |
| "What can I actually ask about?" | \`list_commodities\` |

**Two things worth knowing up front**
- Ask by name, not by ticker. \`oil\`, \`gas\`, \`gold\`, \`copper\`, \`corn\`,
  \`wheat\` — \`brent\`, \`WTI\` and \`NG\` resolve to nothing and return an
  empty result that looks like missing data.
- Every figure carries a sample size. A score on three articles and a score on
  nine hundred are printed the same way; read the \`n\` before the number.

Then call \`list_commodities\` so the reply ends with what is actually available
right now, including how far back the archive reaches, and offer to run one of
the examples.

Keep it under 200 words before the tool call. Do not invent figures.`;

export const PROMPTS: IntegraPrompt[] = [
  {
    name: "hi_integra",
    title: "Hi Integra",
    description:
      "Start here. What this connector can do, what to ask for, and what is in the archive right now.",
    render: () => ORIENTATION,
  },
  {
    name: "morning_brief",
    title: "Morning brief",
    description:
      "A desk-style brief for one commodity: sentiment, what moved it, narratives and divergence.",
    arguments: [
      {
        name: "commodity",
        description: "Canonical name, e.g. oil, gas, copper, wheat. Not a ticker.",
        required: true,
      },
    ],
    render: (a) => `Produce a morning brief for **${a.commodity ?? "oil"}**.

Call \`market_brief\` first. Then write it as a desk note, not a data dump:

1. **The call** — one sentence. Direction and conviction.
2. **What moved it** — the named signals and the quoted phrases behind them,
   so a reader can check the claim against the headline.
3. **Narratives** — themes forming underneath the number.
4. **Divergence** — where the model disagrees with prediction-market odds, if it does.
5. **Confidence** — state the sample size plainly. If it rests on a handful of
   articles, lead with that rather than burying it.

Quote real headlines. Do not invent a price target, and do not give a figure the
tools did not return.`,
  },
  {
    name: "whats_changed",
    title: "What changed this week",
    description:
      "Compare recent sentiment against the prior period for one commodity and explain the shift with evidence.",
    arguments: [
      { name: "commodity", description: "Canonical name, e.g. copper.", required: true },
    ],
    render: (a) => `For **${a.commodity ?? "copper"}**, work out what changed and why.

Call \`get_sentiment_history\` over 30 days, and \`get_sentiment\` for the last
7 days. Then:

- Name the direction and size of the shift, using the momentum column.
- Identify the days that moved it, and quote the headlines from those days.
- Say whether the change is real or thin — a swing on two articles is noise, and
  the article counts are in the response.
- Flag any day where coverage dropped to near zero, because a score computed on
  one article will look like a move and is not one.

End with what would falsify the reading.`,
  },
  {
    name: "cross_asset",
    title: "Cross-asset read",
    description:
      "Classify the regime and trace the transmission chain from an energy shock through rates, FX and metals.",
    render: () => `Build a cross-asset read across the complex.

Call \`get_sentiment\` for the energy names (\`oil\`, \`gas\`), the metals
(\`gold\`, \`copper\`, \`silver\`) and the macro subjects (\`fed_rates\`,
\`inflation\`, \`usd_strength\`). \`list_commodities\` will show what else is
available — macro and geopolitical subjects are first-class here, not noise.

Then:

1. **Classify the regime.** Is energy rising because demand is strong, or because
   supply is threatened? The read-through inverts between the two, and that
   distinction governs everything below.
2. **Trace the chain.** For a supply shock the usual path is: supply threat →
   energy up → headline inflation up → rate expectations up → dollar up → gold
   and industrial metals down. Check each link against the actual scores rather
   than assuming it.
3. **Name where the chain breaks.** The interesting part is the link that is not
   behaving.
4. **Falsifiers.** What observation would overturn the classification?

Every claim carries its sample size. Say plainly which legs are well covered and
which rest on a handful of articles.`,
  },
  {
    name: "check_a_headline",
    title: "Check a headline",
    description:
      "Show how the engine reads a specific headline — which rule fires, on which words, and why.",
    arguments: [
      { name: "headline", description: "The headline to examine.", required: true },
      { name: "commodity", description: "Canonical commodity name.", required: false },
    ],
    render: (a) => `Explain how Integra would read this headline:

> ${a.headline ?? "(paste a headline)"}

${a.commodity ? `Commodity: **${a.commodity}**.\n\n` : ""}Use \`get_sentiment\` for the commodity and look for this headline among the
returned drivers. Then explain:

- Which named signal fires, and on which words. The engine works on phrases —
  "Stockpiles Hit Three-Year Low" is an inventory draw, not the word "low".
- Why that direction. An inventory build is bearish; a chokepoint disruption is
  bullish; a price-action verb governs the sentence it sits in.
- What would flip it.

If the headline is not in the returned set, say so rather than guessing at a
score for it.`,
  },
];

export const PROMPT_BY_NAME = new Map(PROMPTS.map((p) => [p.name, p]));
