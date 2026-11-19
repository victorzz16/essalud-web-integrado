"""Pruebas contra un servidor demo y base de pruebas. No usar una base real.
DEMO_PASSWORD=... python tests/smoke.py
Solo biblioteca estándar; agrega registros ficticios y conserva la auditoría.
"""
import os,json,urllib.request,urllib.error,uuid,concurrent.futures,datetime
BASE=os.environ.get('API_URL','http://localhost:8080/api')
PASSWORD=os.environ['DEMO_PASSWORD']
def call(method,path,data=None,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers=headers,method=method)
 try:
  with urllib.request.urlopen(req) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  raw=e.read()
  return e.code,json.loads(raw) if raw else {}
def check(name,got,want):
 assert got==want,(name,got,want)
 print('PASS',name)
def login(email):
 c,r=call('POST','/auth/login',{'email':email,'password':PASSWORD});check('login '+email,c,200);return r['token']
admin=login('admin@demo.pe');medic=login('medico@demo.pe')
demo_patient=login('paciente@demo.pe')
demo_profile=call('GET','/me',token=demo_patient)[1]
check('login con correo en mayúsculas',call('POST','/auth/login',{'email':'PACIENTE@DEMO.PE','password':PASSWORD})[0],200)
check('sin token',call('GET','/me')[0],401)

# Validaciones de identidad: DNI único y correo único sin distinguir mayúsculas.
suffix_validation=uuid.uuid4().hex[:10]
dup_dni={'name':'Paciente Duplicado','dni':demo_profile['dni'],'email':suffix_validation+'-dni@test.pe','password':PASSWORD}
status,payload=call('POST','/auth/register',dup_dni)
check('rechaza DNI repetido',status,409)
check('mensaje específico DNI', 'DNI' in payload.get('message',''),True)

dup_email={'name':'Paciente Duplicado','dni':str(uuid.uuid4().int%90000000+10000000),'email':'PACIENTE@DEMO.PE','password':PASSWORD}
status,payload=call('POST','/auth/register',dup_email)
check('rechaza correo repetido ignorando mayúsculas',status,409)
check('mensaje específico correo', 'correo' in payload.get('message','').lower(),True)

invalid_dni={'name':'Paciente Prueba','dni':'1234567','email':suffix_validation+'-invalid-dni@test.pe','password':PASSWORD}
check('rechaza DNI con menos de ocho dígitos',call('POST','/auth/register',invalid_dni)[0],400)
invalid_email={'name':'Paciente Prueba','dni':str(uuid.uuid4().int%90000000+10000000),'email':'correo-no-valido','password':PASSWORD}
check('rechaza correo con formato inválido',call('POST','/auth/register',invalid_email)[0],400)
invalid_name={'name':'123456','dni':str(uuid.uuid4().int%90000000+10000000),'email':suffix_validation+'-invalid-name@test.pe','password':PASSWORD}
check('rechaza nombre con números',call('POST','/auth/register',invalid_name)[0],400)
weak_password={'name':'Paciente Prueba','dni':str(uuid.uuid4().int%90000000+10000000),'email':suffix_validation+'-weak@test.pe','password':'1234567'}
check('rechaza contraseña menor a ocho caracteres',call('POST','/auth/register',weak_password)[0],400)

# La misma regla de DNI/correo se aplica al alta de profesionales.
specialties_for_validation=call('GET','/admin/specialties',token=admin)[1]
facilities_for_validation=call('GET','/facilities',token=admin)[1]
specialty_id=specialties_for_validation[0]['id']
facility_code=facilities_for_validation[0]['code']
doctor_dup_dni={'name':'Profesional Prueba','dni':demo_profile['dni'],'email':suffix_validation+'-doctor-dni@test.pe','password':PASSWORD,'specialtyId':specialty_id,'facilityCode':facility_code}
check('rechaza DNI repetido al crear médico',call('POST','/admin/doctors',doctor_dup_dni,admin)[0],409)
doctor_dup_email={'name':'Profesional Prueba','dni':str(uuid.uuid4().int%90000000+10000000),'email':'PACIENTE@DEMO.PE','password':PASSWORD,'specialtyId':specialty_id,'facilityCode':facility_code}
check('rechaza correo repetido al crear médico',call('POST','/admin/doctors',doctor_dup_email,admin)[0],409)

