import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isLocalAuthBypassed } from "@/lib/local-auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shelf Nest - scan, organize, and shelve your books",
  description:
    "Turn your phone into a barcode scanner and your book collection into a beautifully organized, searchable library, then plan your real shelves.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shelf Nest",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (isLocalAuthBypassed()) return document;

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/library"
      signUpFallbackRedirectUrl="/library"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          borderRadius: "8px",
          colorBackground: "#fffdf8",
          colorPrimary: "#688d43",
        },
        elements: {
          card: {
            backgroundColor: "#fffdf8",
          },
          cardBox: {
            backgroundColor: "#fffdf8",
            border: "1px solid #ddd5c8",
            borderRadius: "8px",
            boxShadow: "0 18px 50px rgba(36, 30, 22, 0.12)",
          },
          footerActionLink: {
            color: "#688d43",
            fontWeight: "700",
          },
          formButtonPrimary: {
            backgroundColor: "#171512",
            borderRadius: "999px",
            boxShadow: "none",
            color: "#fffaf1",
            fontWeight: "700",
          },
          formFieldInput: {
            backgroundColor: "#fffaf1",
            borderColor: "#ddd5c8",
            borderRadius: "10px",
            color: "#1d1a17",
          },
          headerTitle: {
            color: "#171512",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "28px",
            fontWeight: "500",
          },
          socialButtonsBlockButton: {
            backgroundColor: "#fffaf1",
            borderColor: "#ddd5c8",
            color: "#1d1a17",
          },
        },
      }}
    >
      {document}
    </ClerkProvider>
  );
}
