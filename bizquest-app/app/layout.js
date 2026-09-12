import "./globals.css";

export const metadata = {
  title: "BizQuest — IB Business Management",
  description: "IB DP Business Management Self Study",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
