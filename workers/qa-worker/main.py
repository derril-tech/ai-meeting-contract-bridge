import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

import nats
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import init_db
from app.core.nats_client import NatsClient
from app.services.qa_service import QAService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
nats_client: NatsClient = None
qa_service: QAService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global nats_client, qa_service

    logger.info("Starting QA worker...")

    # Initialize database
    await init_db()

    # Initialize NATS client
    nats_client = NatsClient()
    await nats_client.connect()

    # Initialize services
    qa_service = QAService()

    # Subscribe to NATS subjects
    await nats_client.subscribe("qa.ask", handle_qa_ask)
    await nats_client.subscribe("draft.qa.analyze", handle_draft_qa_analyze)

    logger.info("QA worker started successfully")

    yield

    # Shutdown
    logger.info("Shutting down QA worker...")
    if nats_client:
        await nats_client.close()


app = FastAPI(
    title="QA Worker",
    description="AI Meeting Contract Bridge - Q&A and Contract Analysis Worker",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    services: Dict[str, str]


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services = {
        "nats": "connected" if nats_client and nats_client.is_connected() else "disconnected",
        "qa_service": "ready",
    }

    return HealthResponse(
        status="healthy" if all(s == "ready" or s == "connected" for s in services.values()) else "unhealthy",
        services=services,
    )


async def handle_qa_ask(msg):
    """Handle Q&A requests from NATS"""
    try:
        data = msg.data.decode()
        logger.info(f"Received QA ask message: {data}")

        # Parse the message
        qa_data = eval(data)  # In production, use proper JSON parsing

        # Generate answer
        answer = await generate_answer(qa_data)

        # Acknowledge the message
        await msg.ack()

    except Exception as e:
        logger.error(f"Error processing QA ask: {e}")
        # In production, implement proper error handling and DLQ


async def handle_draft_qa_analyze(msg):
    """Handle draft analysis requests from NATS"""
    try:
        data = msg.data.decode()
        logger.info(f"Received draft QA analyze message: {data}")

        # Parse the message
        analysis_data = eval(data)  # In production, use proper JSON parsing

        # Analyze draft
        analysis = await analyze_draft(analysis_data)

        # Acknowledge the message
        await msg.ack()

    except Exception as e:
        logger.error(f"Error processing draft QA analyze: {e}")
        # In production, implement proper error handling and DLQ


async def generate_answer(qa_data: Dict[str, Any]):
    """Generate answer for Q&A request"""
    try:
        draft_id = qa_data.get("draft_id")
        question = qa_data.get("question")
        context = qa_data.get("context", {})

        logger.info(f"Generating answer for draft {draft_id}: {question}")

        # Generate answer using QA service
        answer_data = await qa_service.generate_answer(
            draft_id=draft_id,
            question=question,
            context=context
        )

        # Publish answer event
        await nats_client.publish("qa.answered", {
            "draft_id": draft_id,
            "question": question,
            "answer": answer_data["answer"],
            "confidence": answer_data["confidence"],
            "citations": answer_data["citations"],
            "status": "completed",
        })

        logger.info(f"Successfully generated answer for draft {draft_id}")

    except Exception as e:
        logger.error(f"Error generating answer: {e}")

        # Publish failure event
        await nats_client.publish("qa.answered", {
            "draft_id": draft_id,
            "question": question,
            "error": str(e),
            "status": "failed",
        })


async def analyze_draft(analysis_data: Dict[str, Any]):
    """Analyze draft for missing/risky clauses and prep notes"""
    try:
        draft_id = analysis_data.get("draft_id")
        contract_type = analysis_data.get("contract_type", "nda")
        jurisdiction = analysis_data.get("jurisdiction", "US")

        logger.info(f"Analyzing draft {draft_id} for {contract_type} in {jurisdiction}")

        # Analyze draft using QA service
        analysis = await qa_service.analyze_draft(
            draft_id=draft_id,
            contract_type=contract_type,
            jurisdiction=jurisdiction
        )

        # Publish analysis event
        await nats_client.publish("draft.qa.analyzed", {
            "draft_id": draft_id,
            "analysis": analysis,
            "status": "completed",
        })

        logger.info(f"Successfully analyzed draft {draft_id}")

    except Exception as e:
        logger.error(f"Error analyzing draft: {e}")

        # Publish failure event
        await nats_client.publish("draft.qa.analyzed", {
            "draft_id": draft_id,
            "error": str(e),
            "status": "failed",
        })


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info",
    )
