import { resolveBackendBase } from "@/utils/backend-base";

import {
  requireResponseData,
  requireTrimmedString,
} from "./responseValidation";
import { loadStaticContentSnapshot } from "./StaticContentSnapshot";

export type ServerGreeting = {
  introHtml: string;
  bodyHtml: string;
};

type GreetingApiResponse = {
  success?: boolean;
  data?: {
    introHtml?: unknown;
    bodyHtml?: unknown;
  };
};

const parseGreetingResponse = (payload: unknown): ServerGreeting => {
  const data = requireResponseData<GreetingApiResponse["data"]>(
    payload,
    "Greeting",
  );

  return {
    introHtml: requireTrimmedString(data?.introHtml, "introHtml"),
    bodyHtml: requireTrimmedString(data?.bodyHtml, "bodyHtml"),
  };
};

export const getServerGreeting = async (): Promise<ServerGreeting> => {
  const snapshot = await loadStaticContentSnapshot();
  if (snapshot?.greeting) {
    return parseGreetingResponse({ success: true, data: snapshot.greeting });
  }

  const backendUrl = resolveBackendBase();
  const response = await fetch(`${backendUrl}/api/greeting/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(
      `Greeting fetch failed with status ${response.status} from ${backendUrl}/api/greeting/.`,
    );
  }

  return parseGreetingResponse(await response.json());
};
