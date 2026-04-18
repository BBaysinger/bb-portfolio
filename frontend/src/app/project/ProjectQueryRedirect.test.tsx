import { render, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectQueryRedirect from "./ProjectQueryRedirect";

const { replaceMock, getQueryParam, setQueryParam } = vi.hoisted(() => {
  const replaceMock = vi.fn();
  let currentP = "";

  return {
    replaceMock,
    setQueryParam: (value: string) => {
      currentP = value;
    },
    getQueryParam: () => currentP,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({
    get: (key: string) => (key === "p" ? getQueryParam() : null),
  }),
}));

describe("ProjectQueryRedirect", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    setQueryParam("");
  });

  it("redirects valid query slugs to canonical project routes", async () => {
    setQueryParam("exact-sciences-website");

    render(React.createElement(ProjectQueryRedirect));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/project/exact-sciences-website/",
      );
    });
  });

  it("trims trailing slashes before redirecting", async () => {
    setQueryParam("portfolio///");

    render(React.createElement(ProjectQueryRedirect));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/project/portfolio/");
    });
  });

  it("does not redirect for invalid slug values", async () => {
    setQueryParam("../bad");

    render(React.createElement(ProjectQueryRedirect));

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });
});
