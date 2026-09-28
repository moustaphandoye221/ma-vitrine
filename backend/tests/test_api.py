from io import BytesIO
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session
from app.main import create_app
from app.core.config import Settings
from app.infrastructure.database import metadata, SqlRepository
from app.domain.models import User

@pytest.fixture
def client(tmp_path):
    app=create_app(Settings(jwt_secret='test-only-not-production-123456789012345',database_url=f'sqlite:///{tmp_path}/test.db',upload_dir=tmp_path/'media'))
    metadata.create_all(app.state.engine)
    with TestClient(app) as c: yield c
    app.state.engine.dispose()

def account(c,email='alice@example.com'):
    r=c.post('/api/v1/auth/register',json={'email':email,'password':'Strong-test-password-123','name':'Alice'})
    assert r.status_code==201,r.text
    token=c.post('/api/v1/auth/login',json={'email':email,'password':'Strong-test-password-123'}).json()['access_token']
    return {'Authorization':f'Bearer {token}'}

def setup(c,h,slug='atelier'):
    s=c.put('/api/v1/seller/shop',headers=h,json={'name':'Atelier','slug':slug});assert s.status_code==200,s.text
    p=c.post('/api/v1/seller/products',headers=h,json={'name':'Bracelet','price':490000});assert p.status_code==201,p.text
    return s.json(),p.json()
def body(p):
    return {'name':'Client','email':'client@example.com','phone':'000000000','address':'Adresse fictive','items':[{'id':p['id'],'quantity':2}]}
KEY={'Idempotency-Key':'test-order-key-123456'}

def test_auth_and_privilege_escalation(client):
    c=client;assert c.get('/api/v1/seller/products').status_code==401
    assert c.get('/api/v1/auth/me',headers={'Authorization':'Bearer forged'}).status_code==401
    h=account(c)
    assert c.get('/api/v1/admin/shops',headers=h).status_code==403
    assert 'password_hash' not in c.get('/api/v1/auth/me',headers=h).json()
    assert c.post('/api/v1/auth/login',json={'email':'alice@example.com','password':'wrong'}).status_code==401
    assert c.post('/api/v1/auth/register',json={'email':'evil@example.com','password':'a'*14,'name':'Evil','role':'admin'}).status_code==422

def test_tenant_isolation(client):
    c=client;a=account(c);b=account(c,'bob@example.com');_,p=setup(c,a);setup(c,b,'other')
    assert c.put('/api/v1/seller/products/'+p['id'],headers=b,json={'name':'Hacked','price':1}).status_code==404
    assert c.delete('/api/v1/seller/products/'+p['id'],headers=b).status_code==404
    assert c.post('/api/v1/shops/other/orders',headers=KEY,json=body(p)).status_code==400
    o=c.post('/api/v1/shops/atelier/orders',headers=KEY,json=body(p)).json()
    assert c.get('/api/v1/seller/orders/'+o['id'],headers=b).status_code==404

def test_checkout_idempotency_price_and_status(client):
    c=client;h=account(c);_,p=setup(c,h);payload=body(p)
    first=c.post('/api/v1/shops/atelier/orders',headers=KEY,json=payload);assert first.status_code==201,first.text
    assert first.json()['total']==980000
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=payload).json()['id']==first.json()['id']
    payload['items'][0]['quantity']=3
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=payload).status_code==409
    orders=c.get('/api/v1/seller/orders',headers=h).json();assert len(orders)==1 and orders[0]['payment_status']=='non payé'
    path='/api/v1/seller/orders/'+orders[0]['id']
    assert c.patch(path,headers=h,json={'status':'terminée','payment_status':'payé'}).status_code==409
    assert c.patch(path,headers=h,json={'status':'confirmée','payment_status':'non payé'}).status_code==200
    assert c.get('/api/v1/seller/metrics',headers=h).json()['orders']==1
    assert c.get('/api/v1/seller/clients',headers=h).json()[0]['orders']==1

def test_validation_mixed_currency_and_no_client_price(client):
    c=client;h=account(c);_,p=setup(c,h);payload=body(p);payload['items'][0]['quantity']=0
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=payload).status_code==422
    payload=body(p);payload['total']=1
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=payload).status_code==422
    assert c.post('/api/v1/seller/products',headers=h,json={'name':'x','price':1.5}).status_code==422
    p2=c.post('/api/v1/seller/products',headers=h,json={'name':'Euro','price':100,'currency':'EUR'}).json()
    payload=body(p);payload['items'].append({'id':p2['id'],'quantity':1})
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=payload).status_code==400
    assert c.post('/api/v1/shops/atelier/orders',json=body(p)).status_code==422

