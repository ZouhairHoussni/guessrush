from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from socketio import ASGIApp

from app.api import display, gameplay, health, lobby, rooms
from app.config import get_settings
from app.realtime.server import sio
from app.schemas.common import ErrorBody, ErrorResponse
from app.services.errors import ServiceError


def make_error_response(error: ErrorBody, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(error=error).model_dump(mode="json", by_alias=True),
    )


def create_fastapi_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(ServiceError)
    async def service_error_handler(_request: Request, exc: ServiceError) -> JSONResponse:
        return make_error_response(
            ErrorBody(code=exc.code, message=exc.message, details=exc.details),
            exc.status_code,
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return make_error_response(
            ErrorBody(
                code="VALIDATION_ERROR",
                message="The request could not be validated.",
                details=exc.errors(),
            ),
            422,
        )

    @application.exception_handler(ValidationError)
    async def pydantic_error_handler(_request: Request, exc: ValidationError) -> JSONResponse:
        return make_error_response(
            ErrorBody(
                code="VALIDATION_ERROR",
                message="The request could not be validated.",
                details=exc.errors(),
            ),
            422,
        )

    application.include_router(health.router)
    application.include_router(rooms.router)
    application.include_router(lobby.router)
    application.include_router(gameplay.router)
    application.include_router(display.router)
    return application


fastapi_app = create_fastapi_app()
app = ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")
