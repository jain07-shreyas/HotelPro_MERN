import axiosClient from '../api/axiosClient';

// Fetches the PDF with the login cookie and saves it as a file.
export default async function downloadInvoice(bookingId) {
  const res = await axiosClient.get(`/invoices/${bookingId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${bookingId.slice(-8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