def test_archive_preserves_order(client):
    c=client;h=account(c);_,p=setup(c,h)
    c.post('/api/v1/shops/atelier/orders',headers=KEY,json=body(p))
    assert c.delete('/api/v1/seller/products/'+p['id'],headers=h).status_code==204
    assert c.get('/api/v1/shops/atelier/products').json()==[]
    assert c.get('/api/v1/seller/orders',headers=h).json()[0]['items'][0]['name']=='Bracelet'

def test_upload_validation_and_ownership(client):
    c=client;h=account(c);setup(c,h)
    assert c.post('/api/v1/uploads',headers=h,files={'file':('bad.png',b'not an image','image/png')}).status_code==422
    out=BytesIO();Image.new('RGB',(8,8)).save(out,format='PNG')
    r=c.post('/api/v1/uploads',headers=h,files={'file':('photo.png',out.getvalue(),'image/png')})
    assert r.status_code==201,r.text
    assert c.get(r.json()['url']).status_code==200
    assert c.post('/api/v1/seller/products',headers=h,json={'name':'x','price':10,'image_key':'other/file.webp'}).status_code==403

def test_admin_suspension(client):
    c=client;h=account(c);s,p=setup(c,h);admin=account(c,'admin@example.com')
    with Session(c.app.state.engine) as session:
        user=SqlRepository(session).one(User,email='admin@example.com');user.role='admin';session.commit()
    assert c.get('/api/v1/admin/metrics',headers=admin).status_code==200
    assert c.patch('/api/v1/admin/shops/'+s['id'],headers=admin,json={'active':False}).status_code==200
    assert c.get('/api/v1/shops/atelier').status_code==404
    assert c.get('/api/v1/seller/products',headers=h).status_code==403
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=body(p)).status_code==404

def test_slug_and_pagination(client):
    c=client;a=account(c);setup(c,a);b=account(c,'bob@example.com')
    assert c.put('/api/v1/seller/shop',headers=b,json={'name':'Other','slug':'atelier'}).status_code==409
    assert c.get('/api/v1/shops?limit=101').status_code==422
    assert c.get('/api/v1/shops?offset=1').json()==[]

def test_storefront_customization_and_validation(client):
    c=client;h=account(c)
    values={'name':'Atelier du Lagon','slug':'atelier-lagon','accent_color':'#245aa0',
        'surface_theme':'glacier','hero_align':'centre','hero_height':'grand',
        'card_style':'angle','catalog_columns':4,'cover_position':72,'cover_blur':4,'cover_shade':65}
    saved=c.put('/api/v1/seller/shop',headers=h,json=values)
    assert saved.status_code==200,saved.text
    public=c.get('/api/v1/shops/atelier-lagon').json()
    assert public['surface_theme']=='glacier' and public['catalog_columns']==4
    assert public['cover_position']==72 and public['card_style']=='angle'
    assert c.put('/api/v1/seller/shop',headers=h,json={**values,'hero_height':'very-large'}).status_code==422
    assert c.put('/api/v1/seller/shop',headers=h,json={**values,'catalog_columns':5}).status_code==422

def test_product_gallery_and_catalog_search(client):
    c=client;h=account(c);setup(c,h)
    image=BytesIO();Image.new('RGB',(16,16),(31,95,130)).save(image,format='PNG')
    uploaded=c.post('/api/v1/uploads',headers=h,files={'file':('detail.png',image.getvalue(),'image/png')})
    assert uploaded.status_code==201
    key=uploaded.json()['key']
    created=c.post('/api/v1/seller/products',headers=h,json={'name':'Bol bleu','price':1500,'gallery_keys':[key]})
    assert created.status_code==201,created.text
    identifier=created.json()['id']
    assert c.get('/api/v1/shops/atelier/products/'+identifier).json()['gallery_keys']==[key]
    assert [p['name'] for p in c.get('/api/v1/shops/atelier/products?q=BLEU').json()]==['Bol bleu']
    assert [p['name'] for p in c.get('/api/v1/shops/atelier/products?sort=price-desc').json()]==['Bracelet','Bol bleu']
    assert c.post('/api/v1/seller/products',headers=h,json={'name':'x','price':10,'gallery_keys':[key]*2}).status_code==400
    other=account(c,'bob@example.com');setup(c,other,'bob')
    assert c.post('/api/v1/seller/products',headers=other,json={'name':'x','price':10,'gallery_keys':[key]}).status_code==403
    updated=c.put('/api/v1/seller/products/'+identifier,headers=h,json={'name':'Bol bleu','price':1500,'gallery_keys':[]})
    assert updated.status_code==200 and updated.json()['gallery_keys']==[]

