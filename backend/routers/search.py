import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional

from services.embeddings import embed_texts
from services.search import (
    init_qdrant,
    upsert_chunks,
    search_dense,
    search_bm25,
    hybrid_search_rrf,
    get_collection_chunks,
    clear_collection,
)
from config import EMBEDDING_MODELS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])

VALID_MODEL_IDS = list(EMBEDDING_MODELS.keys())
DEFAULT_MODEL = "azure-openai"
MetricName = Literal["cosine", "dot", "euclidean", "dot_product"]


def _result_to_frontend(r: dict, rank: int = 0) -> dict:
    return {
        "text": r.get("content", r.get("text", "")),
        "score": r["score"],
        "content": r.get("content", ""),
        "rank": rank,
        "index": r.get("index", rank),
    }


class UpsertRequest(BaseModel):
    chunks: list[dict]  # [{"content": str, "index": int}]
    model: str = DEFAULT_MODEL


class UpsertResponse(BaseModel):
    status: str
    count: int


class DenseSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    limit: Optional[int] = None
    metric: MetricName = "cosine"
    model: str = DEFAULT_MODEL


class SparseSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    limit: Optional[int] = None


class HybridSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    limit: Optional[int] = None
    rrf_k: int = 60
    model: str = DEFAULT_MODEL


class CompareRequest(BaseModel):
    query: str
    top_k: int = 5
    model: str = DEFAULT_MODEL
    rrf_k: int = 60


def _top_k(body: dict) -> int:
    return body.get("top_k") or body.get("limit") or 5


def _get_valid_model(model: str) -> str:
    return model if model in VALID_MODEL_IDS else DEFAULT_MODEL


@router.post("/upsert", response_model=UpsertResponse)
def upsert(body: UpsertRequest):
    """Index chunks with embeddings for dense search and BM25 for sparse. Overwrites previous index."""
    if not body.chunks:
        raise HTTPException(400, "chunks cannot be empty")
    model = _get_valid_model(body.model)
    logger.info(f"Upserting {len(body.chunks)} chunks with model {model}")
    texts = [c["content"] for c in body.chunks]
    vectors, dim = embed_texts(texts, model=model)
    result = upsert_chunks(body.chunks, vectors)
    logger.info(f"Upsert result: {result}")
    return UpsertResponse(status=result["status"], count=result["count"])


@router.delete("/clear")
def clear():
    """Clear all indexed data."""
    result = clear_collection()
    return result


@router.post("/dense")
def dense_search(body: DenseSearchRequest):
    """Dense (vector) similarity search. Optionally specify metric: cosine, dot, euclidean (or dot_product)."""
    top_k = body.top_k or body.limit or 5
    metric = "dot" if body.metric == "dot_product" else body.metric
    model = _get_valid_model(body.model)
    query_vector, _ = embed_texts([body.query], model=model)
    if not query_vector:
        return {"results": [], "query": body.query, "metric": metric}
    results = search_dense(query_vector[0], top_k=top_k, metric=metric)
    results_fe = [_result_to_frontend(r, i + 1) for i, r in enumerate(results)]
    return {"results": results_fe, "query": body.query, "metric": metric}


@router.post("/sparse")
def sparse_search(body: SparseSearchRequest):
    """Sparse (BM25 keyword) search. Requires calling /search/upsert first."""
    top_k = body.top_k or body.limit or 5
    results = search_bm25(body.query, top_k=top_k)
    results_fe = [_result_to_frontend(r, i + 1) for i, r in enumerate(results)]
    return {"results": results_fe, "query": body.query}


