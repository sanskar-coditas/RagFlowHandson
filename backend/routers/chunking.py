from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from services.chunking import chunk_text
from data import get_preloaded_text, get_trap_text, get_combined_demo_text, PRELOADED_DATASETS, TRAP_DATASET

router = APIRouter(prefix="/chunk", tags=["chunking"])


class ChunkRequest(BaseModel):
    text: str | None = None
    dataset_id: str | None = None
    trap: bool = False
    all_datasets: bool = False
    strategy: Literal["character", "recursive_character", "semantic"] = "recursive_character"
    chunk_size: int = 512
    chunk_overlap: int = 50


class ChunkResponse(BaseModel):
    chunks: list[dict]
    strategy: str
    chunk_size: int
    chunk_overlap: int
    source: str


@router.get("/datasets")
def list_datasets():
    """List pre-loaded and trap dataset ids and metadata."""
    return {
        "preloaded": {
            k: {"name": v["name"], "description": v["description"]}
            for k, v in PRELOADED_DATASETS.items()
        },
        "trap": {
            "name": TRAP_DATASET["name"],
            "description": TRAP_DATASET["description"],
            "query": TRAP_DATASET["query"],
        },
        "combined": {
            "name": "All Demo Datasets",
            "description": "All preloaded datasets combined for comprehensive demonstration",
        },
    }


@router.post("", response_model=ChunkResponse)
def chunk_document(body: ChunkRequest):
    """
    Chunk text using the given strategy. Provide either `text`, `dataset_id`, `trap=True`, or `all_datasets=True`.
    """
    source = "custom"
    
    if body.all_datasets:
        text = get_combined_demo_text()
        source = "all_datasets"
    elif body.trap:
        text = get_trap_text()
        source = "trap"
    elif body.dataset_id:
        text = get_preloaded_text(body.dataset_id)
        source = body.dataset_id
        if not text:
            raise HTTPException(404, f"Unknown dataset_id: {body.dataset_id}")
    elif body.text:
        text = body.text
        source = "custom"
    else:
        raise HTTPException(400, "Provide one of: text, dataset_id, trap=True, or all_datasets=True")

    chunks = chunk_text(
        text,
        strategy=body.strategy,
        chunk_size=body.chunk_size,
        chunk_overlap=body.chunk_overlap,
    )
    return ChunkResponse(
        chunks=chunks,
        strategy=body.strategy,
        chunk_size=body.chunk_size,
        chunk_overlap=body.chunk_overlap,
        source=source,
    )
