import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import chunking, embed, search, rag

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="RAG Educational Demonstration API",
    version="2.0.0",
    description="Advanced RAG demo with dense, sparse, hybrid search and LLM answer generation",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chunking.router)
app.include_router(embed.router)
app.include_router(search.router)
app.include_router(rag.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the RAG Educational Demonstration API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
