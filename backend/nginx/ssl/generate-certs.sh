#!/bin/bash
# Generate self-signed SSL certificates for development/testing
# For production, use Let's Encrypt or a proper CA

set -e

SSL_DIR="$(dirname "$0")"
DOMAIN="${1:-localhost}"

echo "Generating self-signed SSL certificate for: $DOMAIN"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1"

echo "SSL certificates generated:"
echo "  - $SSL_DIR/cert.pem"
echo "  - $SSL_DIR/key.pem"
echo ""
echo "⚠️  These are self-signed certificates for development only!"
echo "   For production, use Let's Encrypt or a proper Certificate Authority."
