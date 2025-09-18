import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "../contexts/AuthContext";
import { UserProvider } from "../contexts/UserContext";
import ThemeProvider from "../contexts/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <Component {...pageProps} />
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}
