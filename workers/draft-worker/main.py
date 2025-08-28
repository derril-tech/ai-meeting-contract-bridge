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
from app.services.draft_service import DraftService
from app.services.clause_service import ClauseService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
nats_client: NatsClient = None
draft_service: DraftService = None
clause_service: ClauseService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global nats_client, draft_service, clause_service
    
    logger.info("Starting draft worker...")
    
    # Initialize database
    await init_db()
    
    # Initialize NATS client
    nats_client = NatsClient()
    await nats_client.connect()
    
    # Initialize services
    draft_service = DraftService()
    clause_service = ClauseService()
    
    # Subscribe to NATS subjects
    await nats_client.subscribe("decisions.extracted", handle_decisions_extracted)
    await nats_client.subscribe("draft.make", handle_draft_make)
    
    logger.info("Draft worker started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down draft worker...")
    if nats_client:
        await nats_client.close()


app = FastAPI(
    title="Draft Worker",
    description="AI Meeting Contract Bridge - Contract Draft Generation Worker",
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
        "draft_service": "ready",
        "clause_service": "ready",
    }
    
    return HealthResponse(
        status="healthy" if all(s == "ready" or s == "connected" for s in services.values()) else "unhealthy",
        services=services,
    )


async def handle_decisions_extracted(msg):
    """Handle decisions extracted messages from NATS"""
    try:
        data = msg.data.decode()
        logger.info(f"Received decisions extracted message: {data}")
        
        # Parse the message
        decisions_data = eval(data)  # In production, use proper JSON parsing
        
        # Generate draft from decisions
        await generate_draft(decisions_data)
        
        # Acknowledge the message
        await msg.ack()
        
    except Exception as e:
        logger.error(f"Error processing decisions extracted: {e}")
        # In production, implement proper error handling and DLQ


async def handle_draft_make(msg):
    """Handle manual draft generation requests"""
    try:
        data = msg.data.decode()
        logger.info(f"Received draft make message: {data}")
        
        # Parse the message
        request_data = eval(data)  # In production, use proper JSON parsing
        
        # Generate draft
        await generate_draft(request_data)
        
        # Acknowledge the message
        await msg.ack()
        
    except Exception as e:
        logger.error(f"Error processing draft make: {e}")
        # In production, implement proper error handling and DLQ


async def generate_draft(data: Dict[str, Any]):
    """Generate contract draft from decisions and entities"""
    try:
        meeting_id = data.get("meeting_id")
        decisions = data.get("decisions", [])
        entities = data.get("entities", {})
        contract_type = data.get("contract_type", "nda")
        jurisdiction = data.get("jurisdiction", "US")
        
        logger.info(f"Generating {contract_type} draft for meeting {meeting_id}")
        
        # Retrieve relevant clauses
        clauses = await clause_service.retrieve_clauses(
            contract_type=contract_type,
            jurisdiction=jurisdiction,
            decisions=decisions,
            entities=entities
        )
        
        # Generate draft content
        draft_content = await draft_service.generate_draft(
            contract_type=contract_type,
            clauses=clauses,
            decisions=decisions,
            entities=entities
        )
        
        # Identify placeholders and deviations
        placeholders = await draft_service.identify_placeholders(draft_content)
        deviations = await draft_service.identify_deviations(clauses, contract_type)
        
        # Store draft in database
        draft_id = await draft_service.store_draft(
            meeting_id=meeting_id,
            contract_type=contract_type,
            content=draft_content,
            placeholders=placeholders,
            deviations=deviations
        )
        
        # Publish completion event
        await nats_client.publish("draft.generated", {
            "meeting_id": meeting_id,
            "draft_id": draft_id,
            "contract_type": contract_type,
            "placeholders": placeholders,
            "deviations": deviations,
            "status": "completed",
        })
        
        logger.info(f"Successfully generated draft {draft_id} for meeting {meeting_id}")
        
    except Exception as e:
        logger.error(f"Error generating draft: {e}")
        
        # Publish failure event
        await nats_client.publish("draft.generated", {
            "meeting_id": meeting_id,
            "error": str(e),
            "status": "failed",
        })


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info",
    )

