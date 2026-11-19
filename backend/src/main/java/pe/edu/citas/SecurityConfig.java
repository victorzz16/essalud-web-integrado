package pe.edu.citas;
import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.server.resource.authentication.*;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
@Configuration
public class SecurityConfig {
 @Bean PasswordEncoder passwords(){return new BCryptPasswordEncoder();}
 @Bean SecretKeySpec key(@Value("${app.jwt-secret}") String secret){if(secret.length()<32)throw new IllegalArgumentException("JWT_SECRET requiere al menos 32 caracteres");return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256");}
 @Bean JwtEncoder encoder(SecretKeySpec key){return new NimbusJwtEncoder(new ImmutableSecret<>(key));}
 @Bean JwtDecoder decoder(SecretKeySpec key){var d=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();d.setJwtValidator(JwtValidators.createDefaultWithIssuer("essalud-demo"));return d;}
 @Bean SecurityFilterChain security(HttpSecurity http)throws Exception{
  var roles=new JwtGrantedAuthoritiesConverter();roles.setAuthoritiesClaimName("role");roles.setAuthorityPrefix("ROLE_");
  var converter=new JwtAuthenticationConverter();converter.setJwtGrantedAuthoritiesConverter(roles);
  return http.csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(a->a.requestMatchers("/api/auth/**").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated())
   .oauth2ResourceServer(o->o.jwt(j->j.jwtAuthenticationConverter(converter))).build();
 }
}
