#!/bin/bash

#############################################
# Script de Despliegue para QualidApp v60
# Ubuntu 20.04+ / Debian 10+
#############################################

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables configurables
APP_NAME="qualidapp"
APP_DIR="/var/www/qualidapp-v60"
NGINX_CONFIG="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
DOMAIN=""  # Se puede configurar como parámetro

# Funciones auxiliares
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Este script debe ejecutarse como root o con sudo"
        exit 1
    fi
}

check_ubuntu() {
    if [ ! -f /etc/os-release ]; then
        print_warning "No se puede determinar la distribución del sistema"
        return
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] && [[ "$ID" != "debian" ]]; then
        print_warning "Este script está diseñado para Ubuntu/Debian"
        read -p "¿Desea continuar de todos modos? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
}

install_nginx() {
    print_header "Instalando nginx"
    
    if command -v nginx &> /dev/null; then
        print_info "nginx ya está instalado"
        nginx -v
    else
        print_info "Instalando nginx..."
        apt update
        apt install -y nginx
        print_success "nginx instalado correctamente"
    fi
}

install_git() {
    print_header "Verificando git"
    
    if command -v git &> /dev/null; then
        print_info "git ya está instalado"
        git --version
    else
        print_info "Instalando git..."
        apt install -y git
        print_success "git instalado correctamente"
    fi
}

setup_directory() {
    print_header "Configurando directorio de la aplicación"
    
    if [ -d "$APP_DIR" ]; then
        print_warning "El directorio $APP_DIR ya existe"
        read -p "¿Desea sobrescribirlo? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            print_info "Creando backup..."
            mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
        else
            print_info "Usando directorio existente"
            return
        fi
    fi
    
    print_info "El directorio se debe clonar manualmente o ya debe existir"
    print_info "Asegurándose de que existe: $APP_DIR"
    
    if [ ! -d "$APP_DIR" ]; then
        print_error "El directorio $APP_DIR no existe"
        print_info "Por favor, clone el repositorio primero:"
        print_info "  cd /var/www && git clone https://github.com/moafar/qualidapp-v60.git"
        exit 1
    fi
    
    # Configurar permisos
    print_info "Configurando permisos..."
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    print_success "Directorio configurado correctamente"
}

configure_nginx() {
    print_header "Configurando nginx"
    
    # Solicitar dominio
    echo -e "${YELLOW}Ingrese el nombre de dominio (o presione Enter para usar '_' como default):${NC}"
    read -p "Dominio: " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        DOMAIN="_"
        print_info "Usando configuración sin dominio específico"
    fi
    
    print_info "Creando configuración de nginx..."
    
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    listen [::]:80;
    
    server_name ${DOMAIN};
    
    root ${APP_DIR};
    index index.html;
    
    access_log /var/log/nginx/${APP_NAME}-access.log;
    error_log /var/log/nginx/${APP_NAME}-error.log;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Caché para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Content-Type correcto para módulos ES
    location ~* \.js$ {
        add_header Content-Type application/javascript;
    }
    
    # Seguridad
    autoindex off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF
    
    print_success "Configuración creada en $NGINX_CONFIG"
    
    # Habilitar sitio
    print_info "Habilitando sitio..."
    if [ -f "$NGINX_ENABLED" ]; then
        rm "$NGINX_ENABLED"
    fi
    ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    
    # Deshabilitar sitio por defecto
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        print_info "Deshabilitando sitio por defecto..."
        rm /etc/nginx/sites-enabled/default
    fi
    
    # Verificar configuración
    print_info "Verificando configuración de nginx..."
    if nginx -t; then
        print_success "Configuración de nginx válida"
    else
        print_error "Error en la configuración de nginx"
        exit 1
    fi
}

configure_firewall() {
    print_header "Configurando firewall"
    
    if command -v ufw &> /dev/null; then
        print_info "Configurando UFW..."
        
        # Verificar si UFW está activo
        if ufw status | grep -q "Status: active"; then
            print_info "UFW está activo, configurando reglas..."
            ufw allow 'Nginx Full'
            print_success "Reglas de firewall configuradas"
        else
            print_warning "UFW no está activo"
            read -p "¿Desea activar UFW? (s/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Ss]$ ]]; then
                ufw allow 'OpenSSH'
                ufw allow 'Nginx Full'
                ufw --force enable
                print_success "UFW activado y configurado"
            fi
        fi
    else
        print_warning "UFW no está instalado"
        read -p "¿Desea instalar UFW? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            apt install -y ufw
            ufw allow 'OpenSSH'
            ufw allow 'Nginx Full'
            ufw --force enable
            print_success "UFW instalado y configurado"
        fi
    fi
}

start_services() {
    print_header "Iniciando servicios"
    
    print_info "Recargando nginx..."
    systemctl reload nginx
    
    print_info "Habilitando nginx al inicio..."
    systemctl enable nginx
    
    print_success "Servicios configurados"
}

show_summary() {
    print_header "Resumen del Despliegue"
    
    echo -e "${GREEN}✅ Despliegue completado exitosamente${NC}"
    echo ""
    echo "📁 Directorio de la aplicación: $APP_DIR"
    echo "🌐 Dominio configurado: $DOMAIN"
    echo "📝 Configuración nginx: $NGINX_CONFIG"
    echo "📊 Logs de acceso: /var/log/nginx/${APP_NAME}-access.log"
    echo "📊 Logs de error: /var/log/nginx/${APP_NAME}-error.log"
    echo ""
    
    # Obtener IP del servidor
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo -e "${YELLOW}🚀 Accede a la aplicación:${NC}"
    if [ "$DOMAIN" != "_" ]; then
        echo "   http://${DOMAIN}"
    fi
    echo "   http://${SERVER_IP}"
    echo ""
    
    echo -e "${BLUE}📖 Próximos pasos recomendados:${NC}"
    echo "   1. Configurar SSL con Let's Encrypt:"
    echo "      sudo apt install certbot python3-certbot-nginx"
    echo "      sudo certbot --nginx -d ${DOMAIN}"
    echo ""
    echo "   2. Verificar estado de nginx:"
    echo "      sudo systemctl status nginx"
    echo ""
    echo "   3. Ver logs en tiempo real:"
    echo "      sudo tail -f /var/log/nginx/${APP_NAME}-access.log"
    echo ""
    echo -e "${GREEN}Para más información, consulta DEPLOY.md${NC}"
}

# Función principal
main() {
    print_header "🚀 Despliegue de QualidApp v60"
    
    check_root
    check_ubuntu
    install_nginx
    install_git
    setup_directory
    configure_nginx
    configure_firewall
    start_services
    show_summary
}

# Ejecutar script
main
