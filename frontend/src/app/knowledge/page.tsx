"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/lib/api/types";

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${apiUrl}/api/v1/knowledge/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // QMD unavailable — expected during dev
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Knowledge</h1>
      <p className="mt-1 text-muted-foreground">
        Search the knowledge base (QMD).
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full sm:max-w-md"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {results.map((result) => (
          <Card key={result.docid}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{result.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.file}
                  </p>
                </div>
                <Badge variant="outline">
                  {(result.score * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.snippet}
              </p>
              {result.context && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {result.context}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
