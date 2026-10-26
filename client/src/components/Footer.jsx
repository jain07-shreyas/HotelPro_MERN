export default function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        © {new Date().getFullYear()} HotelPro. All rights reserved.
      </div>
    </footer>
  );
}
