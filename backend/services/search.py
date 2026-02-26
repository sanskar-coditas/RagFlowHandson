"""Qdrant + BM25 search and RRF for RAG demo."""
import re
import uuid
import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
)
from rank_bm25 import BM25Okapi
import numpy as np

from config import (
    QDRANT_HOST,
    QDRANT_PORT,
    QDRANT_COLLECTION,
    QDRANT_IN_MEMORY,
    QDRANT_URL,
    QDRANT_API_KEY,
)
from config import use_qdrant_cloud

logger = logging.getLogger(__name__)

# In-memory store when Qdrant server is not used
_memory_vectors: list[tuple[str, list[float], dict]] = []
_memory_bm25_corpus: list[str] = []
_memory_bm25: Optional[BM25Okapi] = None
_memory_chunks: list[dict] = []

# Track current collection dimension to detect changes
_current_collection_dim: Optional[int] = None


def _tokenize(text: str) -> list[str]:
    """
    Tokenize text for BM25: lowercase, remove punctuation, split on whitespace.
    Returns tokens with length > 1 character.
    """
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    tokens = text.split()
    tokens = [t for t in tokens if len(t) > 1]
    return tokens


def _get_client() -> Optional[QdrantClient]:
    if use_qdrant_cloud():
        try:
            logger.info(f"Connecting to Qdrant Cloud at {QDRANT_URL}")
            client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
            logger.info("Successfully connected to Qdrant Cloud")
            return client
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant Cloud: {e}")
            return None
    if QDRANT_IN_MEMORY:
        logger.info("Using in-memory storage (Qdrant disabled)")
        return None
    try:
        logger.info(f"Connecting to local Qdrant at {QDRANT_HOST}:{QDRANT_PORT}")
        return QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    except Exception as e:
        logger.error(f"Failed to connect to local Qdrant: {e}")
        return None


def init_qdrant(vector_size: int = 1536, force_recreate: bool = False):
    """
    Ensure collection exists with correct dimension.
    If dimension changes, recreate collection.
    """
    global _current_collection_dim
    client = _get_client()
    if client is None:
        return
    
    try:
        if client.collection_exists(QDRANT_COLLECTION):
            collection_info = client.get_collection(QDRANT_COLLECTION)
            existing_dim = collection_info.config.params.vectors.size
            logger.info(f"Collection {QDRANT_COLLECTION} exists with dimension {existing_dim}")
            
            if existing_dim != vector_size or force_recreate:
                logger.warning(
                    f"Dimension mismatch: collection has {existing_dim}, need {vector_size}. Recreating..."
                )
                client.delete_collection(QDRANT_COLLECTION)
                client.create_collection(
                    QDRANT_COLLECTION,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
                )
                logger.info(f"Recreated collection {QDRANT_COLLECTION} with dimension {vector_size}")
            _current_collection_dim = vector_size
        else:
            logger.info(f"Creating collection {QDRANT_COLLECTION} with dimension {vector_size}")
            client.create_collection(
                QDRANT_COLLECTION,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            _current_collection_dim = vector_size
    except Exception as e:
        logger.error(f"Error initializing Qdrant collection: {e}")
        raise


def upsert_chunks(
    chunks: list[dict],
    vectors: list[list[float]],
    collection_id: str = "default",
) -> dict:
    """
    Store chunks and their vectors. Uses in-memory when Qdrant is not available.
    chunks: list of {"content": str, "index": int}
    vectors: list of embedding vectors
    Also stores BM25 corpus in memory for sparse search.
    """
    global _memory_vectors, _memory_bm25_corpus, _memory_bm25, _memory_chunks
    
    if not chunks or not vectors:
        logger.warning("Empty chunks or vectors provided to upsert_chunks")
        return {"status": "empty", "count": 0}
    
    vector_dim = len(vectors[0]) if vectors else 1536
    logger.info(f"Upserting {len(chunks)} chunks with dimension {vector_dim}")
    
    # Always build BM25 index for sparse search
    corpus = [c["content"] for c in chunks]
    _memory_bm25_corpus = corpus
    tokenized_corpus = [_tokenize(d) for d in corpus]
    _memory_bm25 = BM25Okapi(tokenized_corpus)
    _memory_chunks = list(chunks)
    
    total_tokens = sum(len(t) for t in tokenized_corpus)
    unique_tokens = set(token for tokens in tokenized_corpus for token in tokens)
    logger.info(f"Built BM25 index with {len(corpus)} documents, {total_tokens} total tokens, {len(unique_tokens)} unique tokens")
    logger.debug(f"Sample tokens from first doc: {tokenized_corpus[0][:20] if tokenized_corpus else []}")
    
    client = _get_client()
    if client is not None:
        try:
            init_qdrant(vector_size=vector_dim)
            points = [
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=v,
                    payload={"content": c["content"], "index": c["index"]},
                )
                for c, v in zip(chunks, vectors)
            ]
            client.upsert(QDRANT_COLLECTION, points=points)
            logger.info(f"Upserted {len(points)} points to Qdrant collection {QDRANT_COLLECTION}")
            return {"status": "qdrant", "count": len(chunks)}
        except Exception as e:
            logger.error(f"Qdrant upsert failed: {e}. Falling back to in-memory storage.")

    # In-memory path (fallback)
    _memory_vectors = [
        (c["content"], v, {"content": c["content"], "index": c["index"]})
        for c, v in zip(chunks, vectors)
    ]
    logger.info(f"Stored {len(_memory_vectors)} vectors in memory")
    return {"status": "memory", "count": len(chunks)}


