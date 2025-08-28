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
from app.services.decision_service import DecisionService
from app.services.entity_extraction_service import EntityExtractionService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
nats_client: NatsClient = None
decision_service: DecisionService = None
entity_extraction_service: EntityExtractionService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global nats_client, decision_service, entity_extraction_service
    
    logger.info("Starting decision worker...")
    
    # Initialize database
    await init_db()
    
    # Initialize NATS client
    nats_client = NatsClient()
    await nats_client.connect()
    
    # Initialize services
    decision_service = DecisionService()
    entity_extraction_service = EntityExtractionService()
    
    # Subscribe to NATS subjects
    await nats_client.subscribe("meeting.processed", handle_meeting_processed)
    await nats_client.subscribe("decisions.extract", handle_decisions_extract)
    
    logger.info("Decision worker started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down decision worker...")
    if nats_client:
        await nats_client.close()


app = FastAPI(
    title="Decision Worker",
    description="AI Meeting Contract Bridge - Decision Extraction Worker",
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
        "decision_service": "ready",
        "entity_extraction_service": "ready",
    }
    
    return HealthResponse(
        status="healthy" if all(s == "ready" or s == "connected" for s in services.values()) else "unhealthy",
        services=services,
    )


async def handle_meeting_processed(msg):
    """Handle meeting processed messages from NATS"""
    try:
        data = msg.data.decode()
        logger.info(f"Received meeting processed message: {data}")
        
        # Parse the message
        meeting_data = eval(data)  # In production, use proper JSON parsing
        
        # Extract decisions from the processed meeting
        await extract_decisions(meeting_data)
        
        # Acknowledge the message
        await msg.ack()
        
    except Exception as e:
        logger.error(f"Error processing meeting processed: {e}")
        # In production, implement proper error handling and DLQ


async def handle_decisions_extract(msg):
    """Handle manual decision extraction requests"""
    try:
        data = msg.data.decode()
        logger.info(f"Received decisions extract message: {data}")
        
        # Parse the message
        request_data = eval(data)  # In production, use proper JSON parsing
        
        # Extract decisions
        await extract_decisions(request_data)
        
        # Acknowledge the message
        await msg.ack()
        
    except Exception as e:
        logger.error(f"Error processing decisions extract: {e}")
        # In production, implement proper error handling and DLQ


async def extract_decisions(meeting_data: Dict[str, Any]):
    """Extract decisions and entities from meeting data"""
    try:
        meeting_id = meeting_data.get("meeting_id")
        transcript_text = meeting_data.get("transcript_text")
        speaker_turns = meeting_data.get("processing_result", {}).get("speakerTurns", [])
        
        logger.info(f"Extracting decisions for meeting {meeting_id}")
        
        # Extract entities (parties, organizations, amounts, dates, governing law)
        entities = await entity_extraction_service.extract_entities(transcript_text)
        
        # Extract decisions (obligations, deadlines, approvals, deliverables)
        decisions = await decision_service.extract_decisions(
            transcript_text, 
            speaker_turns, 
            entities
        )
        
        # Calculate confidence scores and provenance spans
        for decision in decisions:
            decision["confidence"] = await decision_service.calculate_confidence(decision)
            decision["spans"] = await decision_service.extract_spans(decision, transcript_text)
        
        # Store decisions in database
        await decision_service.store_decisions(meeting_id, decisions)
        
        # Publish completion event
        await nats_client.publish("decisions.extracted", {
            "meeting_id": meeting_id,
            "decisions": decisions,
            "entities": entities,
            "status": "completed",
        })
        
        logger.info(f"Successfully extracted {len(decisions)} decisions for meeting {meeting_id}")
        
    except Exception as e:
        logger.error(f"Error extracting decisions: {e}")
        
        # Publish failure event
        await nats_client.publish("decisions.extracted", {
            "meeting_id": meeting_id,
            "error": str(e),
            "status": "failed",
        })


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )

