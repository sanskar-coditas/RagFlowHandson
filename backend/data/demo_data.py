"""Pre-loaded and trap datasets for RAG demo."""

PRELOADED_DATASETS = {
    "rag_intro": {
        "name": "RAG Overview",
        "description": "Comprehensive introduction to Retrieval-Augmented Generation",
        "text": """
Retrieval-Augmented Generation (RAG) combines retrieval systems with generative language models.
You first index documents into a vector store. At query time, you retrieve the most relevant chunks
and pass them as context to the LLM. This reduces hallucination and keeps answers grounded in your data.

Chunking strategies matter: too small chunks lose context, too large add noise. Common strategies include
fixed-size character splitting, recursive character splitting on separators, and semantic chunking.
Recursive character splitting is often the best default choice, as it respects document structure.

Embeddings turn text into dense vectors. Popular embedding models include OpenAI's text-embedding-3,
Cohere's embed-v3, and open-source models like NVIDIA's nv-embed-v1. Each model has different dimensions:
1536 for OpenAI, 1024 for Cohere, and 4096 for NVIDIA. Higher dimensions can capture more nuance but
require more storage and computation.

Similarity search finds the nearest vectors by cosine similarity, dot product, or Euclidean distance.
Cosine similarity is most common as it normalizes for vector magnitude. The choice of metric affects results.

Hybrid search combines dense (semantic) and sparse (keyword, e.g. BM25) retrieval. BM25 uses term frequency
and inverse document frequency to rank documents. Dense search captures semantic meaning but can miss exact
keyword matches. Combining both with Reciprocal Rank Fusion (RRF) gives the best of both worlds.

RRF formula: score = sum(1 / (k + rank)) where k is typically 60. This gives higher weight to top-ranked
results from either search method.
""".strip(),
    },
    "api_security": {
        "name": "API Security Best Practices",
        "description": "Comprehensive guide to securing REST APIs",
        "text": """
To secure an API, use HTTPS everywhere and validate all inputs. Never trust user input - sanitize and validate
everything. Implement strong authentication using OAuth2, API keys, or JWT tokens. Use refresh tokens with
short expiration times (15 minutes for access tokens, days for refresh tokens).

Authorization is equally important. Implement Role-Based Access Control (RBAC) or Attribute-Based Access
Control (ABAC). Apply the principle of least privilege - give users only the permissions they need.

Rate limiting and throttling prevent abuse and DDoS attacks. Implement per-user and per-IP rate limits.
Use exponential backoff for retries. Consider using a WAF (Web Application Firewall) for additional protection.

Store secrets in a vault like HashiCorp Vault or AWS Secrets Manager, never in code or environment variables
that might be exposed. Rotate secrets regularly. Use encryption at rest and in transit.

Log and monitor access for anomalies. Implement audit trails for sensitive operations. Use SIEM systems
for real-time threat detection. Set up alerts for unusual patterns like repeated failed authentication attempts.

API versioning helps maintain backward compatibility. Use semantic versioning and deprecation policies.
Document your API thoroughly with OpenAPI/Swagger specifications.

For GraphQL APIs, implement query depth limiting and complexity analysis to prevent resource exhaustion attacks.
Disable introspection in production.
""".strip(),
    },
    "chunking_strategies": {
        "name": "Chunking Strategies Deep Dive",
        "description": "Detailed explanation of different chunking approaches",
        "text": """
Chunking is the process of splitting documents into smaller pieces for indexing and retrieval.
The right chunking strategy can significantly impact RAG quality.

Fixed-size character chunking splits text at fixed intervals (e.g., every 500 characters).
It's simple but often breaks mid-sentence or mid-paragraph, losing context. Best avoided for most use cases.

Recursive character chunking splits on separators in order of priority: paragraphs (\\n\\n), sentences (.),
commas, and spaces. This preserves natural text boundaries while maintaining consistent chunk sizes.
It's the most commonly recommended strategy and works well for most documents.

Semantic chunking uses embeddings to identify topic boundaries. It creates chunks based on semantic
similarity rather than character count. This produces more coherent chunks but requires more computation.
Good for documents with varied topics or complex structure.

Document structure-aware chunking respects markdown headers, HTML tags, or code blocks. It keeps
related content together and is essential for technical documentation or code files.

Overlap is crucial - chunks should overlap by 10-20% to ensure context isn't lost at boundaries.
A chunk size of 500-1000 characters with 100-200 character overlap works well for most use cases.

Consider your retrieval use case: Q&A benefits from smaller chunks (300-500 chars), while summarization
needs larger chunks (1000-2000 chars) for broader context.
""".strip(),
    },
    "embedding_models": {
        "name": "Understanding Embedding Models",
        "description": "Guide to different embedding models and their characteristics",
        "text": """
Embedding models convert text into dense numerical vectors that capture semantic meaning.
Different models have different strengths, dimensions, and performance characteristics.

OpenAI's text-embedding-3 family (small: 1536d, large: 3072d) offers excellent quality and is widely used.
The large model captures more nuance but is slower and more expensive. Both support dimensionality reduction.

Cohere's embed-v3 (1024d) is optimized for search and retrieval tasks. It supports multiple languages
and has specialized modes for different use cases (search_document, search_query, classification, clustering).
Available via AWS Bedrock for enterprise deployments.

NVIDIA's nv-embed-v1 (4096d) is an open-source model with very high dimensionality. It excels at
capturing fine-grained semantic distinctions but requires more storage and computation.
Available via NVIDIA's NIM API for free usage.

When choosing an embedding model, consider:
1. Dimension size - higher dimensions capture more information but cost more to store and search
2. Language support - some models work better with specific languages
3. Task optimization - models may be trained for search, clustering, or classification
4. Latency requirements - larger models are slower
5. Cost - API pricing varies significantly

Always embed your query with the same model used to embed documents. Mixing models produces incompatible
vectors and poor search results.

For production, consider fine-tuning embeddings on your domain data for better performance.
""".strip(),
    },
    "vector_databases": {
        "name": "Vector Database Overview",
        "description": "Understanding vector databases for RAG applications",
        "text": """
Vector databases are specialized systems for storing and searching high-dimensional vectors.
They're essential for RAG applications that need to find semantically similar content quickly.

Qdrant is a high-performance vector database written in Rust. It supports filtering, payload storage,
and multiple distance metrics (cosine, dot product, Euclidean). Qdrant Cloud offers managed hosting.

Pinecone is a fully managed vector database with excellent scaling and low latency. It supports
metadata filtering and namespaces for multi-tenant applications. Good for production deployments.

Weaviate is an open-source vector database with built-in ML modules. It supports hybrid search
combining vector and keyword search. Good for complex queries and data relationships.

Milvus is designed for massive scale with support for billions of vectors. It offers multiple
index types (IVF, HNSW, ANNOY) and supports GPU acceleration. Best for large-scale deployments.

ChromaDB is lightweight and developer-friendly. Great for prototyping and small projects.
Supports local and server modes with simple Python/JavaScript APIs.

When choosing a vector database, consider:
1. Scale - how many vectors do you need to store?
2. Latency requirements - milliseconds matter for real-time applications
3. Filtering needs - can you filter on metadata alongside vector search?
4. Deployment model - managed vs self-hosted
5. Cost - pricing models vary significantly
""".strip(),
    },
    "hybrid_search_details": {
        "name": "Hybrid Search and RRF Explained",
        "description": "Deep dive into hybrid search and Reciprocal Rank Fusion",
        "text": """
Hybrid search combines multiple retrieval methods to improve search quality.
The most common combination is dense (semantic) search with sparse (keyword) search.

Dense search uses embedding vectors to find semantically similar content. It understands meaning
and context - "automobile" matches "car" even without exact word overlap. However, it can miss
exact keyword matches that users expect.

Sparse search uses term frequency methods like BM25 (Best Match 25). It excels at exact keyword
matching and handles rare terms well. BM25 considers term frequency, inverse document frequency,
and document length normalization. It's fast and interpretable but misses semantic relationships.

Reciprocal Rank Fusion (RRF) combines results from multiple retrieval methods. The formula is:
RRF_score = Σ(1 / (k + rank)) where k is typically 60.

Why k=60? This constant dampens the impact of rank differences. With k=60:
- Rank 1: score = 1/61 = 0.0164
- Rank 2: score = 1/62 = 0.0161
- Rank 10: score = 1/70 = 0.0143

Results appearing in both dense and sparse top-k get their scores summed, boosting their final rank.
This naturally promotes results that satisfy both semantic and keyword criteria.

Example: If a document ranks #1 in dense search and #3 in sparse search:
RRF_score = 1/61 + 1/63 = 0.0164 + 0.0159 = 0.0323

A document ranking #2 in only dense search: RRF_score = 1/62 = 0.0161

The document appearing in both lists ranks higher despite not being #1 in either.

Hybrid search is particularly valuable when:
1. Users mix conceptual queries with specific terms
2. Your corpus contains technical jargon or acronyms
3. You need high recall without sacrificing precision
""".strip(),
    },
}

