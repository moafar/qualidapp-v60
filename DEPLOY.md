# Guía de Despliegue en Ubuntu Server

Esta guía explica cómo desplegar QualidApp v60 en un servidor Ubuntu recién aprovisionado.

## 📋 Requisitos Previos

- Servidor Ubuntu 20.04 LTS o superior
- Acceso root o sudo
- Nombre de dominio apuntando al servidor (opcional, para SSL)
- Puertos 80 y 443 abiertos en el firewall

## 🚀 Opción 1: Despliegue Rápido (Script Automatizado)

### Paso 1: Preparar el servidor

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Clonar el repositorio
cd /opt
sudo git clone https://github.com/moafar/qualidapp-v60.git
cd qualidapp-v60
```

### Paso 2: Ejecutar script de despliegue

```bash
# Dar permisos de ejecución al script
sudo chmod +x deploy.sh

# Ejecutar el script de despliegue
sudo ./deploy.sh

# El script instalará:
# - nginx (servidor web)
# - git (si no está instalado)
# - configurará nginx
# - habilitará el servicio
```

### Paso 3: Verificar el despliegue

```bash
# Verificar que nginx está corriendo
sudo systemctl status nginx

# Abrir en el navegador
# http://tu-servidor-ip
# o
# http://tu-dominio.com
```

## 🔧 Opción 2: Despliegue Manual Paso a Paso

### 1. Instalar dependencias del sistema

```bash
# Actualizar repositorios
sudo apt update

# Instalar nginx
sudo apt install -y nginx

# Instalar git (si no está ya instalado)
sudo apt install -y git

# (Opcional) Instalar certbot para SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Clonar el repositorio

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www

# Clonar el repositorio
cd /var/www
sudo git clone https://github.com/moafar/qualidapp-v60.git

# Establecer permisos correctos
sudo chown -R www-data:www-data /var/www/qualidapp-v60
sudo chmod -R 755 /var/www/qualidapp-v60
```

### 3. Configurar nginx

```bash
# Crear archivo de configuración
sudo nano /etc/nginx/sites-available/qualidapp
```

Copiar la siguiente configuración:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    # Cambiar por tu dominio o dirección IP
    server_name tu-dominio.com;
    
    # Ruta raíz de la aplicación
    root /var/www/qualidapp-v60;
    index index.html;
    
    # Logs
    access_log /var/log/nginx/qualidapp-access.log;
    error_log /var/log/nginx/qualidapp-error.log;
    
    # Configuración principal
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Caché para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Tipos MIME para módulos ES
    location ~* \.js$ {
        add_header Content-Type application/javascript;
    }
    
    # Seguridad: deshabilitar listado de directorios
    autoindex off;
    
    # Cabeceras de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### 4. Habilitar el sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/qualidapp /etc/nginx/sites-enabled/

# Eliminar configuración por defecto (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración de nginx
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

### 5. Configurar firewall (UFW)

```bash
# Permitir tráfico HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Verificar estado
sudo ufw status
```

## 🔒 Configurar SSL/HTTPS con Let's Encrypt (Recomendado)

### Obtener certificado SSL gratuito

```bash
# Asegurarse de que el dominio apunta al servidor
# Luego ejecutar certbot
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Seguir las instrucciones interactivas
# Certbot configurará automáticamente nginx para HTTPS
```

### Renovación automática

```bash
# Verificar que la renovación automática está configurada
sudo systemctl status certbot.timer

# Probar renovación (dry-run)
sudo certbot renew --dry-run
```

## 🔄 Actualizar la Aplicación

### Script de actualización

Crear un script para facilitar actualizaciones:

```bash
sudo nano /usr/local/bin/update-qualidapp.sh
```

Contenido:

```bash
#!/bin/bash
set -e

echo "🔄 Actualizando QualidApp v60..."

cd /var/www/qualidapp-v60

# Hacer backup
echo "📦 Creando backup..."
sudo tar -czf /var/backups/qualidapp-$(date +%Y%m%d-%H%M%S).tar.gz .

# Actualizar código
echo "⬇️  Descargando cambios..."
sudo git fetch origin
sudo git reset --hard origin/main

