import { useState } from "react";
import { Heart, Share2, Bookmark, RefreshCw } from "lucide-react";

interface QuoteData {
  id: number;
  text: string;
  author: string;
  category: string;
}

const quotesData: QuoteData[] = [
  { id: 1, text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Work" },
  { id: 2, text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "Belief" },
  { id: 3, text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "Persistence" },
  { id: 4, text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "Courage" },
  { id: 5, text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", category: "Opportunity" },
  { id: 6, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "Dreams" },
  { id: 7, text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar", category: "Growth" },
  { id: 8, text: "The only impossible journey is the one you never begin.", author: "Tony Robbins", category: "Action" },
  { id: 9, text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis", category: "Destiny" },
];

const gradients = [
  "from-amber-950/60 to-background",
  "from-orange-950/50 to-background",
  "from-yellow-950/40 to-background",
  "from-rose-950/40 to-background",
  "from-emerald-950/40 to-background",
];

const QuotesTab = () => {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());

  return (
    <div className="min-h-screen pb-24 pt-4">
      {/* Header */}
      <div className="px-5 pt-4 pb-6">
        <h2 className="text-foreground font-semibold text-2xl">Quotes</h2>
        <p className="text-muted-foreground text-sm mt-1">Daily wisdom for your soul</p>
      </div>

      {/* Featured quote */}
      <div className="mx-5 mb-6 p-8 rounded-2xl bg-gradient-to-br from-primary/15 to-card border border-primary/20 relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <span className="text-[10px] tracking-widest uppercase text-primary font-medium">Quote of the Day</span>
        </div>
        <div className="mt-4">
          <span className="font-display text-5xl text-primary/30 leading-none">"</span>
          <p className="font-display text-xl leading-relaxed text-foreground -mt-6 ml-6">
            {quotesData[0].text}
          </p>
          <p className="text-muted-foreground text-sm mt-4 ml-6">— {quotesData[0].author}</p>
        </div>
        <div className="flex items-center gap-4 mt-6 ml-6">
          <button
            onClick={() =>
              setLiked((p) => {
                const n = new Set(p);
                n.has(0) ? n.delete(0) : n.add(0);
                return n;
              })
            }
          >
            <Heart size={20} className={liked.has(0) ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
          </button>
          <button>
            <Share2 size={20} className="text-muted-foreground" />
          </button>
          <button
            onClick={() =>
              setSaved((p) => {
                const n = new Set(p);
                n.has(0) ? n.delete(0) : n.add(0);
                return n;
              })
            }
          >
            <Bookmark size={20} className={saved.has(0) ? "fill-primary text-primary" : "text-muted-foreground"} />
          </button>
        </div>
      </div>

      {/* Quote cards */}
      <div className="px-5 space-y-3">
        {quotesData.slice(1).map((quote, i) => (
          <div
            key={quote.id}
            className="animate-float-up p-5 rounded-xl bg-card border border-border"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <span className="text-[10px] tracking-widest uppercase text-primary/70 font-medium">
              {quote.category}
            </span>
            <p className="text-foreground text-sm leading-relaxed mt-2 font-display italic">
              "{quote.text}"
            </p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-muted-foreground text-xs">— {quote.author}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setLiked((p) => {
                      const n = new Set(p);
                      n.has(quote.id) ? n.delete(quote.id) : n.add(quote.id);
                      return n;
                    })
                  }
                >
                  <Heart
                    size={14}
                    className={liked.has(quote.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}
                  />
                </button>
                <button
                  onClick={() =>
                    setSaved((p) => {
                      const n = new Set(p);
                      n.has(quote.id) ? n.delete(quote.id) : n.add(quote.id);
                      return n;
                    })
                  }
                >
                  <Bookmark
                    size={14}
                    className={saved.has(quote.id) ? "fill-primary text-primary" : "text-muted-foreground"}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuotesTab;
