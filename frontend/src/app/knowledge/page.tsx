"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/lib/api/types";
import { apiFetch } from "@/lib/api/client";
import ReactMarkdown from "react-markdown";
import { Search, BookOpen, FileText, AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<Record<string, string>>({});
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setExpanded(null);
    try {
      const data = await apiFetch<{ results: SearchResult[] }>(
        "/api/v1/knowledge/search",
        {
          method: "POST",
          body: JSON.stringify({ query: query.trim(), limit: 10 }),
        }
      );
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDoc = async (result: SearchResult) => {
    const key = result.docid || result.file;
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);

    // Fetch full content if not cached
    if (!docContent[key]) {
      setLoadingDoc(key);
      try {
        const data = await apiFetch<{ content: string }>(`/api/v1/knowledge/doc/${encodeURIComponent(result.file)}`);
        setDocContent((prev) => ({ ...prev, [key]: data.content || result.snippet || "" }));
      } catch {
        // Fallback to snippet
        setDocContent((prev) => ({ ...prev, [key]: result.snippet || "Content not available" }));
      } finally {
        setLoadingDoc(null);
      }
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

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading} className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No results found</p>
            <p className="text-sm text-muted-foreground mt-1">Try different search terms.</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((result) => {
            const key = result.docid || result.file;
            const isExpanded = expanded === key;
            const content = docContent[key];
            const isLoadingThis = loadingDoc === key;

            return (
              <Card
                key={key}
                className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                onClick={() => toggleDoc(result)}
              >
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0">
                            {(result.score * 100).toFixed(0)}%
                          </Badge>
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </div>
                      </div>
                      {!isExpanded && result.snippet && (
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
                  {isExpanded && (
                    <div className="mt-4 ml-12 p-4 rounded-lg bg-muted/50">
                      {isLoadingThis ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading document...
                        </div>
                      ) : content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>{content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Content not available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
