from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    collection: str | None = None
    limit: int = Field(default=10, le=50)
    min_score: float = Field(default=0, ge=0, le=1)


class SearchResult(BaseModel):
    docid: str
    file: str
    title: str
    score: float
    context: str
    snippet: str


class SearchResponse(BaseModel):
    results: list[SearchResult]


class DocumentResponse(BaseModel):
    file: str
    content: str
    context: str | None = None