def search_dense(
    query_vector: list[float],
    top_k: int = 5,
    metric: str = "cosine",
) -> list[dict]:
    """
    Dense similarity search. Returns list of {content, index, score}.
    metric: "cosine" | "dot" | "euclidean"
    """
    logger.info(f"Dense search with top_k={top_k}, metric={metric}")
    client = _get_client()
    if client is not None:
        try:
            results = client.query_points(
                collection_name=QDRANT_COLLECTION,
                query=query_vector,
                limit=top_k,
            ).points
            logger.info(f"Qdrant dense search returned {len(results)} results")
            return [
                {"content": r.payload.get("content", ""), "index": r.payload.get("index", 0), "score": r.score}
                for r in results
            ]
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}. Falling back to in-memory.")

    # In-memory: compute similarity
    if not _memory_vectors:
        logger.warning("No vectors in memory for dense search")
        return []
    vecs = np.array([v for _, v, _ in _memory_vectors], dtype=float)
    q = np.array(query_vector, dtype=float)
    if metric == "cosine":
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1
        vecs_n = vecs / norms
        q_n = q / (np.linalg.norm(q) or 1)
        scores = np.dot(vecs_n, q_n)
    elif metric == "dot":
        scores = np.dot(vecs, q)
    else:
        # Euclidean: convert distance to similarity (1 / (1 + distance))
        distances = np.linalg.norm(vecs - q, axis=1)
        scores = 1.0 / (1.0 + distances)
    top_indices = np.argsort(scores)[::-1][:top_k]
    logger.info(f"In-memory dense search returned {len(top_indices)} results")
    return [
        {
            "content": _memory_vectors[i][2]["content"],
            "index": _memory_vectors[i][2]["index"],
            "score": float(scores[i]),
        }
        for i in top_indices
    ]


