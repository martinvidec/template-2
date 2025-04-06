import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { ErrorProvider } from "@/lib/contexts/ErrorContext";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aido",
  description: "Your AI Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <DeepgramContextProvider>
            <ErrorProvider>
              <Navbar />
              {children}
            </ErrorProvider>
          </DeepgramContextProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
