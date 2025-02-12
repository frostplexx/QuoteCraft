import {
    Form,
    ActionPanel,
    Action,
    showToast,
    Toast,
    getPreferenceValues,
    Clipboard
} from "@raycast/api";

type Preferences = {
    includeAccessDate: boolean;
    quoteStyle: "markdown" | "latex" | "plain";
    includeTextFragment: boolean;
};

type FormValues = {
    quote: string;
    source: string;
    url: string;
    title: string;
};

export default function Command() {
    const preferences = getPreferenceValues<Preferences>();

    async function handleSubmit(values: FormValues) {
        if (!values.quote.trim()) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Quote is required",
            });
            return;
        }

        try {
            // Format date if needed
            const dateStr = preferences.includeAccessDate
                ? `, Accessed ${new Date().toISOString().split('T')[0]}`
                : '';

            // Build citation
            const sourceText = values.title.trim() || values.source.trim() || new URL(values.url).hostname;

            // Build URL with optional text fragment
            const finalUrl = preferences.includeTextFragment && values.quote
                ? `${values.url}#:~:text=${encodeURIComponent(values.quote.trim())}`
                : values.url;

            // Combine text and citation
            const fullText = `${values.quote}\n[(${sourceText}${dateStr})](${finalUrl})`;

            // Format according to style preference
            const formattedQuote = formatQuote(fullText, preferences.quoteStyle);

            // Copy to clipboard
            await Clipboard.copy(formattedQuote);

            await showToast({
                style: Toast.Style.Success,
                title: "Quote copied to clipboard",
            });
        } catch (error) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to create quote",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextArea
                id="quote"
                title="Quote"
                placeholder="Enter or paste quote text"
                enableMarkdown={false}
                autoFocus
            />
            <Form.TextField
                id="url"
                title="URL"
                placeholder="https://example.com"
            />
            <Form.TextField
                id="source"
                title="Source Name"
                placeholder="Optional source name"
            />
            <Form.TextField
                id="title"
                title="Page Title"
                placeholder="Optional page title"
            />
        </Form>
    );
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
