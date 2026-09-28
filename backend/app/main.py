from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from app.core.config import Settings, settings
from app.domain.errors import DomainError
from app.infrastructure.database import make_engine
from app.api import auth, catalog, seller, admin, uploads

def create_app(config: Settings | None = None) -> FastAPI:
    config = config or settings()
    app = FastAPI(title='MaVitrine API',version='0.1.0')
    app.state.config = config
    app.state.engine = make_engine(config.database_url)
    config.upload_dir.mkdir(parents=True,exist_ok=True)
    app.add_middleware(CORSMiddleware,allow_origins=config.allowed_origins,
        allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Authorization','Content-Type','Idempotency-Key'])
    @app.exception_handler(DomainError)
    async def domain_error(request: Request, exc: DomainError):
        return JSONResponse({'detail':exc.message},status_code=exc.status)
    @app.exception_handler(IntegrityError)
    async def integrity_error(request: Request, exc: IntegrityError):
        return JSONResponse({'detail':'Conflit de données. Réessayez avec la même clé pour une commande.'},status_code=409)
    @app.get('/health',tags=['Infrastructure'])
    def health(): return {'status':'ok'}
    for router in (auth.router,catalog.router,seller.router,admin.router,uploads.router):
        app.include_router(router,prefix='/api/v1')
    app.mount('/media',StaticFiles(directory=config.upload_dir),name='media')
    return app
