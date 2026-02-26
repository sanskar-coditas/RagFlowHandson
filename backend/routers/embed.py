import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.embeddings import embed_texts
from config import EMBEDDING_MODELS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/embed", tags=["embeddings"])

VALID_MODEL_IDS = list(EMBEDDING_MODELS.keys())
DEFAULT_MODEL = "azure-openai"


class EmbedRequest(BaseModel):
    texts: Optional[list[str]] = None
    chunks: Optional[list[str]] = None
    model: Optional[str] = None
    model_id: Optional[str] = None


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
    dimension: int
    model: str
    embeddings: list[list[float]]
    dimensions: int


@router.get("/models")
def list_models():
    """List available embedding models with id, dimension, provider, and label."""
    models = []
    for mid, info in EMBEDDING_MODELS.items():
        models.append({
            "id": mid,
            "dimension": info["dimension"],
            "dimensions": info["dimension"],
            "provider": info["provider"],
            "label": f"{info['provider']} ({info['dimension']}d)",
        })
    return {
        "models": models,
        "dimensions": {mid: info["dimension"] for mid, info in EMBEDDING_MODELS.items()},
    }


@router.post("", response_model=EmbedResponse)
def embed(body: EmbedRequest):
    """Embed texts or chunks. Accepts model_id or model."""
    texts = body.texts or body.chunks or []
    model = body.model_id or body.model or DEFAULT_MODEL
    if model not in VALID_MODEL_IDS:
        logger.warning(f"Unknown model '{model}', falling back to {DEFAULT_MODEL}")
        model = DEFAULT_MODEL
    
    try:
        vectors, dim = embed_texts(texts, model=model)
        return EmbedResponse(
            vectors=vectors,
            dimension=dim,
            model=model,
            embeddings=vectors,
            dimensions=dim,
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Embedding failed: {error_msg}")
        
        if "timed out" in error_msg.lower() or "timeout" in error_msg.lower():
            raise HTTPException(
                status_code=504,
                detail=f"Embedding service timeout. The API may be slow or unreachable. Please try again. Error: {error_msg}"
            )
        elif "connection" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail=f"Cannot connect to embedding service. Please check network connectivity. Error: {error_msg}"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Embedding failed: {error_msg}"
            )
