"""Explicit operator-only role assignment; never grants admin by email at signup."""
import argparse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.domain.models import User
from app.infrastructure.database import make_engine, SqlRepository

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['promote-admin'])
    parser.add_argument('email')
    args=parser.parse_args()
    with Session(make_engine(settings().database_url)) as session:
        user=SqlRepository(session).one(User,email=args.email.lower())
        if not user: parser.error('Le compte doit être créé avant attribution du rôle.')
        user.role='admin'
        session.commit()
        print('Rôle administrateur attribué.')
if __name__=='__main__': main()