duplicate_specialty={'name':specialties_for_validation[0]['name'].swapcase(),'active':True,'direct':True}
check('rechaza especialidad duplicada ignorando mayúsculas',call('POST','/admin/specialties',duplicate_specialty,admin)[0],409)

# El perfil permite conservar el correo propio normalizándolo, pero no apropiarse de otro.
own_profile=call('GET','/me',token=demo_patient)[1]
profile_duplicate={'name':own_profile['name'],'email':'ADMIN@DEMO.PE','photoData':own_profile.get('photo_data')}
check('rechaza correo de otra cuenta en perfil',call('PUT','/me',profile_duplicate,demo_patient)[0],409)
profile_case={'name':own_profile['name'],'email':own_profile['email'].upper(),'photoData':own_profile.get('photo_data')}
status,updated_profile=call('PUT','/me',profile_case,demo_patient)
check('normaliza correo propio en perfil',status,200)
check('correo del perfil queda en minúsculas',updated_profile['email']==own_profile['email'].lower(),True)

# Los filtros administrativos también rechazan valores no válidos.
check('rechaza fecha de filtro inválida',call('GET','/admin/appointments?date=2026-99-99',token=admin)[0],400)
check('rechaza estado de filtro inválido',call('GET','/admin/appointments?status=DESCONOCIDO',token=admin)[0],400)
check('credenciales incorrectas',call('POST','/auth/login',{'email':'paciente@demo.pe','password':'incorrecta'})[0],401)
check('token adulterado',call('GET','/me',token=admin+'x')[0],401)
tokens=[];ids=[]
for i in range(2):
 suffix=uuid.uuid4().hex[:10];body={'name':'Prueba '+suffix,'dni':str(uuid.uuid4().int%90000000+10000000),'email':suffix+'@test.pe','password':PASSWORD}
 check('registro',call('POST','/auth/register',body)[0],201)
 check('duplicado',call('POST','/auth/register',body)[0],409)
 t=login(body['email']);tokens.append(t);ids.append(call('GET','/me',token=t)[1]['id'])
check('paciente no administra',call('GET','/admin/patients',token=tokens[0])[0],403)
check('medico no reserva',call('POST','/appointments',{'slotId':1},medic)[0],403)
doctors=call('GET','/doctors',token=tokens[0])[1]
check('filtro todos los médicos',len(doctors)>0,True)
check('filtro global incluye varias sedes',len({d['facility_code'] for d in doctors})>1,True)
check('agenda general accesible',call('GET','/admin/appointments?page=0&date=&status=&doctorId=0&specialtyId=0&facilityCode=',token=admin)[0],200)
slot=call('GET','/slots?doctorId='+str(doctors[0]['id']),token=tokens[0])[1][0]
with concurrent.futures.ThreadPoolExecutor() as ex:
 responses=list(ex.map(lambda t:call('POST','/appointments',{'slotId':slot['id']},t),tokens))
