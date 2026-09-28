from fastapi import APIRouter, HTTPException, Request
from app.api.dependencies import Uow, Actor
from app.api.schemas import Register, Login, UserView
from app.domain.models import User
from app.core.security import passwords, DUMMY_HASH, issue_token

router = APIRouter(prefix='/auth', tags=['Authentification'])
@router.post('/register', response_model=UserView, status_code=201)
def register(data: Register, uow: Uow):
    email = str(data.email).lower()
    if uow.repo.one(User, email=email): raise HTTPException(409, 'Compte déjà existant.')
    user = User(email=email, name=data.name, password_hash=passwords.hash(data.password))
    uow.repo.add(user)
    uow.commit()
    return user
@router.post('/login')
def login(data: Login, uow: Uow, request: Request):
    user = uow.repo.one(User, email=str(data.email).lower())
    valid = passwords.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid or not user.active: raise HTTPException(401, 'Identifiants invalides.')
    return {'access_token':issue_token(user.id, request.app.state.config), 'token_type':'bearer',
        'expires_in':request.app.state.config.token_minutes*60}
@router.get('/me', response_model=UserView)
def me(actor: Actor): return actor
