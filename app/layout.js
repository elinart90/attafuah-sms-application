import "./globals.css";

export const metadata = {
  title: "ATTAFUAH PTA USMS",
  description: "Send SMS via USMS Ghana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
