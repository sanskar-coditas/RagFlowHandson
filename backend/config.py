"""Application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# OpenAI / Azure APIM (embedding)
# ---------------------------------------------------------------------------
APIM_BASE_URL = os.getenv("APIM_BASE_URL", "").rstrip("/")
APIM_SUBSCRIPTION_KEY = os.getenv("APIM_SUBSCRIPTION_KEY", "")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_EMBEDDING_API_VERSION = os.getenv("AZURE_OPENAI_EMBEDDING_API_VERSION", "2025-01-01-preview")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "embedding")  # deployment name for Azure/APIM


# ---------------------------------------------------------------------------
# Cohere via AWS Bedrock
# ---------------------------------------------------------------------------
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_BEDROCK_REGION = os.getenv("AWS_BEDROCK_REGION", "us-east-1")
COHERE_EMBED_MODEL = os.getenv("EMBEDDINGS_MODEL_NAME", "cohere.embed-english-v3")

# ---------------------------------------------------------------------------
# NVIDIA NIM (free embedding)
# ---------------------------------------------------------------------------
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_EMBED_MODEL = "nvidia/nv-embed-v1"
NVIDIA_EMBED_BASE_URL = os.getenv("NVIDIA_EMBED_BASE_URL", "https://integrate.api.nvidia.com/v1")

# ---------------------------------------------------------------------------
# Embedding model registry: id -> (dimension, provider_label)
# Dimensions: Azure OpenAI 1536; Cohere v3 1024; NVIDIA nv-embed-v1 4096
# ---------------------------------------------------------------------------
EMBEDDING_MODELS = {
    "azure-openai": {
        "dimension": 1536,
        "provider": "Azure OpenAI (APIM)",
        "model_name": OPENAI_EMBEDDING_MODEL,
    },
    "cohere-embed-english-v3": {
        "dimension": 1024,
        "provider": "Cohere (Bedrock)",
        "model_name": COHERE_EMBED_MODEL,
    },
    "nvidia-nv-embed-v1": {
        "dimension": 4096,
        "provider": "NVIDIA (free)",
        "model_name": NVIDIA_EMBED_MODEL,
    },
}

# ---------------------------------------------------------------------------
# LLM for answer generation (Azure OpenAI via APIM)
# ---------------------------------------------------------------------------
AZURE_OPENAI_CHAT_MODEL = os.getenv("AZURE_OPENAI_CHAT_MODEL", "gpt-4.1")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")

EMBEDDING_DIMENSIONS = {k: v["dimension"] for k, v in EMBEDDING_MODELS.items()}

# ---------------------------------------------------------------------------
# Qdrant: cloud cluster or local
# ---------------------------------------------------------------------------
QDRANT_URL = os.getenv("QDRANT_URL", "")  # e.g. https://xxx.us-east4-0.gcp.cloud.qdrant.io
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "rag_demo")
# Use cloud when QDRANT_URL is set; else in-memory when QDRANT_IN_MEMORY=1
QDRANT_IN_MEMORY = os.getenv("QDRANT_IN_MEMORY", "1").lower() in ("1", "true", "yes")

def use_qdrant_cloud() -> bool:
    return bool(QDRANT_URL.strip())
