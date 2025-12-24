# 🚀 Guía Rápida de Despliegue en Ubuntu

Esta es una guía rápida para desplegar QualidApp v60 en un servidor Ubuntu. Para instrucciones detalladas, consulta [DEPLOY.md](DEPLOY.md).

## ⚡ Despliegue en 5 Minutos

### Pre-requisitos
- Ubuntu 20.04+ o Debian 10+
- Acceso root o sudo
- Puerto 80 abierto

### Opción A: Script Automatizado (Recomendado)

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar git si no está instalado
sudo apt install -y git

# 3. Clonar repositorio
cd /var/www
sudo git clone https://github.com/moafar/qualidapp-v60.git

# 4. Ejecutar script de despliegue
cd qualidapp-v60
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

El script instalará nginx, configurará el servidor web y habilitará el firewall automáticamente.

### Opción B: Instalación Manual Mínima

```bash
# 1. Instalar nginx
sudo apt update
sudo apt install -y nginx git

# 2. Clonar repositorio
cd /var/www
sudo git clone https://github.com/moafar/qualidapp-v60.git

# 3. Configurar permisos
sudo chown -R www-data:www-data /var/www/qualidapp-v60
sudo chmod -R 755 /var/www/qualidapp-v60

# 4. Configurar nginx
sudo cp /var/www/qualidapp-v60/nginx.conf.example /etc/nginx/sites-available/qualidapp
sudo nano /etc/nginx/sites-available/qualidapp  # Editar server_name

# 5. Habilitar sitio
sudo ln -s /etc/nginx/sites-available/qualidapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Opcional

# 6. Verificar y recargar nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 🌐 Acceder a la Aplicación

Abre tu navegador y visita:
- `http://tu-direccion-ip`
- `http://tu-dominio.com` (si configuraste un dominio)

## 🔒 Configurar HTTPS (Opcional pero Recomendado)

```bash
# Instalar certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática ya está configurada
```

## 🔄 Actualizar la Aplicación

```bash
# Opción 1: Usar script de actualización
sudo cp /var/www/qualidapp-v60/update.sh /usr/local/bin/update-qualidapp.sh
sudo chmod +x /usr/local/bin/update-qualidapp.sh
sudo update-qualidapp.sh

# Opción 2: Actualización manual
cd /var/www/qualidapp-v60
sudo git pull origin main
sudo chown -R www-data:www-data .
sudo systemctl reload nginx
```

## 📊 Verificar Estado

```bash
# Estado de nginx
sudo systemctl status nginx

# Ver logs
sudo tail -f /var/log/nginx/qualidapp-access.log
sudo tail -f /var/log/nginx/qualidapp-error.log

# Verificar configuración
sudo nginx -t
```

## 🐛 Solución Rápida de Problemas

### La página no carga
```bash
sudo systemctl restart nginx
sudo tail -50 /var/log/nginx/error.log
```

### Problemas con módulos JavaScript
```bash
# Verificar Content-Type
curl -I http://localhost/src/main.js
# Debe mostrar: Content-Type: application/javascript
```

### Limpiar caché
```bash
sudo systemctl reload nginx
# En el navegador: Ctrl+Shift+R
```

## 📋 Checklist Post-Despliegue

- [ ] Nginx instalado y corriendo
- [ ] Aplicación accesible desde el navegador
- [ ] Firewall configurado (puertos 80, 443)
- [ ] SSL configurado (si aplica)
- [ ] Logs monitoreables
- [ ] Script de actualización instalado

## 🔐 Seguridad Básica

```bash
# Configurar fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Configurar firewall
sudo ufw allow 'OpenSSH'
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Actualizaciones automáticas
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📖 Recursos Adicionales

- **Guía completa**: [DEPLOY.md](DEPLOY.md)
- **Documentación del proyecto**: [README.md](README.md)
- **Arquitectura**: [ARCHITECTURE.md](ARCHITECTURE.md)

## 💡 Notas Importantes

1. **Sin Backend**: Esta es una aplicación completamente estática (frontend-only)
2. **Sin Base de Datos**: No requiere MySQL, PostgreSQL, etc.
3. **Dependencias CDN**: Las librerías se cargan desde CDN (requiere internet)
4. **Procesamiento Local**: Los archivos se procesan en el navegador del usuario
5. **No hay Build**: La aplicación se sirve directamente sin compilación

## 🆘 ¿Necesitas Ayuda?

Si encuentras problemas:
1. Revisa [DEPLOY.md](DEPLOY.md) para instrucciones detalladas
2. Verifica los logs: `sudo tail -50 /var/log/nginx/error.log`
3. Prueba la configuración: `sudo nginx -t`
4. Abre un issue en GitHub con detalles del error

---

**¿Todo funcionando?** ¡Genial! Ahora puedes:
- Cargar un contrato YAML
- Subir un archivo Excel/CSV
- Validar datos contra las reglas definidas

🎉 **¡Disfruta usando QualidApp v60!**