TRAP_DATASET = {
    "name": "Similarity vs Relevance (Trap)",
    "description": "Chunks designed to demonstrate the gap between similarity and relevance",
    "query": "How to secure an API",
    "chunks": [
        {
            "content": "A secure API is hard to build, unlike an insecure API which is easy. Many developers forget to secure their API.",
            "is_trap": True,
            "explanation": "High similarity to 'secure API' but no actionable advice",
        },
        {
            "content": "This document mentions the word API and secure many times. API security is important. Secure your API with care.",
            "is_trap": True,
            "explanation": "Keyword-stuffed but content-free",
        },
        {
            "content": "The API was secure from external threats. The secure API connection ensured data safety.",
            "is_trap": True,
            "explanation": "Uses target words in different context",
        },
        {
            "content": "To secure an API, implement HTTPS, input validation, OAuth2 authentication, rate limiting, and proper secret management.",
            "is_trap": False,
            "explanation": "Actually relevant - provides concrete steps",
        },
        {
            "content": "Best practices for API security include authentication, authorization, encryption in transit, audit logging, and regular security testing.",
            "is_trap": False,
            "explanation": "Actually relevant - comprehensive security advice",
        },
        {
            "content": "Building secure APIs requires understanding common vulnerabilities like injection attacks, broken authentication, and sensitive data exposure.",
            "is_trap": False,
            "explanation": "Actually relevant - discusses real security concerns",
        },
    ],
    "text": """
A secure API is hard to build, unlike an insecure API which is easy. Many developers forget to secure their API.
This document mentions the word API and secure many times. API security is important. Secure your API with care.
The API was secure from external threats. The secure API connection ensured data safety.

To secure an API, implement HTTPS, input validation, OAuth2 authentication, rate limiting, and proper secret management.
Best practices for API security include authentication, authorization, encryption in transit, audit logging, and regular security testing.
Building secure APIs requires understanding common vulnerabilities like injection attacks, broken authentication, and sensitive data exposure.
""".strip(),
}


def get_preloaded_text(dataset_id: str) -> str:
    if dataset_id not in PRELOADED_DATASETS:
        return ""
    return PRELOADED_DATASETS[dataset_id]["text"]


def get_trap_text() -> str:
    return TRAP_DATASET["text"]


def get_all_datasets() -> dict:
    return PRELOADED_DATASETS


def get_combined_demo_text() -> str:
    """Get all demo datasets combined into one text for comprehensive indexing."""
    texts = [ds["text"] for ds in PRELOADED_DATASETS.values()]
    texts.append(TRAP_DATASET["text"])
    return "\n\n---\n\n".join(texts)
