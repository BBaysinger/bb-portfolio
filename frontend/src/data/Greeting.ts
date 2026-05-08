import { resolveBackendBase } from "@/utils/backend-base";

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
  if (!payload || typeof payload !== "object") {
    throw new Error("Greeting response was not an object.");
  }

  const response = payload as GreetingApiResponse;
  if (!response.success || !response.data) {
    throw new Error("Greeting response did not include data.");
  }

  const introHtml =
    typeof response.data.introHtml === "string" &&
    response.data.introHtml.trim()
      ? response.data.introHtml.trim()
      : (() => {
          throw new Error("Greeting response missing introHtml.");
        })();
  const bodyHtml =
    typeof response.data.bodyHtml === "string" && response.data.bodyHtml.trim()
      ? response.data.bodyHtml.trim()
      : (() => {
          throw new Error("Greeting response missing bodyHtml.");
        })();

  return {
    introHtml,
    bodyHtml,
  };
};

export const getServerGreeting = async (): Promise<ServerGreeting> => {
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
