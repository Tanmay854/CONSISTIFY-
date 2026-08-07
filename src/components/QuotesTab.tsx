import DailyQuotesFeed from "@/components/DailyQuotesFeed";

/**
 * The Quotes tab is now the Daily Quotes experience: pick a topic, a
 * sub-topic and a wallpaper, then scroll through quotes.
 */
const QuotesTab = () => (
  <div className="relative h-[100dvh] w-full bg-background overflow-hidden">
    <DailyQuotesFeed />
  </div>
);

export default QuotesTab;
