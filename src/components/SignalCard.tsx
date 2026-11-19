import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Clock, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWatchlist } from '@/contexts/WatchlistContext';
import { useSettings } from '@/contexts/SettingsContext';
import { StockDetailModal } from '@/components/StockDetailModal';

interface SignalCardProps {
  signal: {
    id: string
    asset: string
    type: 'BUY' | 'SELL' | 'HOLD'
    price: number | string
    confidence: number
    description: string
    timestamp: string
    sources: string[]
    redditMentions?: number
    newsArticles?: number
    socialSentiment?: string
    indicator?: string
    value?: number
  }
}

// 随机风向生成函数
const getRandomSentiment = () => {
  const sentiments = [
    { label: 'Bullish', icon: TrendingUp, color: '#105E48', bgColor: '#105E48', textColor: '#C0F8E2' },
    { label: 'Bearish', icon: TrendingDown, color: '#DC2626', bgColor: '#DC2626', textColor: '#FECACA' },
    { label: 'Neutral', icon: Clock, color: '#CA8A04', bgColor: '#CA8A04', textColor: '#FEF3C7' }
  ]
  return sentiments[Math.floor(Math.random() * sentiments.length)]
}

export function SignalCard({ signal }: SignalCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isBookmarked, toggleBookmark } = useWatchlist()
  const { settings } = useSettings()
  const [randomSentiment] = useState(getRandomSentiment())

  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'BUY': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'SELL': return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    }
  }

  const SignalIcon = signal.type === 'BUY' ? TrendingUp : signal.type === 'SELL' ? TrendingDown : Clock
  const SentimentIcon = randomSentiment.icon

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer group bg-[#121215] border border-zinc-800/90 hover:border-zinc-700 rounded-3xl overflow-hidden shadow-xl w-full h-full flex flex-col justify-between",
          settings.animateTransitions && "transition-all duration-200 hover:-translate-y-1",
          settings.displayDensity === 'compact' ? 'p-3.5' : settings.displayDensity === 'spacious' ? 'p-6' : 'p-5'
        )}
        onClick={() => setIsModalOpen(true)}
      >
        <div>
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-white">
                {signal.asset.slice(0, 3)}
              </div>
              <div>
                <span className="font-bold text-base text-white block tracking-tight group-hover:text-zinc-200">
                  {signal.asset}
                </span>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", getSignalBadge(signal.type))}>
                  <SignalIcon className="w-2.5 h-2.5" /> {signal.type}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleBookmark(signal)
              }}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              <Bookmark
                className={cn(
                  "w-4 h-4 transition-transform hover:scale-110",
                  isBookmarked(signal.id) ? "fill-white text-white" : "text-zinc-500"
                )}
              />
            </button>
          </div>

          {/* Price Section */}
          <div className="mt-4">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {typeof signal.price === 'number' ? `$${signal.price.toFixed(2)}` : signal.price}
            </span>
          </div>

          {/* Confidence Section */}
          {settings.showConfidenceScores && (
            <div className="flex flex-col mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium text-[11px]">AI Confidence</span>
                <span className="font-bold text-zinc-300 font-mono text-[11px]">{signal.confidence}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${signal.confidence}%` }}
                />
              </div>
            </div>
          )}

          {/* Tags Row */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {signal.sources.includes('news') && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">News</span>
            )}
            {signal.sources.includes('technical') && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">Technical</span>
            )}
            {signal.sources.includes('social') && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">Social</span>
            )}
          </div>

          {/* Summary */}
          <div className="mt-3">
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {signal.description}
            </p>
          </div>
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono">
          <span>{signal.timestamp}</span>
          <span className="text-zinc-400">Click to view chart →</span>
        </div>
      </Card>

      <StockDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        signal={signal}
      />
    </>
  )
}