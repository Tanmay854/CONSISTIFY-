import energy1 from "@/assets/quotes/energy-1.jpg";
import inspirational1 from "@/assets/quotes/inspirational-1.jpg";
import energy2 from "@/assets/quotes/energy-2.jpg";
import focus1 from "@/assets/quotes/focus-1.jpg";
import inspirational2 from "@/assets/quotes/inspirational-2.jpg";
import focus2 from "@/assets/quotes/focus-2.jpg";
import motivation1 from "@/assets/quotes/motivation-1.jpg";
import motivation2 from "@/assets/quotes/motivation-2.jpg";
import strength1 from "@/assets/quotes/strength-1.jpg";
import strength2 from "@/assets/quotes/strength-2.jpg";
import peace1 from "@/assets/quotes/peace-1.jpg";
import peace2 from "@/assets/quotes/peace-2.jpg";

interface QuoteCard {
  id: number;
  title: string;
  category: string;
  duration: string;
  image: string;
  isPro?: boolean;
}

const quotesData: QuoteCard[] = [
  { id: 1, title: "Last Tear", category: "ENERGY", duration: "4:42", image: energy1, isPro: true },
  { id: 2, title: "Hope", category: "INSPIRATIONAL", duration: "3:17", image: inspirational1, isPro: true },
  { id: 3, title: "Against All Odds", category: "ENERGY", duration: "4:12", image: energy2 },
  { id: 4, title: "Who We Want to Be", category: "FOCUS", duration: "6:35", image: focus1 },
  { id: 5, title: "My Moment", category: "INSPIRATIONAL", duration: "1:46", image: inspirational2, isPro: true },
  { id: 6, title: "Into the Wind", category: "FOCUS", duration: "1:08", image: focus2, isPro: true },
  { id: 7, title: "Rise Above", category: "MOTIVATION", duration: "3:55", image: motivation1 },
  { id: 8, title: "Unbreakable", category: "STRENGTH", duration: "5:20", image: strength1, isPro: true },
  { id: 9, title: "The Long Road", category: "MOTIVATION", duration: "2:34", image: motivation2 },
  { id: 10, title: "Inner Light", category: "PEACE", duration: "4:08", image: peace1 },
  { id: 11, title: "Still Standing", category: "STRENGTH", duration: "3:42", image: strength2, isPro: true },
  { id: 12, title: "City Dreams", category: "PEACE", duration: "2:15", image: peace2 },
];

const QuoteGridCard = ({ quote }: { quote: QuoteCard }) => (
  <div className="relative rounded-2xl overflow-hidden aspect-[4/5]">
    <img
      src={quote.image}
      alt={quote.title}
      className="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
    {/* Dark overlay for text readability */}
    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-background/30" />

    {/* Top badges */}
    <div className="absolute top-3 left-3 flex items-center gap-2">
      {quote.isPro && (
        <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
          Pro
        </span>
      )}
      <span className="text-foreground text-xs font-semibold">{quote.duration}</span>
    </div>

    {/* Bottom text */}
    <div className="absolute bottom-4 left-0 right-0 text-center px-3">
      <p className="text-foreground/70 text-[10px] tracking-[0.2em] uppercase font-medium">
        {quote.category}
      </p>
      <h3 className="text-foreground font-bold text-base mt-1 leading-tight">
        {quote.title}
      </h3>
      <div className="w-6 h-[2px] bg-foreground/30 mx-auto mt-2 rounded-full" />
    </div>
  </div>
);

const QuotesTab = () => {
  return (
    <div className="min-h-screen pb-24 pt-4 bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <h2 className="text-foreground font-semibold text-2xl">Quotes</h2>
        <p className="text-muted-foreground text-sm mt-1">Daily wisdom for your soul</p>
      </div>

      {/* Grid */}
      <div className="px-3 grid grid-cols-2 gap-3">
        {quotesData.map((quote, i) => (
          <div
            key={quote.id}
            className="animate-float-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <QuoteGridCard quote={quote} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuotesTab;