check('reserva concurrente',sorted(x[0] for x in responses),[201,409])
winner=next(i for i,x in enumerate(responses) if x[0]==201);loser=1-winner;aid=responses[winner][1]['id']
check('cita visible en historial',any(a['id']==aid for a in call('GET','/appointments',token=tokens[winner])[1]),True)
check('cita visible en agenda general',any(a['id']==aid for a in call('GET','/admin/appointments?page=0&date=&status=&doctorId=0&specialtyId=0&facilityCode=',token=admin)[1]),True)
check('cita oculta a otro paciente',any(a['id']==aid for a in call('GET','/appointments',token=tokens[loser])[1]),False)
check('cancelacion ajena',call('PATCH','/appointments/'+str(aid),{'status':'CANCELADA'},tokens[loser])[0],403)
check('bloquear turno reservado',call('PATCH','/admin/slots/'+str(slot['id']),{'blocked':True,'reason':'Prueba'},admin)[0],409)
free_slots=call('GET','/slots?doctorId='+str(doctors[0]['id']),token=tokens[loser])[1]
free_slot=next(x for x in free_slots if x['id']!=slot['id'])
block_status,block=call('POST','/admin/blocks',{'doctorId':doctors[0]['id'],'startsAt':free_slot['starts_at'],'endsAt':free_slot['ends_at'],'reason':'Prueba de bloqueo'},admin)
check('crear bloqueo de rango',block_status,200)
check('turno bloqueado no visible al paciente',any(x['id']==free_slot['id'] for x in call('GET','/slots?doctorId='+str(doctors[0]['id']),token=tokens[loser])[1]),False)
check('desactivar bloqueo',call('PATCH','/admin/blocks/'+str(block['id']),{'active':False},admin)[0],200)
check('turno vuelve a estar disponible',any(x['id']==free_slot['id'] for x in call('GET','/slots?doctorId='+str(doctors[0]['id']),token=tokens[loser])[1]),True)
check('bloqueo individual',call('PATCH','/admin/slots/'+str(free_slot['id']),{'blocked':True,'reason':'Mantenimiento'},admin)[0],200)
check('turno bloqueado individual no visible',any(x['id']==free_slot['id'] for x in call('GET','/slots?doctorId='+str(doctors[0]['id']),token=tokens[loser])[1]),False)
check('desbloqueo individual',call('PATCH','/admin/slots/'+str(free_slot['id']),{'blocked':False,'reason':''},admin)[0],200)
check('atencion futura',call('PATCH','/appointments/'+str(aid),{'status':'ATENDIDA'},medic)[0] in [403,409],True)
other=call('GET','/slots?doctorId='+str(doctors[1]['id']),token=tokens[winner])[1]
same=next(s for s in other if s['starts_at']==slot['starts_at'])
check('cruce de paciente',call('POST','/appointments',{'slotId':same['id']},tokens[winner])[0],409)
check('cancelacion propia',call('PATCH','/appointments/'+str(aid),{'status':'CANCELADA'},tokens[winner])[0],200)
check('cancelacion idempotente',call('PATCH','/appointments/'+str(aid),{'status':'CANCELADA'},tokens[winner])[0],200)
check('reutilizar cupo',call('POST','/appointments',{'slotId':slot['id']},tokens[loser])[0],201)
today_peru=datetime.datetime.now(datetime.timezone.utc).astimezone(datetime.timezone(datetime.timedelta(hours=-5))).date()
future=(today_peru+datetime.timedelta(days=100)).isoformat()
yesterday=(today_peru-datetime.timedelta(days=1)).isoformat()
check('rechaza cobertura vigente con fecha vencida',call('PATCH','/admin/patients/'+str(ids[winner]),{'coverage':'VIGENTE','until':yesterday},admin)[0],400)
for state,until,code in [('VENCIDA',yesterday,409),('NO_VERIFICABLE',future,503)]:
 check('cambiar cobertura '+state,call('PATCH','/admin/patients/'+str(ids[winner]),{'coverage':state,'until':until},admin)[0],200)
 check('rechazo '+state,call('POST','/appointments',{'slotId':same['id']},tokens[winner])[0],code)
check('restaurar cobertura',call('PATCH','/admin/patients/'+str(ids[winner]),{'coverage':'VIGENTE','until':future},admin)[0],200)
check('horario solapado',call('POST','/admin/slots',{'doctorId':doctors[0]['id'],'startsAt':slot['starts_at'],'endsAt':slot['ends_at']},admin)[0],409)
check('auditoria registrada',any(a['appointment_id']==aid for a in call('GET','/admin/audit',token=admin)[1]),True)
print('TODAS LAS PRUEBAS COMPLETADAS')
