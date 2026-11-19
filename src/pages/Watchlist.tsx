import React, { useState, useEffect } from 'react'
import { SignalCard } from '@/components/SignalCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter } from 'lucide-react'
import { useWatchlist } from '@/contexts/WatchlistContext'



export default function Watchlist() {
  const { bookmarkedSignals } = useWatchlist()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  const filteredSignals = bookmarkedSignals.filter(signal => {
    const matchesSearch = signal.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         signal.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || signal.type.toLowerCase() === filter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#09090b] text-[#f4f4f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Watchlist</h1>
          <p className="text-xs text-zinc-400 mt-1">Your saved signals and tracked investments.</p>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
          {filteredSignals.length} Saved Assets
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <Input
            placeholder="Search saved assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 rounded-2xl text-xs text-white placeholder:text-zinc-500 focus-visible:ring-white"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900 border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-200">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue placeholder="Filter by sentiment" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="buy">Bullish (Buy)</SelectItem>
            <SelectItem value="sell">Bearish (Sell)</SelectItem>
            <SelectItem value="hold">Neutral (Hold)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Signals Grid */}
      {filteredSignals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {filteredSignals.map((signal) => (
            <div key={signal.id} className="w-full h-full min-h-[280px]">
              <SignalCard signal={signal} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchTerm || filter !== 'all' ? 'No signals match your search criteria.' : 'No signals in your watchlist yet.'}
          </div>
          {!searchTerm && filter === 'all' && (
            <p className="text-sm text-muted-foreground">
              Click the bookmark icon on any signal card to add it to your watchlist.
            </p>
          )}
        </div>
      )}
    </div>
  )
} 