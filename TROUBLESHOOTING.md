# 🔧 Guía de Solución de Problemas

Esta guía te ayudará a resolver los problemas más comunes al desplegar QualidApp v60 en Ubuntu.

## 📋 Tabla de Contenidos

- [Problemas de Instalación](#problemas-de-instalación)
- [Problemas de nginx](#problemas-de-nginx)
- [Problemas de Red/Firewall](#problemas-de-redfirewall)
- [Problemas de Permisos](#problemas-de-permisos)
- [Problemas de Módulos JavaScript](#problemas-de-módulos-javascript)
- [Problemas de SSL/HTTPS](#problemas-de-sslhttps)
- [Problemas de Actualización](#problemas-de-actualización)

---

## Problemas de Instalación

### ❌ Error: "Este script debe ejecutarse como root o con sudo"

**Síntoma**: El script de despliegue no inicia

**Solución**:
```bash
# Usar sudo antes del comando
sudo ./deploy.sh
```

### ❌ Error: "El directorio /var/www/qualidapp-v60 no existe"

**Síntoma**: deploy.sh indica que falta el directorio

**Causa**: El repositorio no ha sido clonado

**Solución**:
```bash
cd /var/www
sudo git clone https://github.com/moafar/qualidapp-v60.git
cd qualidapp-v60
sudo ./deploy.sh
```

### ❌ Error: "command not found: git"

**Síntoma**: Git no está instalado

**Solución**:
```bash
sudo apt update
sudo apt install -y git
```

---

## Problemas de nginx

### ❌ Error: "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"

**Síntoma**: No se puede iniciar nginx porque el puerto 80 está ocupado

**Diagnóstico**:
```bash
# Ver qué proceso usa el puerto 80
sudo lsof -i :80
# o
sudo netstat -tulpn | grep :80
```

**Solución**:
```bash
# Si es Apache, detenerlo
sudo systemctl stop apache2
sudo systemctl disable apache2

# Luego iniciar nginx
sudo systemctl start nginx
```

### ❌ Error: "nginx: configuration file /etc/nginx/nginx.conf test failed"

**Síntoma**: La configuración de nginx tiene errores

**Diagnóstico**:
```bash
# Ver detalles del error
sudo nginx -t
```

**Solución común**: Revisar la configuración en `/etc/nginx/sites-available/qualidapp`
```bash
# Editar configuración
sudo nano /etc/nginx/sites-available/qualidapp

# Verificar sintaxis
sudo nginx -t

# Si está OK, recargar
sudo systemctl reload nginx
```

### ❌ nginx está corriendo pero la página no carga

**Diagnóstico**:
```bash
# Verificar estado
sudo systemctl status nginx

# Ver logs de error
sudo tail -50 /var/log/nginx/qualidapp-error.log
sudo tail -50 /var/log/nginx/error.log
```

**Soluciones**:

1. **Verificar que el sitio está habilitado**:
```bash
ls -la /etc/nginx/sites-enabled/
# Debe existir un enlace a qualidapp
```

2. **Crear enlace si falta**:
```bash
sudo ln -s /etc/nginx/sites-available/qualidapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

3. **Verificar permisos de archivos**:
```bash
ls -la /var/www/qualidapp-v60/index.html
# Debe ser legible por www-data
```

---

## Problemas de Red/Firewall

### ❌ No puedo acceder desde internet

**Diagnóstico**:
```bash
# Verificar que nginx escucha en el puerto correcto
sudo netstat -tulpn | grep nginx

# Verificar reglas de firewall
sudo ufw status
```

**Solución**:

1. **Abrir puertos en UFW**:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

2. **Verificar firewall del proveedor de cloud**:
   - AWS: Security Groups
   - Google Cloud: Firewall Rules
   - Azure: Network Security Groups
   - DigitalOcean: Firewalls

   Asegúrate de que los puertos 80 y 443 están abiertos.

### ❌ Funciona en localhost pero no desde IP externa

**Causa común**: nginx escucha solo en localhost

**Solución**:
```bash
# Editar configuración
sudo nano /etc/nginx/sites-available/qualidapp

# Verificar que tiene:
# listen 80;
# listen [::]:80;
# (NO debe tener listen 127.0.0.1:80)

# Recargar
sudo nginx -t
sudo systemctl reload nginx
```

---

## Problemas de Permisos

### ❌ Error: "403 Forbidden"

**Síntoma**: nginx devuelve 403 al acceder

**Diagnóstico**:
```bash
# Ver permisos
ls -la /var/www/qualidapp-v60/

# Ver logs
sudo tail -20 /var/log/nginx/qualidapp-error.log
```

**Solución**:
```bash
# Corregir permisos
sudo chown -R www-data:www-data /var/www/qualidapp-v60
sudo chmod -R 755 /var/www/qualidapp-v60

# Verificar que index.html existe y es legible
sudo ls -la /var/www/qualidapp-v60/index.html
```

### ❌ SELinux bloqueando acceso (en algunas distribuciones)

**Diagnóstico**:
```bash
# Verificar si SELinux está activo
sestatus
```

**Solución** (si SELinux está activo):
```bash
# Restaurar contexto SELinux
sudo restorecon -R /var/www/qualidapp-v60

# o deshabilitar SELinux (no recomendado en producción)
sudo setenforce 0
```

---

## Problemas de Módulos JavaScript

### ❌ Error: "Failed to load module script: Expected a JavaScript module script..."

**Síntoma**: Los módulos ES no cargan en el navegador

**Causa**: Content-Type incorrecto

**Diagnóstico**:
```bash
# Verificar Content-Type
curl -I http://localhost/src/main.js

# Debe mostrar:
# Content-Type: application/javascript
```

**Solución**:
```bash
# Editar configuración de nginx
sudo nano /etc/nginx/sites-available/qualidapp

# Añadir o verificar:
location ~* \.js$ {
    add_header Content-Type "application/javascript; charset=utf-8";
}

# Recargar nginx
sudo nginx -t
sudo systemctl reload nginx
```

### ❌ Error: "CORS policy" en consola del navegador

**Síntoma**: Error de CORS al cargar recursos

**Nota**: Este error NO debería ocurrir si todo se sirve desde el mismo dominio

**Diagnóstico**: Verificar que las librerías CDN son accesibles
```bash
curl -I https://unpkg.com/js-yaml@4.1.0/dist/js-yaml.min.js
```

**Solución temporal**: Verificar conexión a internet desde el servidor

---

## Problemas de SSL/HTTPS

### ❌ Error certbot: "Unable to find a virtual host"

**Síntoma**: certbot no puede configurar SSL automáticamente

**Solución**:
```bash
# Verificar que server_name está configurado
sudo grep server_name /etc/nginx/sites-available/qualidapp

# Debe tener tu dominio, no "_"
# server_name tu-dominio.com www.tu-dominio.com;

# Si falta, editar:
sudo nano /etc/nginx/sites-available/qualidapp
# Cambiar server_name y recargar
sudo nginx -t
sudo systemctl reload nginx

# Intentar certbot nuevamente
sudo certbot --nginx -d tu-dominio.com
```

### ❌ Error: "too many requests" de Let's Encrypt

**Síntoma**: Has excedido el límite de solicitudes

**Causa**: Let's Encrypt tiene rate limits (5 por semana por dominio)

**Solución**:
```bash
# Usar --dry-run para probar sin límites
sudo certbot --nginx --dry-run -d tu-dominio.com

# Esperar una semana o usar un subdominio diferente
```

### ❌ Certificado expirado

**Diagnóstico**:
```bash
# Verificar fecha de expiración
sudo certbot certificates
```

**Solución**:
```bash
# Renovar manualmente
sudo certbot renew

# Verificar que el timer está activo
sudo systemctl status certbot.timer

# Si no está activo, habilitarlo
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Problemas de Actualización

### ❌ Error: "You have unstaged changes"

**Síntoma**: update.sh indica cambios sin commitear

**Solución**:
```bash
cd /var/www/qualidapp-v60

# Ver cambios
git status

# Opción 1: Descartar cambios
git reset --hard HEAD

# Opción 2: Guardar cambios temporalmente
git stash

# Luego ejecutar update
sudo /usr/local/bin/update-qualidapp.sh
```

### ❌ Error: "fatal: not a git repository"

**Síntoma**: El directorio no es un repositorio git

**Causa**: Instalación manual sin git

**Solución**:
```bash
# Hacer backup
sudo cp -r /var/www/qualidapp-v60 /var/www/qualidapp-v60.backup

# Re-clonar
sudo rm -rf /var/www/qualidapp-v60
cd /var/www
sudo git clone https://github.com/moafar/qualidapp-v60.git

# Restaurar permisos
sudo chown -R www-data:www-data /var/www/qualidapp-v60
sudo chmod -R 755 /var/www/qualidapp-v60
```

---

## 🔍 Comandos Útiles de Diagnóstico

### Ver estado general
```bash
# Estado de nginx
sudo systemctl status nginx

# Procesos nginx
ps aux | grep nginx

# Puertos en uso
sudo netstat -tulpn
```

### Ver logs
```bash
# Logs de nginx (últimas 50 líneas)
sudo tail -50 /var/log/nginx/qualidapp-access.log
sudo tail -50 /var/log/nginx/qualidapp-error.log

# Logs en tiempo real
sudo tail -f /var/log/nginx/qualidapp-error.log

# Logs del sistema
sudo journalctl -xe
```

### Verificar configuración
```bash
# Testear configuración de nginx
sudo nginx -t

# Ver configuración activa
sudo nginx -T

# Listar sitios habilitados
ls -la /etc/nginx/sites-enabled/
```

### Verificar recursos
```bash
# Uso de disco
df -h

# Uso de memoria
free -h

# Carga del sistema
top
# o
htop
```

---

## 🆘 Última Recurso: Reinstalación Limpia

Si nada funciona, puedes hacer una reinstalación limpia:

```bash
# 1. Hacer backup (importante!)
sudo cp -r /var/www/qualidapp-v60 /home/backup-qualidapp

# 2. Desinstalar nginx
sudo systemctl stop nginx
sudo apt remove --purge nginx nginx-common
sudo rm -rf /etc/nginx
sudo rm -rf /var/log/nginx

# 3. Limpiar aplicación
sudo rm -rf /var/www/qualidapp-v60

# 4. Reinstalar todo
sudo apt update
sudo apt install -y nginx git

# 5. Clonar y desplegar
cd /var/www
sudo git clone https://github.com/moafar/qualidapp-v60.git
cd qualidapp-v60
sudo ./deploy.sh
```

---

## 📞 Obtener Ayuda Adicional

Si ninguna de estas soluciones funciona:

1. **Recopilar información**:
```bash
# Crear reporte de diagnóstico
{
  echo "=== Sistema ==="
  uname -a
  lsb_release -a
  
  echo "=== nginx ==="
  nginx -v
  sudo systemctl status nginx
  
  echo "=== Configuración ==="
  sudo nginx -t
  
  echo "=== Logs ==="
  sudo tail -50 /var/log/nginx/qualidapp-error.log
  
  echo "=== Permisos ==="
  ls -la /var/www/qualidapp-v60/
  
  echo "=== Red ==="
  sudo netstat -tulpn | grep nginx
  
} > ~/diagnostico-qualidapp.txt
```

2. **Compartir el reporte**: Incluye `~/diagnostico-qualidapp.txt` al reportar el problema

3. **Abrir issue en GitHub**: Con toda la información relevante

---

**Última actualización**: Diciembre 2024
