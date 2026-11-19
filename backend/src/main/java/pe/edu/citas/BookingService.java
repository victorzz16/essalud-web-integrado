package pe.edu.citas;
import java.time.*;import java.util.*;
import org.springframework.stereotype.Service;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.transaction.annotation.Transactional;import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;import org.springframework.web.server.ResponseStatusException;
@Service
public class BookingService {
 final JdbcTemplate db;final long cancelHours;
 BookingService(JdbcTemplate db,@Value("${app.cancel-hours}")long hours){this.db=db;cancelHours=hours;}
 static void require(boolean ok,int code,String message){if(!ok)throw new ResponseStatusException(HttpStatus.valueOf(code),message);}
 Map<String,Object> one(String sql,Object...args){var rows=db.queryForList(sql,args);require(!rows.isEmpty(),404,"Registro no encontrado");return rows.getFirst();}
 Map<String,Object> user(long id){var u=one("SELECT u.id,u.name,u.dni,u.email,u.role,u.facility AS facility_code,COALESCE(f.name,u.facility) AS facility,u.coverage,u.coverage_until,u.active,u.photo_data FROM users u LEFT JOIN facilities f ON f.code=u.facility WHERE u.id=?",id);require(Boolean.TRUE.equals(u.get("active")),403,"Cuenta inactiva");return u;}
 Instant instant(Object o){return ((java.sql.Timestamp)o).toInstant();}
 @Transactional public Map<String,Object> reserve(long patient,long slot){
 var p=one("SELECT * FROM users WHERE id=? FOR UPDATE",patient);require(p.get("role").equals("PACIENTE")&&Boolean.TRUE.equals(p.get("active")),403,"Solo pacientes activos pueden reservar");
 var s=one("SELECT s.*, u.facility, d.active AS doctor_active, sp.active AS specialty_active, sp.direct FROM slots s JOIN doctors d ON d.id=s.doctor_id JOIN users u ON u.id=d.user_id JOIN specialties sp ON sp.id=d.specialty_id WHERE s.id=? FOR UPDATE OF s",slot);
 // Serializa la reserva con las operaciones administrativas que bloquean rangos de agenda.
 one("SELECT id FROM doctors WHERE id=? FOR UPDATE",s.get("doctor_id"));
 require(!Boolean.TRUE.equals(s.get("blocked"))&&Boolean.TRUE.equals(s.get("doctor_active"))&&Boolean.TRUE.equals(s.get("specialty_active")),409,"Turno no habilitado");
 require(db.queryForObject("SELECT count(*) FROM schedule_blocks WHERE doctor_id=? AND active AND starts_at<? AND ends_at>?",Long.class,s.get("doctor_id"),s.get("ends_at"),s.get("starts_at"))==0,409,"Este horario está bloqueado por administración. Elige otro turno.");
 require(Boolean.TRUE.equals(s.get("direct")),409,"Prestación fuera de reserva directa");// En esta versión académica el paciente puede elegir una sede del catálogo;
 // la adscripción real debe validarse con los servicios oficiales de EsSalud.
 require(!p.get("coverage").equals("NO_VERIFICABLE"),503,"Cobertura demo no verificable. Reintenta más tarde.");
 var start=instant(s.get("starts_at"));require(start.isAfter(Instant.now()),409,"El turno ya pasó");
 require(p.get("coverage").equals("VIGENTE")&&!((java.sql.Date)p.get("coverage_until")).toLocalDate().isBefore(start.atZone(ZoneId.of("America/Lima")).toLocalDate()),409,"Cobertura demo no vigente para la fecha del turno");
 require(db.queryForObject("SELECT count(*) FROM appointments WHERE slot_id=? AND status<>'CANCELADA'",Long.class,slot)==0,409,"Turno ocupado. Elige otro horario.");
 require(db.queryForObject("SELECT count(*) FROM appointments a JOIN slots s ON s.id=a.slot_id WHERE a.patient_id=? AND a.status<>'CANCELADA' AND s.starts_at < ? AND s.ends_at > ?",Long.class,patient,s.get("ends_at"),s.get("starts_at"))==0,409,"Ya tienes una cita en ese intervalo");
 var a=one("INSERT INTO appointments(patient_id,slot_id) VALUES(?,?) RETURNING id,status",patient,slot);db.update("INSERT INTO audit(appointment_id,actor_id,action) VALUES(?,?,'RESERVAR')",a.get("id"),patient);return a;
 }
 @Transactional public Map<String,Object> change(long actor,long id,String status){
 var u=user(actor);var a=one("SELECT a.*,s.starts_at,s.ends_at,d.user_id AS doctor_user FROM appointments a JOIN slots s ON s.id=a.slot_id JOIN doctors d ON d.id=s.doctor_id WHERE a.id=? FOR UPDATE OF a",id);
 if(status.equals("CANCELADA")){
 require(u.get("role").equals("ADMIN")||a.get("patient_id").toString().equals(""+actor),403,"No puedes cancelar una cita ajena");
 if(a.get("status").equals("CANCELADA"))return Map.of("id",id,"status",status);
 require(instant(a.get("starts_at")).isAfter(Instant.now().plusSeconds(cancelHours*3600)),409,"Cancelación cerrada: se requieren "+cancelHours+" horas de anticipación");
 }else{require(List.of("ATENDIDA","NO_ASISTIO").contains(status),400,"Estado inválido");require(u.get("role").equals("MEDICO")&&a.get("doctor_user").toString().equals(""+actor),403,"Solo el médico asignado puede registrar atención");require(!instant(a.get(status.equals("NO_ASISTIO")?"ends_at":"starts_at")).isAfter(Instant.now()),409,"Aún no corresponde registrar ese estado");}
 require(a.get("status").equals("RESERVADA"),409,"La cita ya tiene un estado final");db.update("UPDATE appointments SET status=? WHERE id=?",status,id);db.update("INSERT INTO audit(appointment_id,actor_id,action) VALUES(?,?,?)",id,actor,status);return Map.of("id",id,"status",status);
 }
}
