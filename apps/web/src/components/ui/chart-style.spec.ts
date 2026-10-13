import { describe, expect, it } from "vitest";

import { chartCssText, type ChartConfig } from "./chart";

describe("chartCssText", () => {
  it("keeps theme variables and drops CSS breakout", () => {
    const config = {
      open: { color: "var(--chart-open)" },
      "a}b": { color: "var(--chart-1)" },
      closed: { color: "red;}</style><script>" },
    } satisfies ChartConfig;

    const css = chartCssText("chart-1", config);

    expect(css).toContain("--color-open: var(--chart-open);");
    expect(css).not.toContain("</style>");
    expect(css).not.toContain("--color-a");
  });
});
