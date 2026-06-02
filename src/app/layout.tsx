import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "Nexo",
    template: "%s | Nexo",
  },
  description: "Gestión inteligente para tu negocio",
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="h-full bg-[#F9FAFB] text-gray-900">{children}</body>
    </html>
  )
}