def test_order_history_and_owner_isolation(client):
    c=client;h=account(c);_,product=setup(c,h);other=account(c,'bob@example.com');setup(c,other,'bob')
    created=c.post('/api/v1/shops/atelier/orders',headers=KEY,json=body(product)).json()
    path='/api/v1/seller/orders/'+created['id']
    assert c.get(path+'/history',headers=other).status_code==404
    assert [event['status'] for event in c.get(path+'/history',headers=h).json()]==['nouvelle']
    change={'status':'confirmée','payment_status':'non payé'}
    assert c.patch(path,headers=h,json=change).status_code==200
    assert c.patch(path,headers=h,json=change).status_code==200
    change['payment_status']='payé'
    assert c.patch(path,headers=h,json=change).status_code==200
    history=c.get(path+'/history',headers=h).json()
    assert [event['status'] for event in history]==['nouvelle','confirmée','confirmée']
    assert [event['payment_status'] for event in history]==['non payé','non payé','payé']

def test_admin_subscription_management_and_analytics(client):
    c=client;seller=account(c);shop,product=setup(c,seller)
    admin=account(c,'admin@example.com')
    with Session(c.app.state.engine) as session:
        user=SqlRepository(session).one(User,email='admin@example.com');user.role='admin';session.commit()
    base='/api/v1/admin/shops/'+shop['id']+'/subscription'
    assert c.get('/api/v1/admin/analytics',headers=seller).status_code==403
    assert c.get('/api/v1/admin/subscriptions',headers=seller).status_code==403
    assert c.put(base,headers=seller,json={'plan':'studio','billing_cycle':'annual','status':'active'}).status_code==403
    assert c.get('/api/v1/seller/subscription',headers=seller).json() is None
    assert c.put(base,headers=admin,json={'plan':'studio','billing_cycle':'none','status':'active'}).status_code==422
    assert c.put(base,headers=admin,json={'plan':'decouverte','billing_cycle':'monthly','status':'active'}).status_code==422
    values={'plan':'boutique','billing_cycle':'monthly','status':'trial',
        'expires_at':'2027-01-01T00:00:00Z','note':'Période attribuée manuellement'}
    response=c.put(base,headers=admin,json=values)
    assert response.status_code==200,response.text
    assert c.get(base,headers=admin).json()['plan']=='boutique'
    assert c.get('/api/v1/seller/subscription',headers=seller).json()['status']=='trial'
    values['status']='canceled'
    assert c.put(base,headers=admin,json=values).status_code==200
    assert len(c.get('/api/v1/admin/subscriptions',headers=admin).json())==1
    assert c.get('/api/v1/admin/metrics',headers=admin).json()['subscriptions']==1
    assert c.put('/api/v1/admin/shops/unknown/subscription',headers=admin,json=values).status_code==404
    assert c.post('/api/v1/shops/atelier/orders',headers=KEY,json=body(product)).status_code==201
    analytics=c.get('/api/v1/admin/analytics',headers=admin).json()
    assert analytics['period_days']==30 and analytics['orders'][0]['order_total']==980000
    assert analytics['subscriptions']==[{'plan':'boutique','status':'canceled','count':1}]
    assert 'customer_email' not in str(analytics)

def test_optional_whatsapp_settings(client):
    c=client;owner=account(c);other=account(c,'other@example.com')
    values={'name':'Atelier','slug':'atelier','whatsapp_number':'221771234567'}
    saved=c.put('/api/v1/seller/shop',headers=owner,json=values)
    assert saved.status_code==200,saved.text
    public=c.get('/api/v1/shops/atelier').json()
    assert public['whatsapp_number']=='221771234567'
    assert c.get('/api/v1/seller/shop',headers=other).status_code==404
    assert c.put('/api/v1/seller/shop',headers=owner,json={**values,'whatsapp_number':'+221 77 123'}).status_code==422
    cleared=c.put('/api/v1/seller/shop',headers=owner,json={'name':'Atelier','slug':'atelier'})
    assert cleared.status_code==200 and cleared.json()['whatsapp_number'] is None
    assert c.get('/api/v1/shops/atelier').json()['whatsapp_number'] is None
