"""Chunking strategies for RAG demo."""
from typing import Literal

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
)

# Semantic splitter would require an embedding model; we use recursive as semantic stand-in
# or we could use LangChain's semantic chunker with a simple embedding - for demo we offer
# character, recursive_character, and "semantic" (implemented as recursive with different params)
Strategy = Literal["character", "recursive_character", "semantic"]


def chunk_text(
    text: str,
    strategy: Strategy = "recursive_character",
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> list[dict]:
    """
    Split text into chunks using the given strategy.
    Returns list of {"content": str, "index": int} for each chunk.
    """
    if strategy == "character":
        splitter = CharacterTextSplitter(
            separator="\n",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
        )
    elif strategy == "recursive_character":
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    else:
        # "semantic" - use recursive with smaller chunks to approximate semantic boundaries
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=min(chunk_size, 256),
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    chunks = splitter.split_text(text)
    return [{"content": c, "index": i} for i, c in enumerate(chunks)]
