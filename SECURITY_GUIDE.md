# 🔐 Guía de Seguridad - Quality Blinds Backend

## 🚨 **MEDIDAS DE SEGURIDAD IMPLEMENTADAS**

### **1. 🛡️ CORS Restrictivo**

- **Solo permite requests desde**: `https://qualityblinds.netlify.app`
- **Dominios adicionales autorizados**:
  - `https://quality-blinds.netlify.app`
  - `https://qualityblinds.com.au`
  - `https://www.qualityblinds.com.au`
- **En desarrollo**: También permite `localhost:3000` y `localhost:3001`

### **2. ⚡ Rate Limiting**

- **General**: 100 requests por 15 minutos por IP
- **Endpoints críticos**: 10 requests por 15 minutos
- **Chat**: 20 mensajes por 5 minutos
- **Bloqueo automático** de IPs que excedan límites

### **3. 🔒 Headers de Seguridad (Helmet)**

- **Content Security Policy (CSP)**: Previene XSS
- **HSTS**: Fuerza conexiones HTTPS
- **X-Frame-Options**: Previene clickjacking
- **X-Content-Type-Options**: Previene MIME sniffing

### **4. 🛡️ Validación de Entrada**

- **Sanitización automática** de todos los inputs
- **Validación estricta** con class-validator
- **Límites de tamaño**: 10MB máximo por request
- **Filtrado de scripts maliciosos**

### **5. 🤖 Detección de Bots**

- **Bloqueo de bots maliciosos**: curl, wget, scrapers
- **Permitidos**: Googlebot, Bingbot, bots legítimos
- **Validación de User-Agent** obligatoria

### **6. 📊 Logging de Seguridad**

- **Eventos monitoreados**:
  - Violaciones de CORS
  - Rate limiting excedido
  - IPs bloqueadas
  - Headers inválidos
  - Requests sospechosos

---

## 🔧 **CONFIGURACIÓN REQUERIDA**

### **Variables de Entorno Críticas:**

```bash
# 🌐 URLs autorizadas
FRONTEND_URL=https://qualityblinds.netlify.app
ALLOWED_ORIGINS=https://qualityblinds.netlify.app,https://quality-blinds.netlify.app

# 🔐 APIs seguras
OPENAI_API_KEY=sk-your-new-regenerated-key
RESEND_API_KEY=re-your-resend-key
GOOGLE_PLACES_API_KEY=your-new-google-key

# 🛡️ Configuración de seguridad
NODE_ENV=production
SECURITY_HEADERS_ENABLED=true
ENABLE_SECURITY_LOGGING=true
```

---

## 🚫 **REQUESTS BLOQUEADOS AUTOMÁTICAMENTE**

### **1. Orígenes no autorizados**

```bash
# ❌ BLOQUEADO
curl -X POST http://localhost:3001/api/contact \
  -H "Origin: https://malicious-site.com"

# ✅ PERMITIDO
curl -X POST http://localhost:3001/api/contact \
  -H "Origin: https://qualityblinds.netlify.app"
```

### **2. Rate limiting excedido**

```bash
# ❌ BLOQUEADO después de 100 requests en 15 min
for i in {1..101}; do
  curl http://localhost:3001/api/reviews/google
done
```

### **3. Bots maliciosos**

```bash
# ❌ BLOQUEADO
curl -X POST http://localhost:3001/api/contact \
  -H "User-Agent: malicious-bot/1.0"

# ❌ BLOQUEADO
wget http://localhost:3001/api/contact
```

### **4. Payloads grandes**

```bash
# ❌ BLOQUEADO (>10MB)
curl -X POST http://localhost:3001/api/contact \
  -d "$(head -c 11000000 /dev/zero | base64)"
```

---

## 📊 **MONITOREO DE SEGURIDAD**

### **Logs de Eventos Críticos:**

