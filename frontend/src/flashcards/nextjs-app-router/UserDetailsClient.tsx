"use client";

import { useParams } from "next/navigation";
import * as React from "react";

type User = {
  id: string;
  name: string;
  email?: string;
};

export function UserDetailsClient(): JSX.Element {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    const abortController = new AbortController();

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          signal: abortController.signal,
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        }

        const data: User = await res.json();
        setUser(data);
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setUser(null);
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      abortController.abort();
    };
  }, [userId]);

  if (!userId) return <div>Missing route param: userId</div>;
  if (isLoading) return <div>Loading user…</div>;
  if (error) return <div role="alert">Error: {error}</div>;
  if (!user) return <div>No user loaded.</div>;

  return (
    <section>
      <h1>{user.name}</h1>
      <p>User ID: {user.id}</p>
    </section>
  );
}
