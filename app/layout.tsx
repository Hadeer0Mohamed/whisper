import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Inter, Noto_Sans_Arabic } from "next/font/google";
import { DirectionProvider } from "@base-ui/react/direction-provider";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { dirFor, LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const notoArabic = Noto_Sans_Arabic({
    subsets: ["arabic"],
    variable: "--font-arabic",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Whisper - meet and talk privately",
    description:
        "Audio rooms with real private side-channels. Pull someone aside for a whisper without leaving the conversation.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
    const cookieStore = await cookies();
    const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
    const dir = dirFor(locale);

    return (
        // next-themes toggles the `dark` class on <html>. Anything locale-dependent
        // must stay off this element: switching language re-renders the tree, and a
        // changed className prop makes React rewrite `class`, wiping out the theme.
        <html
            lang={locale}
            dir={dir}
            suppressHydrationWarning
            className="h-full"
        >
            <body
                className={cn(
                    "flex min-h-full flex-col bg-background text-foreground antialiased",
                    inter.variable,
                    notoArabic.variable,
                    geistMono.variable,
                    locale === "ar" ? "font-arabic" : "font-sans",
                )}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <DirectionProvider direction={dir}>
                        <I18nProvider locale={locale}>
                            <TooltipProvider>{children}</TooltipProvider>
                            <Toaster
                                position={
                                    dir === "rtl"
                                        ? "bottom-left"
                                        : "bottom-right"
                                }
                            />
                        </I18nProvider>
                    </DirectionProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
