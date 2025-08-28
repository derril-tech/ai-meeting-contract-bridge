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
from app.services.export_service import ExportService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
nats_client: NatsClient = None
export_service: ExportService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global nats_client, export_service

    logger.info("Starting export worker...")

    # Initialize database
    await init_db()

    # Initialize NATS client
    nats_client = NatsClient()
    await nats_client.connect()

    # Initialize services
    export_service = ExportService()

    # Subscribe to NATS subjects
    await nats_client.subscribe("export.make", handle_export_make)

    logger.info("Export worker started successfully")

    yield

    # Shutdown
    logger.info("Shutting down export worker...")
    if nats_client:
        await nats_client.close()


app = FastAPI(
    title="Export Worker",
    description="AI Meeting Contract Bridge - Document Export Worker",
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
        "export_service": "ready",
    }

    return HealthResponse(
        status="healthy" if all(s == "ready" or s == "connected" for s in services.values()) else "unhealthy",
        services=services,
    )


async def handle_export_make(msg):
    """Handle export requests from NATS"""
    try:
        data = msg.data.decode()
        logger.info(f"Received export make message: {data}")

        # Parse the message
        export_data = eval(data)  # In production, use proper JSON parsing

        # Generate export
        await generate_export(export_data)

        # Acknowledge the message
        await msg.ack()

    except Exception as e:
        logger.error(f"Error processing export make: {e}")
        # In production, implement proper error handling and DLQ


async def generate_export(export_data: Dict[str, Any]):
    """Generate document export"""
    try:
        draft_id = export_data.get("draft_id")
        export_format = export_data.get("format", "docx")
        options = export_data.get("options", {})

        logger.info(f"Generating {export_format} export for draft {draft_id}")

        # Generate export using export service
        export_result = await export_service.generate_export(
            draft_id=draft_id,
            export_format=export_format,
            options=options
        )

        # Publish completion event
        await nats_client.publish("export.completed", {
            "draft_id": draft_id,
            "export_id": export_result["export_id"],
            "format": export_format,
            "s3_key": export_result["s3_key"],
            "download_url": export_result["download_url"],
            "file_size": export_result["file_size"],
            "status": "completed",
        })

        logger.info(f"Successfully generated {export_format} export for draft {draft_id}")

    except Exception as e:
        logger.error(f"Error generating export: {e}")

        # Publish failure event
        await nats_client.publish("export.completed", {
            "draft_id": draft_id,
            "format": export_format,
            "error": str(e),
            "status": "failed",
        })


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info",
    )
