import { httpBatchStreamLink, httpLink } from "@repo/trpc/client";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

const getBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  return apiUrl.replace(/\/$/, "");
};

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const link = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return link({
    url: `${getBaseUrl()}/trpc`,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
