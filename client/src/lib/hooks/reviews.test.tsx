/**
 * The PR list (["pulls", repoId]) must refresh when reviews change, so its FINDINGS /
 * SCORE / COST columns update without a reload.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../api", () => ({
  API_BASE: "http://api.test",
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ runs: [], reviews: [] }),
    del: vi.fn().mockResolvedValue({ ok: true }),
  },
}));
vi.mock("../toast", () => ({ notify: vi.fn() }));

import { useDeleteReview, useDeleteRun, useRunReview, useRunSettled } from "./reviews";

let qc: QueryClient;
let spy: { mock: { calls: unknown[][] } };
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);
const invalidatedKeys = () => spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  spy = vi.spyOn(qc, "invalidateQueries");
});

describe("pulls list invalidation", () => {
  it("run settle invalidates the ['pulls'] prefix (plus run/review keys)", () => {
    const { result } = renderHook(() => useRunSettled("pr-1"), { wrapper });
    act(() => result.current());
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([["pulls"], ["reviews", "pr-1"], ["pr-runs", "pr-1"], ["pr-active-runs", "pr-1"]]),
    );
  });

  it("useDeleteRun invalidates ['pulls']", async () => {
    const { result } = renderHook(() => useDeleteRun("pr-1"), { wrapper });
    act(() => result.current.mutate("run-1"));
    await waitFor(() => expect(invalidatedKeys()).toContainEqual(["pulls"]));
  });

  it("useDeleteReview invalidates ['pulls']", async () => {
    const { result } = renderHook(() => useDeleteReview("pr-1"), { wrapper });
    act(() => result.current.mutate("review-1"));
    await waitFor(() => expect(invalidatedKeys()).toContainEqual(["pulls"]));
  });

  it("useRunReview invalidates ['pulls']", async () => {
    const { result } = renderHook(() => useRunReview(), { wrapper });
    act(() => result.current.mutate({ prId: "pr-1", all: true }));
    await waitFor(() => expect(invalidatedKeys()).toContainEqual(["pulls"]));
  });

  it("the ['pulls'] prefix refreshes every repo's list but not PR detail", () => {
    qc.setQueryData(["pulls", "repo-1"], []);
    qc.setQueryData(["pull", "pr-1"], {});
    const { result } = renderHook(() => useRunSettled("pr-1"), { wrapper });
    act(() => result.current());
    expect(qc.getQueryState(["pulls", "repo-1"])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(["pull", "pr-1"])?.isInvalidated).toBe(false);
  });
});