```bash
# 🚨 Violación de CORS
[SecurityService] 🚨 SECURITY ALERT: CORS_VIOLATION
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "event": "CORS_VIOLATION",
  "severity": "high",
  "details": { "origin": "https://malicious-site.com" }
}

# ⚠️ Rate limit excedido
[SecurityMiddleware] 🚫 Rate limit exceeded for 192.168.1.100

# 🤖 Bot detectado
[SecurityService] ⚠️ Security Warning: Suspicious bot detected: malicious-bot/1.0
```

---

## 🔍 **TESTING DE SEGURIDAD**

### **1. Test CORS**

```bash
# Desde dominio autorizado (debería funcionar)
curl -X POST http://localhost:3001/api/contact \
  -H "Origin: https://qualityblinds.netlify.app" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"0412345678","service":"consultation","product":"roller-blinds","message":"Test"}'

# Desde dominio no autorizado (debería fallar)
curl -X POST http://localhost:3001/api/contact \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"0412345678","service":"consultation","product":"roller-blinds","message":"Test"}'
```

### **2. Test Rate Limiting**

```bash
# Script para probar rate limiting
for i in {1..15}; do
  echo "Request $i"
  curl -X POST http://localhost:3001/api/contact \
    -H "Origin: https://qualityblinds.netlify.app" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test'$i'","email":"test'$i'@test.com","phone":"0412345678","service":"consultation","product":"roller-blinds","message":"Test"}'
  sleep 1
done
```

### **3. Test Headers de Seguridad**

```bash
# Verificar headers de seguridad
curl -I http://localhost:3001/api/reviews/google

# Deberías ver:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 🚨 **RESPUESTA A INCIDENTES**

### **Si detectas actividad sospechosa:**

1. **Revisar logs de seguridad**:

   ```bash
   grep "SECURITY ALERT" logs/application.log
   grep "Rate limit exceeded" logs/application.log
   ```

2. **Identificar patrones de ataque**:

   - IPs repetitivas
   - User-agents sospechosos
   - Requests a endpoints sensibles

3. **Acciones inmediatas**:
   - Agregar IP a lista negra
   - Reducir rate limits temporalmente
   - Notificar al equipo

### **Configuración de alertas:**

```bash
# Monitorear logs en tiempo real
tail -f logs/application.log | grep "SECURITY ALERT"

# Contar violaciones por hora
grep "CORS_VIOLATION" logs/application.log | grep "$(date +%Y-%m-%d)" | wc -l
```

---

## ✅ **CHECKLIST DE SEGURIDAD**

### **Antes de producción:**

- [ ] ✅ CORS configurado solo para dominios autorizados
- [ ] ✅ Rate limiting activado
- [ ] ✅ Headers de seguridad (Helmet) configurados
- [ ] ✅ Variables de entorno seguras (no hardcodeadas)
- [ ] ✅ Logging de seguridad habilitado
- [ ] ✅ Validación de entrada estricta
- [ ] ✅ Detección de bots maliciosos
- [ ] ✅ Límites de tamaño de payload
- [ ] ✅ API keys regeneradas (no comprometidas)
- [ ] ✅ Archivo .env en .gitignore

### **Monitoreo continuo:**

- [ ] 📊 Revisar logs de seguridad diariamente
- [ ] 🔍 Monitorear rate limiting
- [ ] 🚨 Configurar alertas para eventos críticos
- [ ] 🔄 Rotar API keys regularmente
- [ ] 📈 Analizar patrones de tráfico

---

## 🆘 **CONTACTO DE EMERGENCIA**

Si detectas un **incidente de seguridad crítico**:

1. **Inmediatamente**: Revisar logs y identificar el problema
2. **Bloquear**: Agregar IPs maliciosas a lista negra
3. **Documentar**: Registrar el incidente y acciones tomadas
4. **Notificar**: Informar al equipo técnico

---

## 🔗 **RECURSOS ADICIONALES**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [Express Rate Limiting](https://github.com/express-rate-limit/express-rate-limit)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

**🛡️ Tu backend ahora está protegido con múltiples capas de seguridad. Solo tu sitio web autorizado puede acceder a los endpoints.**
