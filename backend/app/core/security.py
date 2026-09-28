from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from app.core.config import Settings

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash('timing-only-not-a-real-password')

def issue_token(user_id: str, config: Settings) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({'sub':user_id, 'iat':now, 'exp':now+timedelta(minutes=config.token_minutes),
        'iss':'mavitrine-api', 'aud':'mavitrine'}, config.jwt_secret.get_secret_value(), algorithm='HS256')

def decode_token(token: str, config: Settings) -> str:
    claims = jwt.decode(token, config.jwt_secret.get_secret_value(), algorithms=['HS256'],
        issuer='mavitrine-api', audience='mavitrine', options={'require':['exp','iat','sub']})
    return claims['sub']
