"""RAG answer endpoint with LLM-powered response generation."""
import logging
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import (
    embed_texts,
    search_dense,
    search_bm25,
    hybrid_search_rrf,
)
from services.llm import generate_answer, generate_comparison_analysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rag", tags=["RAG"])


class RAGRequest(BaseModel):
    query: str
    search_type: Literal["dense", "sparse", "hybrid"] = "hybrid"
    model: str = "azure-openai"
    format_style: Literal["intelligence_report", "summary", "detailed"] = "intelligence_report"
    top_k: int = 5
    include_comparison: bool = False


class RAGResponse(BaseModel):
    answer: str
    sources: list[dict]
    search_type: str
    confidence: str
    model: str
    format_style: str
    tokens_used: Optional[int] = None
    comparison: Optional[dict] = None


@router.post("/answer", response_model=RAGResponse)
def rag_answer(req: RAGRequest):
    """
    Complete RAG pipeline: embed query -> search -> generate answer.
    
    This endpoint demonstrates the full RAG flow:
    1. Embed the query using the specified model
    2. Retrieve relevant chunks using the specified search type
    3. Generate a formatted answer using the LLM
    """
    logger.info(f"RAG request: query='{req.query[:50]}...', search_type={req.search_type}, model={req.model}")
    
    try:
        query_vectors, dim = embed_texts([req.query], model=req.model)
        if not query_vectors:
            raise HTTPException(status_code=500, detail="Failed to embed query")
        query_vector = query_vectors[0]
        logger.info(f"Query embedded with dimension {dim}")
    except Exception as e:
        logger.error(f"Query embedding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")
    
    dense_results = []
    sparse_results = []
    
    if req.search_type in ("dense", "hybrid"):
        dense_results = search_dense(query_vector, top_k=req.top_k, metric="cosine")
        logger.info(f"Dense search returned {len(dense_results)} results")
    
    if req.search_type in ("sparse", "hybrid"):
        sparse_results = search_bm25(req.query, top_k=req.top_k)
        logger.info(f"Sparse search returned {len(sparse_results)} results")
    
    if req.search_type == "dense":
        sources = dense_results
    elif req.search_type == "sparse":
        sources = sparse_results
    else:
        sources = hybrid_search_rrf(dense_results, sparse_results)[:req.top_k]
        logger.info(f"Hybrid RRF fusion returned {len(sources)} results")
    
    if not sources:
        return RAGResponse(
            answer="INSUFFICIENT DATA: No relevant sources found in the knowledge base. Please ensure documents have been indexed.",
            sources=[],
            search_type=req.search_type,
            confidence="LOW",
            model=req.model,
            format_style=req.format_style,
        )
    
    llm_result = generate_answer(
        query=req.query,
        sources=sources,
        format_style=req.format_style,
    )
    
    comparison = None
    if req.include_comparison and req.search_type == "hybrid":
        comparison = generate_comparison_analysis(
            query=req.query,
            dense_results=dense_results,
            hybrid_results=sources,
        )
    
    formatted_sources = [
        {
            "text": s.get("content", ""),
            "score": s.get("score", 0),
            "rank": i + 1,
            "index": s.get("index", i),
        }
        for i, s in enumerate(sources)
    ]
    
    return RAGResponse(
        answer=llm_result.get("answer", ""),
        sources=formatted_sources,
        search_type=req.search_type,
        confidence=llm_result.get("confidence", "UNKNOWN"),
        model=req.model,
        format_style=req.format_style,
        tokens_used=llm_result.get("tokens_used"),
        comparison=comparison,
    )


class TrapDatasetRequest(BaseModel):
    query: str
    model: str = "azure-openai"
    top_k: int = 5


@router.post("/trap-demo")
def trap_dataset_demo(req: TrapDatasetRequest):
    """
    Demonstrate similarity vs relevance using the trap dataset.
    Shows how semantically similar but irrelevant content can rank highly.
    """
    logger.info(f"Trap demo request: query='{req.query}'")
    
    try:
        query_vectors, _ = embed_texts([req.query], model=req.model)
        if not query_vectors:
            raise HTTPException(status_code=500, detail="Failed to embed query")
        query_vector = query_vectors[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")
    
    dense_results = search_dense(query_vector, top_k=req.top_k, metric="cosine")
    sparse_results = search_bm25(req.query, top_k=req.top_k)
    hybrid_results = hybrid_search_rrf(dense_results, sparse_results)[:req.top_k]
    
    trap_indicators = []
    for i, result in enumerate(dense_results):
        content_lower = result.get("content", "").lower()
        query_lower = req.query.lower()
        
        query_words = set(query_lower.split())
        content_words = set(content_lower.split())
        keyword_overlap = len(query_words & content_words) / max(len(query_words), 1)
        
        is_trap = result.get("score", 0) > 0.7 and keyword_overlap < 0.2
        trap_indicators.append({
            "rank": i + 1,
            "is_potential_trap": is_trap,
            "similarity_score": result.get("score", 0),
            "keyword_overlap": round(keyword_overlap, 2),
            "warning": "HIGH SIMILARITY BUT LOW KEYWORD OVERLAP - May be irrelevant!" if is_trap else None,
        })
    
    return {
        "query": req.query,
        "dense_results": [
            {"text": r.get("content", ""), "score": r.get("score", 0), "rank": i + 1}
            for i, r in enumerate(dense_results)
        ],
        "sparse_results": [
            {"text": r.get("content", ""), "score": r.get("score", 0), "rank": i + 1}
            for i, r in enumerate(sparse_results)
        ],
        "hybrid_results": [
            {"text": r.get("content", ""), "score": r.get("score", 0), "rank": i + 1}
            for i, r in enumerate(hybrid_results)
        ],
        "trap_analysis": trap_indicators,
        "explanation": (
            "Similarity vs Relevance trap: Documents can be semantically similar "
            "(high embedding similarity) but not actually relevant to the query. "
            "Hybrid search (RRF) helps by incorporating keyword matching."
        ),
    }
