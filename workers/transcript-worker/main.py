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
from app.services.transcript_service import TranscriptService
from app.services.diarization_service import DiarizationService
from app.services.role_tagging_service import RoleTaggingService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
nats_client: NatsClient = None
transcript_service: TranscriptService = None
diarization_service: DiarizationService = None
role_tagging_service: RoleTaggingService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global nats_client, transcript_service, diarization_service, role_tagging_service
    
    logger.info("Starting transcript worker...")
    
    # Initialize database
    await init_db()
    
    # Initialize NATS client
    nats_client = NatsClient()
    await nats_client.connect()
    
    # Initialize services
    transcript_service = TranscriptService()
    diarization_service = DiarizationService()
    role_tagging_service = RoleTaggingService()
    
    # Subscribe to NATS subjects
    await nats_client.subscribe("meeting.ingest", handle_meeting_ingest)
    
    logger.info("Transcript worker started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down transcript worker...")
    if nats_client:
        await nats_client.close()


app = FastAPI(
    title="Transcript Worker",
    description="AI Meeting Contract Bridge - Transcript Processing Worker",
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
        "transcript_service": "ready",
        "diarization_service": "ready",
        "role_tagging_service": "ready",
    }
    
    return HealthResponse(
        status="healthy" if all(s == "ready" or s == "connected" for s in services.values()) else "unhealthy",
        services=services,
    )


async def handle_meeting_ingest(msg):
    """Handle meeting ingest messages from NATS"""
    try:
        data = msg.data.decode()
        logger.info(f"Received meeting ingest message: {data}")
        
        # Parse the message
        meeting_data = eval(data)  # In production, use proper JSON parsing
        
        # Process the transcript
        await process_transcript(meeting_data)
        
        # Acknowledge the message
        await msg.ack()
        
    except Exception as e:
        logger.error(f"Error processing meeting ingest: {e}")
        # In production, implement proper error handling and DLQ


async def process_transcript(meeting_data: Dict[str, Any]):
    """Process transcript with diarization and role tagging"""
    try:
        meeting_id = meeting_data.get("meeting_id")
        s3_key = meeting_data.get("transcript_s3_key")
        
        logger.info(f"Processing transcript for meeting {meeting_id}")
        
        # Download transcript from S3
        transcript_text = await transcript_service.download_transcript(s3_key)
        
        # Perform diarization
        speaker_turns = await diarization_service.diarize(transcript_text)
        
        # Perform role tagging
        role_tags = await role_tagging_service.tag_roles(speaker_turns)
        
        # Detect language
        language = await transcript_service.detect_language(transcript_text)
        
        # Update meeting with processing results
        processing_result = {
            "speakerTurns": speaker_turns,
            "roleTags": role_tags,
            "language": language,
            "confidence": 0.85,  # Placeholder
        }
        
        # Publish completion event
        await nats_client.publish("meeting.processed", {
            "meeting_id": meeting_id,
            "processing_result": processing_result,
            "status": "completed",
        })
        
        logger.info(f"Successfully processed transcript for meeting {meeting_id}")
        
    except Exception as e:
        logger.error(f"Error processing transcript: {e}")
        
        # Publish failure event
        await nats_client.publish("meeting.processed", {
            "meeting_id": meeting_id,
            "error": str(e),
            "status": "failed",
        })


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )

