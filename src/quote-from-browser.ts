import { BrowserExtension, Clipboard, showHUD, getSelectedText, environment, getPreferenceValues } from "@raycast/api";

// Define preference types
type Preferences = {
    includeAccessDate: boolean;
    useTabTitle: "url" | "tabtitle" | "source" | "domain";
    quoteStyle: "markdown" | "latex" | "plain";
    includeTextFragment: boolean;
};

export default async function command() {
    const preferences = getPreferenceValues<Preferences>();

    try {
        // Check if Browser Extension is available
        if (!environment.canAccess(BrowserExtension)) {
            await showHUD("Browser Extension not installed");
            return;
        }

        // Get the selected text
        const selectedText = await getSelectedText();
        if (!selectedText) {
            await showHUD("No text selected");
            return;
        }

        // Get the current tab
        const tabs = await BrowserExtension.getTabs();
        const activeTab = tabs.find(tab => tab.active);
        if (!activeTab?.url) {
            await showHUD("Cannot get current page URL");
            return;
        }

        // Create the full URL (with or without text fragment)
        const finalUrl = preferences.includeTextFragment
            ? createTextFragmentUrl(activeTab.url, selectedText)
            : activeTab.url;

        // Build the citation
        const sourceText = getSourceText(activeTab, preferences);
        const date = new Date();
        const formattedDate = preferences.includeAccessDate
            ? `, Accessed ${date.toISOString().split('T')[0]}`
            : '';

        // Combine text and citation
        const fullText = `${selectedText}\n[(${sourceText}${formattedDate})](${finalUrl})`;

        // Format according to style preference
        const formattedQuote = formatQuote(fullText, preferences.quoteStyle);

        // Copy to clipboard
        await Clipboard.copy(formattedQuote);
        await showHUD("Quote copied to clipboard");
    } catch (error) {
        console.error("Error:", error);
        await showHUD("Failed to copy quote");
    }
}

function formatQuote(text: string, style: Preferences["quoteStyle"]): string {
    switch (style) {
        case "markdown":
            return text
                .split('\n')
                .map(line => `> ${line}`)
                .join('\n');
        case "latex":
            return `\\begin{quote}\n${text}\n\\end{quote}`;
        case "plain":
            return text;
        default:
            return text;
    }
}

function getSourceText(activeTab: BrowserExtension.Tab, preferences: Preferences): string {
    switch (preferences.useTabTitle) {
        case "domain":
            return activeTab.url!.match(/(https?:\/\/)([^\/]*)/)![2];
        case "tabtitle":
            return activeTab.title ?? "Source";
        case "url":
            return activeTab.url!
        default:
            return "Source";
    }
}

function createTextFragmentUrl(baseUrl: string, text: string): string {
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const encodedText = encodeURIComponent(cleanText);
    return `${baseUrl}#:~:text=${encodedText}`;
}
