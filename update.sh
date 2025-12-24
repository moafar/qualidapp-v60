#!/bin/bash

#############################################
# Script de Actualización para QualidApp v60
# Uso: sudo /usr/local/bin/update-qualidapp.sh
#############################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
APP_DIR="/var/www/qualidapp-v60"
BACKUP_DIR="/var/backups"
BRANCH="${1:-main}"

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar permisos
if [[ $EUID -ne 0 ]]; then
    print_error "Este script debe ejecutarse como root o con sudo"
    exit 1
fi

# Verificar que el directorio existe
if [ ! -d "$APP_DIR" ]; then
    print_error "El directorio $APP_DIR no existe"
    exit 1
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🔄 Actualizando QualidApp v60${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Crear backup
BACKUP_FILE="${BACKUP_DIR}/qualidapp-$(date +%Y%m%d-%H%M%S).tar.gz"
print_info "Creando backup en: $BACKUP_FILE"
cd "$APP_DIR"
tar -czf "$BACKUP_FILE" . --exclude='.git' 2>/dev/null || true
print_success "Backup creado correctamente"

# Verificar estado del repositorio
print_info "Verificando estado del repositorio..."
cd "$APP_DIR"

# Guardar cambios locales si existen
if ! git diff-index --quiet HEAD --; then
    print_warning "Existen cambios locales no commiteados"
    read -p "¿Desea descartarlos y continuar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_info "Actualización cancelada"
        exit 0
    fi
fi

# Actualizar código
print_info "Descargando cambios desde GitHub (rama: $BRANCH)..."
git fetch origin

print_info "Aplicando cambios..."
git reset --hard origin/$BRANCH

print_success "Código actualizado correctamente"

# Verificar si hay cambios en las dependencias CDN
print_info "Verificando index.html..."
if git diff HEAD~1 HEAD -- index.html | grep -q "unpkg.com\|cdn"; then
    print_warning "Se detectaron cambios en las dependencias CDN"
    print_info "Considera limpiar la caché del navegador"
fi

# Restaurar permisos
print_info "Restaurando permisos..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Recargar nginx para limpiar caché
print_info "Recargando nginx..."
systemctl reload nginx

# Añadir timestamp para forzar actualización de caché
touch "$APP_DIR/index.html"

print_success "Permisos restaurados"

# Mostrar información de la versión
echo ""
echo -e "${GREEN}✅ Actualización completada exitosamente${NC}"
echo ""
echo "📊 Información de la versión:"
git log -1 --pretty=format:"   Commit: %h%n   Autor: %an%n   Fecha: %ad%n   Mensaje: %s%n" --date=format:'%Y-%m-%d %H:%M:%S'
echo ""
echo "📦 Backup guardado en: $BACKUP_FILE"
echo ""
echo -e "${YELLOW}💡 Recuerda limpiar la caché del navegador (Ctrl+Shift+R)${NC}"
echo ""

# Listar backups antiguos
print_info "Backups disponibles:"
ls -lth "$BACKUP_DIR"/qualidapp-*.tar.gz 2>/dev/null | head -5 || echo "   No hay backups previos"
echo ""

# Sugerencia para limpiar backups antiguos
BACKUP_COUNT=$(ls "$BACKUP_DIR"/qualidapp-*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 5 ]; then
    print_warning "Tienes $BACKUP_COUNT backups. Considera eliminar los antiguos:"
    echo "   sudo rm $BACKUP_DIR/qualidapp-YYYYMMDD-HHMMSS.tar.gz"
fi

echo -e "${GREEN}🎉 Proceso completado${NC}"