# Restaurar permisos
echo "🔐 Restaurando permisos..."
sudo chown -R www-data:www-data /var/www/qualidapp-v60
sudo chmod -R 755 /var/www/qualidapp-v60

# Limpiar caché del navegador (opcional: añadir hash a archivos)
echo "🧹 Limpiando caché..."
sudo touch /var/www/qualidapp-v60/index.html

echo "✅ Actualización completada"
```

Dar permisos:

```bash
sudo chmod +x /usr/local/bin/update-qualidapp.sh
```

Usar:

```bash
sudo update-qualidapp.sh
```

## 📊 Monitoreo y Logs

### Ver logs de nginx

```bash
# Logs de acceso
sudo tail -f /var/log/nginx/qualidapp-access.log

# Logs de error
sudo tail -f /var/log/nginx/qualidapp-error.log
```

### Verificar estado del servidor

```bash
# Estado de nginx
sudo systemctl status nginx

# Reiniciar nginx si es necesario
sudo systemctl restart nginx
```

## 🐛 Solución de Problemas

### Problema: Página no carga

```bash
# Verificar que nginx está corriendo
sudo systemctl status nginx

# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -50 /var/log/nginx/error.log
```

### Problema: Módulos ES no cargan

Verificar que nginx envía el Content-Type correcto:

```bash
# Probar desde el servidor
curl -I http://localhost/src/main.js

# Debe mostrar: Content-Type: application/javascript
```

### Problema: Archivos no se actualizan

```bash
# Limpiar caché de nginx
sudo systemctl reload nginx

# Limpiar caché del navegador (Ctrl+Shift+R)
```

## 🔐 Hardening de Seguridad (Recomendado)

### 1. Configurar fail2ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Limitar acceso SSH

```bash
# Editar configuración SSH
sudo nano /etc/ssh/sshd_config

# Cambiar:
# PermitRootLogin no
# PasswordAuthentication no (usar solo claves SSH)

sudo systemctl restart sshd
```

### 3. Mantener el sistema actualizado

```bash
# Actualizar regularmente
sudo apt update && sudo apt upgrade -y

# Configurar actualizaciones automáticas de seguridad
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📝 Notas Importantes

1. **No hay base de datos**: Esta aplicación es completamente estática y no requiere base de datos.

2. **Sin servidor backend**: Todo el procesamiento ocurre en el navegador del cliente.

3. **Dependencias CDN**: La aplicación carga librerías desde CDN:
   - js-yaml (parser YAML)
   - dayjs (manejo de fechas)
   - xlsx (lectura de archivos Excel)
   
   Asegúrate de que el servidor tenga acceso a internet o considera hospedar estas librerías localmente.

4. **Archivos locales**: Los archivos Excel/CSV se procesan completamente en el navegador, nunca se suben al servidor.

## 🎯 Arquitectura de Despliegue

```
Internet
    ↓
Firewall (UFW) - Puertos 80, 443
    ↓
nginx (Servidor Web)
    ↓
Archivos Estáticos (/var/www/qualidapp-v60)
    - index.html
    - style.css
    - src/ (módulos JavaScript)
    ↓
Navegador del Usuario
    - Carga módulos ES
    - Descarga librerías CDN
    - Procesa archivos localmente
```

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs: `/var/log/nginx/qualidapp-error.log`
2. Verifica la configuración: `sudo nginx -t`
3. Consulta la documentación del proyecto: `README.md`
4. Abre un issue en GitHub

## ✅ Checklist de Despliegue

- [ ] Servidor Ubuntu actualizado
- [ ] nginx instalado y configurado
- [ ] Repositorio clonado en `/var/www/qualidapp-v60`
- [ ] Permisos correctos configurados
- [ ] Configuración de nginx creada y habilitada
- [ ] Firewall configurado (puertos 80, 443)
- [ ] SSL configurado con Let's Encrypt (si aplica)
- [ ] Aplicación accesible desde el navegador
- [ ] Logs de nginx monitoreables
- [ ] Script de actualización creado

---

**Última actualización**: Diciembre 2024