@router.post("/hybrid")
def hybrid_search(body: HybridSearchRequest):
    """Hybrid search: dense + BM25 merged with RRF."""
    top_k = body.top_k or body.limit or 5
    model = _get_valid_model(body.model)
    query_vector, _ = embed_texts([body.query], model=model)
    if not query_vector:
        return {
            "results": [], "dense": [], "sparse": [],
            "denseResults": [], "sparseResults": [], "fusedResults": [],
            "query": body.query,
        }
    dense_results = search_dense(query_vector[0], top_k=top_k * 2, metric="cosine")
    sparse_results = search_bm25(body.query, top_k=top_k * 2)
    merged = hybrid_search_rrf(dense_results, sparse_results, k=body.rrf_k)[:top_k]
    dense_fe = [_result_to_frontend(r, i + 1) for i, r in enumerate(dense_results[:top_k])]
    sparse_fe = [_result_to_frontend(r, i + 1) for i, r in enumerate(sparse_results[:top_k])]
    merged_fe = [_result_to_frontend(r, i + 1) for i, r in enumerate(merged)]
    return {
        "results": merged_fe,
        "dense": dense_fe,
        "sparse": sparse_fe,
        "denseResults": dense_fe,
        "sparseResults": sparse_fe,
        "fusedResults": merged_fe,
        "query": body.query,
        "rrf_k": body.rrf_k,
    }


@router.post("/compare")
def compare_search(body: CompareRequest):
    """
    Compare Dense vs Hybrid (RRF) search results side-by-side.
    Shows what RRF promoted/demoted compared to pure dense search.
    """
    model = _get_valid_model(body.model)
    logger.info(f"Compare search: query='{body.query[:50]}...', model={model}")
    
    query_vector, _ = embed_texts([body.query], model=model)
    if not query_vector:
        return {
            "query": body.query,
            "dense_results": [],
            "hybrid_results": [],
            "delta_analysis": [],
            "error": "Failed to embed query",
        }
    
    dense_results = search_dense(query_vector[0], top_k=body.top_k * 2, metric="cosine")
    sparse_results = search_bm25(body.query, top_k=body.top_k * 2)
    hybrid_results = hybrid_search_rrf(dense_results, sparse_results, k=body.rrf_k)[:body.top_k]
    
    dense_ranking = {r["content"]: i + 1 for i, r in enumerate(dense_results[:body.top_k])}
    hybrid_ranking = {r["content"]: i + 1 for i, r in enumerate(hybrid_results)}
    
    delta_analysis = []
    for i, result in enumerate(hybrid_results):
        content = result["content"]
        hybrid_rank = i + 1
        dense_rank = dense_ranking.get(content)
        
        if dense_rank is None:
            change = "NEW"
            change_detail = "Not in dense top-k"
        elif dense_rank > hybrid_rank:
            change = "PROMOTED"
            change_detail = f"↑ from #{dense_rank} to #{hybrid_rank}"
        elif dense_rank < hybrid_rank:
            change = "DEMOTED"
            change_detail = f"↓ from #{dense_rank} to #{hybrid_rank}"
        else:
            change = "UNCHANGED"
            change_detail = f"Rank #{hybrid_rank}"
        
        delta_analysis.append({
            "content": content[:200] + "..." if len(content) > 200 else content,
            "hybrid_rank": hybrid_rank,
            "dense_rank": dense_rank,
            "change": change,
            "change_detail": change_detail,
            "hybrid_score": result["score"],
            "dense_score": next((r["score"] for r in dense_results if r["content"] == content), None),
        })
    
    return {
        "query": body.query,
        "dense_results": [_result_to_frontend(r, i + 1) for i, r in enumerate(dense_results[:body.top_k])],
        "sparse_results": [_result_to_frontend(r, i + 1) for i, r in enumerate(sparse_results[:body.top_k])],
        "hybrid_results": [_result_to_frontend(r, i + 1) for i, r in enumerate(hybrid_results)],
        "delta_analysis": delta_analysis,
        "explanation": {
            "rrf_k": body.rrf_k,
            "formula": "RRF_score = Σ(1 / (k + rank))",
            "benefit": "RRF combines semantic understanding (dense) with keyword matching (sparse) to improve relevance.",
        },
    }


@router.get("/chunks")
def list_chunks():
    """Return currently indexed chunks (for step-by-step visualization)."""
    chunks = get_collection_chunks()
    return {"chunks": chunks}
