import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Busca Jurídica TJSC",
  description: "Busca híbrida em acórdãos do Tribunal de Justiça de Santa Catarina com Voyage AI + BM25",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
