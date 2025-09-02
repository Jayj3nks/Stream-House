import './globals.css'
import { ThemeProvider } from "next-themes"

export const metadata = {
  title: 'Streamer House - Creator Support & Collab Platform',
  description: 'Help creators organize into houses, boost each other\'s posts, and find collaborations',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}