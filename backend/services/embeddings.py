"""Multi-provider embeddings: Azure OpenAI (APIM), Cohere (Bedrock), NVIDIA."""
import logging
import time
from typing import Any

import httpx
from openai import OpenAI

from config import (
    APIM_BASE_URL,
    APIM_SUBSCRIPTION_KEY,
    OPENAI_EMBEDDING_MODEL,
    EMBEDDING_MODELS,
    EMBEDDING_DIMENSIONS,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_BEDROCK_REGION,
    COHERE_EMBED_MODEL,
    NVIDIA_API_KEY,
    NVIDIA_EMBED_MODEL,
    NVIDIA_EMBED_BASE_URL,
)

logger = logging.getLogger(__name__)

EMBEDDING_TIMEOUT = 120.0
MAX_RETRIES = 3
RETRY_DELAY = 2.0


def _embed_openai_apim(texts: list[str], model_name: str) -> list[list[float]]:
    """
    Generate embeddings using Azure OpenAI via APIM.
    Based on the working reference: endpoint must end with '/'
    """
    if not APIM_BASE_URL or not APIM_SUBSCRIPTION_KEY:
        raise ValueError("APIM_BASE_URL and APIM_SUBSCRIPTION_KEY must be set for Azure OpenAI embeddings")
    
    # Ensure endpoint ends with / (as per reference code)
    endpoint = APIM_BASE_URL.rstrip("/") + "/"
    logger.info(f"Using APIM endpoint: {endpoint}")
    
    client = OpenAI(
        base_url=endpoint,
        api_key=APIM_SUBSCRIPTION_KEY,
        default_headers={"Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY},
        timeout=httpx.Timeout(EMBEDDING_TIMEOUT, connect=60.0),
        max_retries=MAX_RETRIES,
    )
    
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Embedding attempt {attempt + 1}/{MAX_RETRIES} for {len(texts)} texts using model '{model_name}'")
            response = client.embeddings.create(model=model_name, input=texts)
            logger.info(f"Embedding successful on attempt {attempt + 1}")
            return [d.embedding for d in response.data]
        except Exception as e:
            last_error = e
            logger.warning(f"Embedding attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
    
    raise last_error or Exception("Embedding failed after all retries")


def _embed_cohere_bedrock(texts: list[str], model_id: str) -> list[list[float]]:
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        raise ValueError("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set for Cohere Bedrock")
    import boto3
    import json
    client = boto3.client(
        "bedrock-runtime",
        region_name=AWS_BEDROCK_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )
    body = json.dumps({
        "texts": texts,
        "input_type": "search_document",
    })
    response = client.invoke_model(modelId=model_id, contentType="application/json", body=body)
    response_body = json.loads(response["body"].read())
    embeddings = response_body.get("embeddings")
    if isinstance(embeddings, dict):
        embeddings = embeddings.get("float", list(embeddings.values())[0] if embeddings else [])
    return embeddings


def _embed_nvidia(texts: list[str], model_id: str) -> list[list[float]]:
    if not NVIDIA_API_KEY:
        raise ValueError("NVIDIA_API_KEY must be set for NVIDIA embeddings")
    url = f"{NVIDIA_EMBED_BASE_URL.rstrip('/')}/embeddings"
    payload = {"input": texts, "model": model_id}
    
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"NVIDIA embedding attempt {attempt + 1}/{MAX_RETRIES}")
            with httpx.Client(timeout=httpx.Timeout(EMBEDDING_TIMEOUT, connect=30.0)) as http:
                r = http.post(
                    url,
                    json=payload,
                    headers={"Authorization": f"Bearer {NVIDIA_API_KEY}"},
                )
                r.raise_for_status()
            data = r.json()
            out = []
            for item in data.get("data", []):
                emb = item.get("embedding")
                if emb is not None:
                    out.append(emb)
            logger.info(f"NVIDIA embedding successful on attempt {attempt + 1}")
            return out
        except Exception as e:
            last_error = e
            logger.warning(f"NVIDIA embedding attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
    
    raise last_error or Exception("NVIDIA embedding failed after all retries")


def get_embedding_dimension(model_id: str) -> int:
    return EMBEDDING_DIMENSIONS.get(model_id, 0)


def embed_texts(
    texts: list[str],
    model: str = "azure-openai",
) -> tuple[list[list[float]], int]:
    """
    Embed a list of texts using the specified model id.
    model: one of azure-openai, cohere-embed-english-v3, nvidia-nv-embed-v1
    Returns (list of vectors, dimension).
    """
    if not texts:
        return [], get_embedding_dimension(model)
    dim = get_embedding_dimension(model)
    try:
        if model == "azure-openai":
            info = EMBEDDING_MODELS["azure-openai"]
            vectors = _embed_openai_apim(texts, info["model_name"])
        elif model == "cohere-embed-english-v3":
            vectors = _embed_cohere_bedrock(texts, COHERE_EMBED_MODEL)
        elif model == "nvidia-nv-embed-v1":
            vectors = _embed_nvidia(texts, NVIDIA_EMBED_MODEL)
        else:
            raise ValueError(f"Unknown embedding model: {model}")
        if not vectors:
            return [], dim
        return vectors, dim or len(vectors[0])
    except Exception as e:
        logger.error(f"Embedding failed for model {model}: {e}")
        raise