def search_bm25(query: str, top_k: int = 5, include_zero_scores: bool = False) -> list[dict]:
    """
    BM25 (sparse) keyword search. Returns list of {content, index, score}.
    
    Args:
        query: Search query string
        top_k: Number of top results to return
        include_zero_scores: If True, include results even if BM25 score is 0
    """
    global _memory_bm25, _memory_chunks
    logger.info(f"BM25 search for query: '{query[:50]}...' with top_k={top_k}")
    
    if _memory_bm25 is None or not _memory_chunks:
        logger.warning("BM25 index not available - no documents indexed")
        return []
    
    tokenized_query = _tokenize(query)
    logger.info(f"BM25 tokenized query: {tokenized_query}")
    
    if not tokenized_query:
        logger.warning("BM25 query tokenized to empty - no valid tokens")
        return []
    
    scores = _memory_bm25.get_scores(tokenized_query)
    top_indices = np.argsort(scores)[::-1][:top_k]
    
    positive_count = sum(1 for s in scores if s > 0)
    logger.info(f"BM25 found {positive_count} documents with positive scores out of {len(scores)} total")
    
    if include_zero_scores:
        results = [
            {
                "content": _memory_chunks[i]["content"],
                "index": _memory_chunks[i]["index"],
                "score": float(scores[i]),
            }
            for i in top_indices
        ]
    else:
        results = [
            {
                "content": _memory_chunks[i]["content"],
                "index": _memory_chunks[i]["index"],
                "score": float(scores[i]),
            }
            for i in top_indices
            if scores[i] > 0
        ]
    
    logger.info(f"BM25 search returned {len(results)} results")
    return results


def hybrid_search_rrf(
    dense_results: list[dict],
    sparse_results: list[dict],
    k: int = 60,
) -> list[dict]:
    """
    Reciprocal Rank Fusion: score = 1 / (k + rank).
    Merge dense and sparse result lists by content identity (content + index).
    """
    def key(r):
        return (r["content"], r["index"])

    rank_scores = {}
    for rank, r in enumerate(dense_results):
        rank_scores[key(r)] = rank_scores.get(key(r), 0) + 1 / (k + rank + 1)
    for rank, r in enumerate(sparse_results):
        rank_scores[key(r)] = rank_scores.get(key(r), 0) + 1 / (k + rank + 1)

    # Build unique results with RRF score
    seen = set()
    merged = []
    for (content, idx), sc in sorted(rank_scores.items(), key=lambda x: -x[1]):
        if (content, idx) in seen:
            continue
        seen.add((content, idx))
        merged.append({"content": content, "index": idx, "score": round(sc, 6)})
    return merged


def get_collection_chunks() -> list[dict]:
    """Return currently stored chunks (from memory cache or Qdrant)."""
    if _memory_chunks:
        logger.info(f"Returning {len(_memory_chunks)} chunks from memory cache")
        return _memory_chunks
    client = _get_client()
    if client is None:
        logger.warning("No chunks available - neither in memory nor Qdrant")
        return []
    try:
        if not client.collection_exists(QDRANT_COLLECTION):
            logger.warning(f"Collection {QDRANT_COLLECTION} does not exist")
            return []
        points, _ = client.scroll(QDRANT_COLLECTION, limit=1000)
        logger.info(f"Retrieved {len(points)} chunks from Qdrant")
        return [
            {"content": p.payload.get("content", ""), "index": p.payload.get("index", i)}
            for i, p in enumerate(points)
        ]
    except Exception as e:
        logger.error(f"Failed to retrieve chunks from Qdrant: {e}")
        return []


def clear_collection() -> dict:
    """Clear all data from the collection."""
    global _memory_vectors, _memory_bm25_corpus, _memory_bm25, _memory_chunks
    
    _memory_vectors = []
    _memory_bm25_corpus = []
    _memory_bm25 = None
    _memory_chunks = []
    
    client = _get_client()
    if client is not None:
        try:
            if client.collection_exists(QDRANT_COLLECTION):
                client.delete_collection(QDRANT_COLLECTION)
                logger.info(f"Deleted Qdrant collection {QDRANT_COLLECTION}")
            return {"status": "cleared", "storage": "qdrant"}
        except Exception as e:
            logger.error(f"Failed to clear Qdrant collection: {e}")
    
    logger.info("Cleared in-memory storage")
    return {"status": "cleared", "storage": "memory"}
