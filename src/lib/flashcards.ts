// utils/flashcards.ts
export interface FlashCard {
    id: string;
    title: string;
    description: string;
    actionLabel?: string;
    action?: () => void;
}

export const flashCards: FlashCard[] = [
    {
        id: "audio-dictionary",
        title: "🎉 New Feature: Audio PDF Reader + Dictionary",
        description:
            "You can now upload PDFs, listen to them aloud, and click any word to see its meaning in a dictionary modal. Perfect for learning and studying!",
        actionLabel: "Show Guide",
        action: () => {
            // The click will trigger modal in the component
            console.log("Show guide clicked");
        },
    },
];