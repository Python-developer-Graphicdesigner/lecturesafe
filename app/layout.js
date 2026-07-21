import "./globals.css";

export const metadata = {
  title: "LectureSafe — Never Lose a Lecture Again",
  description:
    "Save your lecture notes offline so power cuts and slow internet never make you lose your work. AI turns your rough notes into clean summaries and quiz questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
