"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/lib/api/types";
import { apiFetch } from "@/lib/api/client";
import { Search, BookOpen, FileText, AlertCircle } from "lucide-react";

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await apiFetch<{ results: SearchResult[] }>(
        "/api/v1/knowledge/search",
        { method: "POST", body: JSON.stringify({ query, limit: 10 }) }
      );
      setResults(data.results || []);
    } catch {
      setError("Knowledge base unavailable. QMD may not be connected.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge</h1>
        <p className="text-sm text-muted-foreground">
          Search across your document knowledge base.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} className="gap-2">
          <Search className="h-4 w-4" />
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!searched && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Search your knowledge base</p>
            <p className="text-sm text-muted-foreground">
              Find information across all indexed documents.
            </p>
          </CardContent>
        </Card>
      )}

      {searched && results.length === 0 && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((result) => (
            <Card key={result.docid} className="transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{result.title || result.file}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{result.file}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {(result.score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    {result.snippet && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                        {result.snippet.replace(/@@ -\d+,\d+ @@ \(\d+ before, \d+ after\)\n/, "")}
                      </p>
                    )}
                    {result.context && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {result.context}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
