from typing import Annotated
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.domain.models import User
from app.infrastructure.database import SqlUnitOfWork
from app.services.commerce import CommerceService

def get_uow(request: Request):
    with Session(request.app.state.engine, expire_on_commit=False) as session:
        try:
            yield SqlUnitOfWork(session)
        finally:
            session.rollback()
Uow = Annotated[SqlUnitOfWork, Depends(get_uow)]
bearer = HTTPBearer(auto_error=False)
def current_user(request: Request, uow: Uow, credentials: Annotated[HTTPAuthorizationCredentials|None, Depends(bearer)]):
    if credentials:
        try:
            identifier = decode_token(credentials.credentials, request.app.state.config)
            user = uow.repo.get(User, identifier)
            if user and user.active: return user
        except jwt.InvalidTokenError: pass
    raise HTTPException(401, 'Connexion requise.', headers={'WWW-Authenticate':'Bearer'})
Actor = Annotated[User, Depends(current_user)]
def admin_user(actor: Actor):
    if actor.role != 'admin': raise HTTPException(403, 'Accès administrateur requis.')
    return actor
Admin = Annotated[User, Depends(admin_user)]
def get_commerce(uow: Uow): return CommerceService(uow)
Commerce = Annotated[CommerceService, Depends(get_commerce)]
