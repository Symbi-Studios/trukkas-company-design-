// A fixed exported page can load any backend ID without generating it at build time.
export function jobDetailHref(id) {
  return `/jobs/detail?jobId=${encodeURIComponent(id)}`;
}
