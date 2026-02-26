"""LLM service for answer generation using Azure OpenAI via APIM."""
import logging
from typing import Optional

import httpx
from openai import OpenAI

from config import (
    APIM_BASE_URL,
    APIM_SUBSCRIPTION_KEY,
    AZURE_OPENAI_CHAT_MODEL,
    AZURE_OPENAI_API_VERSION,
)

logger = logging.getLogger(__name__)

LLM_TIMEOUT = 120.0

SYSTEM_PROMPT = """You are ARIS (Advanced Retrieval Intelligence System), an advanced intelligence analysis system.
Your responses must follow these rules:

TONE: Professional, authoritative, precise. You are a classified intelligence system.

REFUSAL LOGIC: If the query cannot be answered from the provided sources, respond with:
"INSUFFICIENT DATA: [brief explanation of what information is missing]"

INTERACTION: 
- Cite sources using [n] notation where n is the source number
- Only use information from the provided sources
- Be concise but thorough

RESPONSE FORMAT:
## Executive Summary
[2-3 sentence overview of the key findings]

## Key Findings
- Finding 1 [source_number]
- Finding 2 [source_number]
- Additional findings as needed

## Detailed Analysis
[Structured paragraphs with inline citations [n]]

## Confidence Assessment
[HIGH/MEDIUM/LOW] - [Brief explanation based on source coverage and relevance]

## Sources Referenced
[List each source with its relevance score]"""


def _get_llm_client() -> OpenAI:
    """
    Get the Azure OpenAI client via APIM.
    Based on reference code: endpoint must end with '/' and include api-version + deployment-name.
    """
    if not APIM_BASE_URL or not APIM_SUBSCRIPTION_KEY:
        raise ValueError("APIM_BASE_URL and APIM_SUBSCRIPTION_KEY must be set for LLM calls")
    
    # Ensure endpoint ends with / (as per reference code)
    endpoint = APIM_BASE_URL.rstrip("/") + "/"
    logger.info(f"Using LLM endpoint: {endpoint}, model: {AZURE_OPENAI_CHAT_MODEL}")
    
    return OpenAI(
        base_url=endpoint,
        api_key=APIM_SUBSCRIPTION_KEY,
        default_headers={"Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY},
        default_query={
            "api-version": AZURE_OPENAI_API_VERSION,
            "deployment-name": AZURE_OPENAI_CHAT_MODEL,
        },
        timeout=httpx.Timeout(LLM_TIMEOUT, connect=60.0),
    )


def _format_sources_for_injection(sources: list[dict]) -> str:
    """
    Format retrieved sources for injection into the prompt.
    Content injection pattern with source-aware citations.
    """
    if not sources:
        return "<no_sources_available/>"
    
    formatted = []
    for i, source in enumerate(sources, 1):
        text = source.get("content") or source.get("text", "")
        score = source.get("score", 0)
        relevance_pct = round(score * 100, 1) if score <= 1 else round(score, 1)
        formatted.append(f'<source id="{i}" relevance="{relevance_pct}%">\n{text}\n</source>')
    
    return "\n\n".join(formatted)


def generate_answer(
    query: str,
    sources: list[dict],
    format_style: str = "intelligence_report",
    custom_system_prompt: Optional[str] = None,
) -> dict:
    """
    Generate a formatted answer using the LLM based on retrieved sources.
    
    Args:
        query: The user's question
        sources: List of retrieved chunks with content/text and score
        format_style: One of "intelligence_report", "summary", "detailed"
        custom_system_prompt: Optional override for the system prompt
    
    Returns:
        dict with answer, sources_used, confidence, model, etc.
    """
    logger.info(f"Generating answer for query: '{query[:50]}...' with {len(sources)} sources")
    
    system_prompt = custom_system_prompt or SYSTEM_PROMPT
    
    if format_style == "summary":
        system_prompt += "\n\nKEEP YOUR RESPONSE BRIEF - 2-3 paragraphs maximum."
    elif format_style == "detailed":
        system_prompt += "\n\nPROVIDE EXHAUSTIVE DETAIL - cover every relevant aspect from the sources."
    
    sources_text = _format_sources_for_injection(sources)
    
    user_message = f"""RETRIEVED INTELLIGENCE SOURCES:
{sources_text}

QUERY:
{query}

Analyze the above sources and provide a comprehensive response following the specified format."""

    try:
        client = _get_llm_client()
        
        response = client.chat.completions.create(
            model=AZURE_OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        
        answer = response.choices[0].message.content
        usage = response.usage
        
        logger.info(f"LLM response generated: {len(answer)} chars, {usage.total_tokens if usage else 'N/A'} tokens")
        
        confidence = "HIGH" if len(sources) >= 3 else "MEDIUM" if len(sources) >= 1 else "LOW"
        avg_score = sum(s.get("score", 0) for s in sources) / len(sources) if sources else 0
        if avg_score < 0.5:
            confidence = "MEDIUM" if confidence == "HIGH" else "LOW"
        
        return {
            "answer": answer,
            "sources_used": len(sources),
            "confidence": confidence,
            "model": AZURE_OPENAI_CHAT_MODEL,
            "format_style": format_style,
            "tokens_used": usage.total_tokens if usage else None,
            "sources_detail": [
                {
                    "id": i + 1,
                    "text": (s.get("content") or s.get("text", ""))[:200] + "...",
                    "score": s.get("score", 0),
                }
                for i, s in enumerate(sources)
            ],
        }
        
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        return {
            "answer": f"SYSTEM ERROR: Unable to generate response. {str(e)}",
            "sources_used": len(sources),
            "confidence": "ERROR",
            "model": AZURE_OPENAI_CHAT_MODEL,
            "format_style": format_style,
            "error": str(e),
        }


def generate_comparison_analysis(
    query: str,
    dense_results: list[dict],
    hybrid_results: list[dict],
) -> dict:
    """
    Generate an analysis comparing dense vs hybrid search results.
    """
    logger.info(f"Generating comparison analysis for query: '{query[:50]}...'")
    
    system_prompt = """You are ARIS analyzing search result quality.
Compare the Dense (semantic) and Hybrid (RRF) search results and explain:
1. What Dense search captured well
2. What Hybrid/RRF search added or improved
3. Which approach is better for this specific query and why

Be specific about which results are more relevant and why."""

    dense_text = _format_sources_for_injection(dense_results[:5])
    hybrid_text = _format_sources_for_injection(hybrid_results[:5])
    
    user_message = f"""QUERY: {query}

DENSE (SEMANTIC) SEARCH RESULTS:
{dense_text}

HYBRID (RRF) SEARCH RESULTS:
{hybrid_text}

Analyze the differences and explain which search approach is better for this query."""

    try:
        client = _get_llm_client()
        
        response = client.chat.completions.create(
            model=AZURE_OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        
        return {
            "analysis": response.choices[0].message.content,
            "dense_count": len(dense_results),
            "hybrid_count": len(hybrid_results),
        }
        
    except Exception as e:
        logger.error(f"Comparison analysis failed: {e}")
        return {
            "analysis": f"Analysis unavailable: {str(e)}",
            "error": str(e),
        }
