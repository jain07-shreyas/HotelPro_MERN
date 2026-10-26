export const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '');
export const apiError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message ||
  (err?.request ? 'Could not reach the server. Make sure it is running (http://localhost:5000/api/v1/health).' : fallback);
export const label = (s) => String(s || '').replace(/_/g, ' ');
